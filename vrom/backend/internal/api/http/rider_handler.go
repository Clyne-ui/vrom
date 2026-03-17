package http

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"vrom-backend/internal/models"
	"vrom-backend/internal/repository"
)

func HandleOnboardRider(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var data models.RiderOnboarding
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if err := repository.OnboardRider(db, data); err != nil {
			http.Error(w, "Onboarding failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Fprint(w, "Rider onboarding documents submitted successfully!")
	}
}

func HandleApproveRider(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if err := repository.ApproveRider(db, req.UserID); err != nil {
			http.Error(w, "Approval failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Fprintf(w, "Rider %s has been approved successfully!", req.UserID)
	}
}

func HandleToggleStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email  string  `json:"email"`
			Status string  `json:"status"` // "online" or "offline"
			Lat    float64 `json:"lat"`
			Lng    float64 `json:"lng"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		isAvailable := strings.ToLower(req.Status) == "online"

		// Update is_available and current_location (PostGIS)
		query := `UPDATE rider_profiles 
		          SET is_available = $1, current_location = ST_SetSRID(ST_MakePoint($2, $3), 4326) 
		          WHERE rider_id = (SELECT user_id FROM users WHERE email = $4)`
		
		result, err := db.Exec(query, isAvailable, req.Lng, req.Lat, req.Email)
		if err != nil {
			http.Error(w, "Status update failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		rows, _ := result.RowsAffected()
		if rows == 0 {
			http.Error(w, "Rider not found. Check the email or onboarding status.", http.StatusNotFound)
			return
		}

		fmt.Fprintf(w, "Success: You are now %s", req.Status)
	}
}

func HandleRiderDecision(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			TripID string `json:"trip_id"`
			Action string `json:"action"` // "accept" or "reject"
			Email  string `json:"email"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		if req.Action == "reject" {
			_, err := db.Exec("UPDATE trips SET rider_id = NULL WHERE trip_id = $1", req.TripID)
			if err != nil {
				http.Error(w, "Failed to process rejection", http.StatusInternalServerError)
				return
			}
			fmt.Fprint(w, "Ride rejected. Finding another rider for the customer...")
		} else if req.Action == "accept" {
			ctx := r.Context()
			tx, err := db.BeginTx(ctx, nil)
			if err != nil {
				http.Error(w, "Server error", http.StatusInternalServerError)
				return
			}
			defer tx.Rollback()

			var status string
			err = tx.QueryRowContext(ctx, "SELECT status FROM trips WHERE trip_id = $1 FOR UPDATE", req.TripID).Scan(&status)
			if status != "pending" {
				http.Error(w, "Trip no longer available", http.StatusGone)
				return
			}

			// Mark Rider as Busy
			_, err = tx.ExecContext(ctx, "UPDATE rider_profiles SET is_available = false WHERE rider_id = (SELECT user_id FROM users WHERE email = $1)", req.Email)
			// Mark Trip as Accepted
			_, err = tx.ExecContext(ctx, "UPDATE trips SET status = 'paid_escrow' WHERE trip_id = $1", req.TripID)

			if err != nil {
				http.Error(w, "Failed to accept ride", http.StatusInternalServerError)
				return
			}

			tx.Commit()
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "accepted", "message": "Ride accepted! Navigate to pickup."})
		}
	}
}

func HandleStartTrip(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			TripID string `json:"trip_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		if err := repository.UpdateTripStatus(db, req.TripID, "paid_escrow", "picked_up"); err != nil {
			http.Error(w, "Cannot start trip: "+err.Error(), http.StatusConflict)
			return
		}
		json.NewEncoder(w).Encode(map[string]string{"status": "in_progress", "message": "Trip started! Drive safely."})
	}
}

func HandleCompleteTrip(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			TripID string  `json:"trip_id"`
			CurLat float64 `json:"current_lat"`
			CurLng float64 `json:"current_lng"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		riderShare, commission, _, err := repository.CompleteTrip(db, req.TripID, req.CurLat, req.CurLng)
		if err != nil {
			http.Error(w, "Completion failed: "+err.Error(), http.StatusForbidden)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"earned_kes": riderShare,
			"commission_kes": commission,
			"message": "Trip verified! Your earnings have been credited.",
		})
	}
}
func HandleGetPendingRiders(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		riders, err := repository.GetPendingRiders(db)
		if err != nil {
			http.Error(w, "Failed to load pending riders", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(riders)
	}
}

func HandleRejectRider(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
			Reason string `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if err := repository.RejectRider(db, req.UserID, req.Reason); err != nil {
			http.Error(w, "Rejection failed", http.StatusInternalServerError)
			return
		}

		fmt.Fprintf(w, "Rider %s has been rejected.", req.UserID)
	}
}
