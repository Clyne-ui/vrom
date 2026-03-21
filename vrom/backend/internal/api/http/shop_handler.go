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
	"vrom-backend/internal/api/websocket"
	"vrom-backend/internal/models"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/services"
	"vrom-backend/internal/utils"
	"vrom-backend/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func HandleCreateShop(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var s models.Shop
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, "Invalid shop data", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		db.QueryRow("SELECT user_id FROM users WHERE email = $1 AND role = 'seller'", email).Scan(&s.SellerID)

		shopID, err := repository.CreateShop(db, s)
		if err != nil {
			http.Error(w, "Failed to create shop branch", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "Success",
			"shop_id": shopID,
			"message": fmt.Sprintf("Shop branch '%s' is now open!", s.ShopName),
		})
	}
}

func HandleOnboardSeller(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var data models.SellerOnboarding
		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&data.UserID)

		if err := repository.OnboardSeller(db, data); err != nil {
			http.Error(w, "Seller onboarding failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "Success",
			"message": "Seller details submitted for verification!",
		})
	}
}

func HandleGetCategories(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categories, err := repository.GetCategories(db)
		if err != nil {
			http.Error(w, "Failed to load categories", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(categories)
	}
}

func HandleUploadProduct(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var p models.Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid product data", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		db.QueryRow("SELECT user_id FROM users WHERE email = $1 AND role = 'seller'", email).Scan(&p.SellerID)

		// --- 🧠 AI Content Moderation & SEO Tagging ---
		var autoTags []string
		conn, err := grpc.NewClient("127.0.0.1:50052", grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err == nil {
			client := pb.NewAIServiceClient(conn)
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second) // Fast AI timeout
			defer cancel()

			// 1. Moderate Content before saving
			modRes, err := client.ModerateContent(ctx, &pb.ContentRequest{
				Id:   p.ProductID,
				Text: p.Title, // We check the title for prohibited keywords
			})

			// If AI responds and rejects the product, block it immediately
			if err == nil && !modRes.IsApproved {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"status":  "Product Blocked ✋",
					"reason":  modRes.Reason,
					"message": "Your product violates the Vrom marketplace guidelines and cannot be listed.",
				})
				conn.Close()
				return
			}

			// 2. Generate SEO Tags automatically
			tagRes, err := client.TagProduct(ctx, &pb.ProductRequest{
				Id:    p.ProductID,
				Title: p.Title,
			})
			if err == nil && tagRes != nil {
				autoTags = tagRes.Tags
			}

			conn.Close()
		}
		// --- End AI Logic ---

		productID, err := repository.CreateProduct(db, p)
		if err != nil {
			http.Error(w, "Failed to upload product", http.StatusInternalServerError)
			return
		}

		response := map[string]interface{}{
			"status":     "Success",
			"product_id": productID,
			"message":    "Product uploaded successfully!",
		}

		if len(autoTags) > 0 {
			response["ai_seo_tags"] = autoTags
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

func HandleCreateOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.OrderInput
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid order data", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		otp := utils.GenerateOTP()

		orderID, total, shipping, err := repository.CreateOrder(db, email, req, otp)
		if err != nil {
			// Phase 15: Handle payment required via STK Push
			if strings.Contains(err.Error(), "PAYMENT_REQUIRED") {
				var phone string
				db.QueryRow("SELECT phone_number FROM users WHERE email = $1", email).Scan(&phone)

				payRef := fmt.Sprintf("ORDER_%s", orderID)
				resp, _ := services.InitiateSTKPush(phone, email, total, payRef)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusPaymentRequired) // Added status header
				json.NewEncoder(w).Encode(map[string]interface{}{
					"status":       "Payment Prompt Sent 📲",
					"order_id":     orderID, // Changed from trip_id
					"delivery_otp": otp,     // New field for verification
					"total_kes":    total,   // Changed from fare_kes
					"message":      "Your wallet balance is low. We've sent an M-Pesa prompt to your phone. If you don't see it, use the checkout link to simulate success.",
					"reference":    payRef,
					"checkout_url": resp.Data.AuthorizationURL,
				})
				return
			}
			http.Error(w, "Order failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Fetch the SellerID from the DB using the ProductID to notify them
		var sellerID string
		_ = db.QueryRow("SELECT seller_id FROM products WHERE product_id = $1", req.ProductID).Scan(&sellerID)

		// Notify the Seller via WebSocket
		if websocket.GlobalHub != nil && sellerID != "" {
			go func() {
				notification := map[string]interface{}{
					"type":     "new_order",
					"order_id": orderID,
					"message":  "You have a new order!",
					"amount":   total,
				}
				// Use context.Background() since this is non-blocking async
				websocket.GlobalHub.SendToUser(context.Background(), sellerID, notification)
			}()
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":       "Success",
			"order_id":     orderID,
			"total_kes":    total,
			"shipping_kes": shipping,
			"delivery_otp": otp,
			"message":      "Order placed! A rider will be notified.",
		})
	}
}

func HandleSellerRejectOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		var sellerID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&sellerID)

		_, refund, quantity, _, err := repository.SellerRejectOrder(db, req.OrderID, sellerID)
		if err != nil {
			http.Error(w, "Rejection failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":             "Success",
			"message":            "Order rejected. Customer refunded.",
			"refunded_kes":       refund,
			"restocked_quantity": quantity,
		})
	}
}

func HandleSellerApproveOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		var sellerID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&sellerID)

		// Get seller's shop location to find nearest rider
		var shopLat, shopLng float64
		err := db.QueryRow(`
			SELECT ST_Y(shop_location::geometry), ST_X(shop_location::geometry)
			FROM shops WHERE seller_id = $1 LIMIT 1`, sellerID).Scan(&shopLat, &shopLng)
		if err != nil {
			http.Error(w, "Could not find your shop location. Please create a shop first.", http.StatusBadRequest)
			return
		}

		riderID, riderName, err := repository.SellerApproveOrder(db, req.OrderID, sellerID, shopLat, shopLng)
		if err != nil {
			// Special case: no rider available — don't fail the order, just inform the seller
			if strings.HasPrefix(err.Error(), "no_rider_available:") {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"status":   "No Rider Available",
					"message":  "No riders are currently online near your shop. Your order is still active — please wait and try approving again shortly.",
					"order_id": req.OrderID,
				})
				return
			}
			http.Error(w, "Approval failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Send Push Notification & WebSocket to assigned rider for the delivery
		go func() {
			if websocket.GlobalHub != nil {
				websocket.GlobalHub.SendToUser(context.Background(), riderID, map[string]interface{}{
					"type":     "NEW_DELIVERY",
					"order_id": req.OrderID,
					"message":  fmt.Sprintf("Pick up delivery from %s for KES 150.00", email),
				})
			}

			token, err := repository.GetFCMToken(db, riderID)
			if err == nil && token != "" {
				services.SendPushNotification(context.Background(), token,
					"New Delivery Order! 📦",
					fmt.Sprintf("Pick up from %s for KES 150.00", email),
					map[string]string{
						"order_id": req.OrderID,
						"type":     "NEW_ORDER",
					},
				)
			}
		}()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "Order Approved ✅",
			"message":    fmt.Sprintf("Rider %s has been assigned and is on their way to pick up the order.", riderName),
			"rider_id":   riderID,
			"rider_name": riderName,
		})
	}
}

func HandleCompleteOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
			OTP     string `json:"otp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		var riderID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&riderID)

		riderShare, sellerShare, err := repository.CompleteOrder(db, req.OrderID, riderID, req.OTP)
		if err != nil {
			http.Error(w, "Completion failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":            "Success",
			"message":           "Delivery completed!",
			"earned_kes":        riderShare,
			"seller_payout_kes": sellerShare,
		})
	}
}

func HandleOrderStock(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ProductID   string  `json:"product_id"`
			Quantity    int     `json:"quantity"`
			CostPerUnit float64 `json:"cost_per_unit"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		var sellerID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&sellerID)

		if err := repository.OrderStock(db, sellerID, req.ProductID, req.Quantity, req.CostPerUnit); err != nil {
			http.Error(w, "Stock order failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Success", "message": "Stock updated successfully!"})
	}
}

func HandleGetNearbyProducts(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lat, _ := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
		lng, _ := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
		radius, _ := strconv.ParseFloat(r.URL.Query().Get("radius"), 64)
		cat := r.URL.Query().Get("category_id")

		if radius == 0 {
			radius = 10000 // 10km default
		}

		products, err := repository.GetNearbyProducts(db, models.DiscoveryInput{
			Lat:        lat,
			Lng:        lng,
			Radius:     radius,
			CategoryID: cat,
		})

		if err != nil {
			http.Error(w, "Failed to find nearby products", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(products)
	}
}

func HandleEditProduct(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		productID := r.URL.Query().Get("product_id")
		var p models.Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		var sellerID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1 AND role = 'seller'", email).Scan(&sellerID)

		// --- 🧠 AI Content Moderation for Edits ---
		if p.Title != "" {
			conn, err := grpc.NewClient("127.0.0.1:50052", grpc.WithTransportCredentials(insecure.NewCredentials()))
			if err == nil {
				client := pb.NewAIServiceClient(conn)
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()

				modRes, err := client.ModerateContent(ctx, &pb.ContentRequest{
					Id:   productID,
					Text: p.Title,
				})

				if err == nil && !modRes.IsApproved {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusForbidden)
					json.NewEncoder(w).Encode(map[string]interface{}{
						"status":  "Edit Blocked ✋",
						"reason":  modRes.Reason,
						"message": "The updated title violates guidelines. Changes not saved.",
					})
					conn.Close()
					return
				}
				conn.Close()
			}
		}

		if err := repository.UpdateProduct(db, productID, sellerID, p); err != nil {
			http.Error(w, "Update failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Success", "message": "Product updated"})
	}
}

func HandleDeleteProduct(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		productID := r.URL.Query().Get("product_id")
		email := r.Header.Get("X-User-Email")
		var sellerID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&sellerID)

		if err := repository.DeleteProduct(db, productID, sellerID); err != nil {
			http.Error(w, "Delete failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Success", "message": "Product deleted (deactivated)"})
	}
}
