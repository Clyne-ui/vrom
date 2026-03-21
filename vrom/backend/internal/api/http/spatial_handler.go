package http

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"vrom-backend/internal/models"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/services"
	"vrom-backend/pb"

	"github.com/golang/geo/s2"
	"github.com/redis/go-redis/v9"
	"github.com/sony/gobreaker"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	matchingEngineCB *gobreaker.CircuitBreaker
	redisClient      *redis.Client
)

func InitSpatialService(rdb *redis.Client) {
	redisClient = rdb
}

func init() {
	settings := gobreaker.Settings{
		Name:        "MatchingEngine",
		MaxRequests: 3,
		Interval:    5 * time.Second,
		Timeout:     10 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			fmt.Printf("⚡ CIRCUIT BREAKER: [%s] changed from %s to %s\n", name, from, to)
		},
	}
	matchingEngineCB = gobreaker.NewCircuitBreaker(settings)
}

func HandleGetNearby(rustAddr string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		lng, _ := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
		radius, _ := strconv.ParseUint(r.URL.Query().Get("radius"), 10, 32)

		if lat == 0 || lng == 0 {
			http.Error(w, "Valid lat/lng coordinates are required", http.StatusBadRequest)
			return
		}

		result, err := matchingEngineCB.Execute(func() (interface{}, error) {
			ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
			defer cancel()

			conn, err := grpc.DialContext(ctx, rustAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
			if err != nil {
				return nil, err
			}
			defer conn.Close()

			client := pb.NewMatchingEngineClient(conn)
			return client.GetNearby(ctx, &pb.NearbyRequest{
				Lat:      lat,
				Lng:      lng,
				RadiusKm: uint32(radius),
			})
		})

		if err != nil {
			fmt.Printf("⚠️  Matching Engine Error: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusAccepted)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":   "Degraded",
				"message":  "Spatial engine is currently recovering.",
				"entities": []interface{}{},
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

func HandleRequestRide(db *sql.DB, rustAddr string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input models.RideRequestInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		customerEmail := r.Header.Get("X-User-Email")

		// 1. Call Rust Matching Engine via Circuit Breaker
		resp, err := matchingEngineCB.Execute(func() (interface{}, error) {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			conn, err := grpc.DialContext(ctx, rustAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
			if err != nil {
				return nil, err
			}
			defer conn.Close()

			client := pb.NewMatchingEngineClient(conn)
			return client.SolveTSP(ctx, &pb.RouteRequest{
				RiderId: "Auto_Matcher",
				Points: []*pb.Location{
					{Lat: input.PickupLat, Lng: input.PickupLng, Id: "Pickup"},
					{Lat: input.DropoffLat, Lng: input.DropoffLng, Id: "Dropoff"},
				},
			})
		})

		if err != nil {
			http.Error(w, "Matching Engine Unavailable: "+err.Error(), http.StatusServiceUnavailable)
			return
		}

		route := resp.(*pb.RouteResponse)

		// 2. Find nearest rider in DB
		var riderID string
		var baseFare, pricePerKm float64
		err = db.QueryRow(`
			SELECT rider_id, base_fare, price_per_km 
			FROM rider_profiles 
			WHERE is_available = true 
			  AND ST_DWithin(current_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), 10000)
			ORDER BY current_location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
			LIMIT 1`, input.PickupLng, input.PickupLat).Scan(&riderID, &baseFare, &pricePerKm)

		if err == sql.ErrNoRows {
			json.NewEncoder(w).Encode(map[string]string{"status": "No Rider Found"})
			return
		}

		estimatedPrice := baseFare + (route.TotalDistance * pricePerKm)

		// --- 🔥 DYNAMIC SURGE PRICING (S2) ---
		// 1. Convert Pickup Lat/Lng to S2 Cell ID (Level 13 matching Flink)
		latLng := s2.LatLngFromDegrees(input.PickupLat, input.PickupLng)
		cellID := s2.CellIDFromLatLng(latLng).Parent(13)
		s2Token := cellID.ToToken()

		// 2. Lookup Surge Multiplier in Redis
		if redisClient != nil {
			surgeKey := "surge:s2:" + s2Token
			surgeStr, err := redisClient.Get(context.Background(), surgeKey).Result()
			if err == nil {
				multiplier, _ := strconv.ParseFloat(surgeStr, 64)
				if multiplier > 1.0 {
					fmt.Printf("🚀 APPLYING SURGE: %.2fx for S2 Cell %s\n", multiplier, s2Token)
					estimatedPrice *= multiplier
				}
			}
		}

		// Call repository — it enforces wallet balance check and locks escrow
		tripID, err := repository.RequestRide(db, customerEmail, input, estimatedPrice, riderID)
		if err != nil {
			// Phase 15: Handle payment required via STK Push
			if strings.Contains(err.Error(), "PAYMENT_REQUIRED") {
				// Fetch user phone for STK Push
				var phone string
				db.QueryRow("SELECT phone_number FROM users WHERE email = $1", customerEmail).Scan(&phone)

				// Trigger STK Push (Async prompt on phone)
				// We use a specific reference format: "TRIP_<id>"
				payRef := fmt.Sprintf("TRIP_%s", tripID)
				resp, _ := services.InitiateSTKPush(phone, customerEmail, estimatedPrice, payRef)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"status":       "Payment Prompt Sent 📲",
					"trip_id":      tripID,
					"fare_kes":     estimatedPrice,
					"message":      "Your wallet balance is low. We've sent an M-Pesa prompt to your phone. If you don't see it, use the checkout link to simulate success.",
					"reference":    payRef,
					"checkout_url": resp.Data.AuthorizationURL,
				})
				return
			}
			http.Error(w, "Failed to secure ride: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// 3. Send Push Notification to Rider found
		go func() {
			token, err := repository.GetFCMToken(db, riderID)
			if err == nil && token != "" {
				services.SendPushNotification(context.Background(), token,
					"New Ride Request! 🏍️",
					fmt.Sprintf("Trip to %s for KES %.2f", input.DropoffAddress, estimatedPrice),
					map[string]string{
						"trip_id": tripID,
						"type":    "NEW_RIDE",
					},
				)
			}
		}()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":      "Success",
			"trip_id":     tripID,
			"fare_kes":    estimatedPrice,
			"message":     "Ride request successful! An STK push has been sent to your phone.",
		})
	}
}

func HandleGetActiveTrip(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.URL.Query().Get("email")
		id, status, amount, lat, lng, err := repository.GetActiveTrip(db, email)
		if err != nil {
			http.Error(w, "No active trip found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"trip_id":  id,
			"status":   status,
			"amount":   amount,
			"dest_lat": lat,
			"dest_lng": lng,
		})
	}
}

func HandleCancelRide(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tripID := r.URL.Query().Get("trip_id")
		email := r.Header.Get("X-User-Email")

		amount, id, err := repository.CancelRide(db, tripID, email)
		if err != nil {
			http.Error(w, "Cancellation failed: "+err.Error(), http.StatusForbidden)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "Success",
			"message": fmt.Sprintf("Ride %s cancelled. KES %.2f has been returned to your wallet.", id, amount),
		})
	}
}
