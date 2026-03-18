package http

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"vrom-backend/internal/events"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/services"
	//"vrom-backend/internal/utils"
)

func HandleProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.URL.Query().Get("email")
		if email == "" {
			http.Error(w, "Email is required", http.StatusBadRequest)
			return
		}

		profile, err := repository.GetUserProfile(db, email)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)

		history, err := repository.GetUserHistory(db, userID)
		if err == nil {
			profile.History = history
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(profile)
	}
}

func HandleGetBalance(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		var balance float64
		err := db.QueryRow("SELECT balance FROM wallets WHERE user_id = (SELECT user_id FROM users WHERE email = $1)", email).Scan(&balance)
		if err != nil {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "Success",
			"balance": balance,
		})
	}
}

func HandleDeposit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Amount float64 `json:"amount"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid data", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		// Phase 11: Call Paystack to initialize a secure transaction
		payRes, err := services.InitializePayment(email, req.Amount)
		if err != nil || !payRes.Status {
			http.Error(w, "Payment initialization failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":            "Success",
			"checkout_url":      payRes.Data.AuthorizationURL,
			"payment_reference": payRes.Data.Reference,
			"message":           "Please complete the payment at the URL provided.",
		})
	}
}

// HandleVerifyPayment is called after the user completes the Paystack checkout.
func HandleVerifyPayment(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reference := r.URL.Query().Get("reference")
		if reference == "" {
			http.Error(w, "Reference is required", http.StatusBadRequest)
			return
		}

		// 1. Verify with Paystack Server-to-Server
		verifyRes, err := services.VerifyPayment(reference)
		if err != nil || verifyRes.Data.Status != "success" {
			http.Error(w, "Payment verification failed or pending", http.StatusPaymentRequired)
			return
		}

		email := r.Header.Get("X-User-Email")
		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)

		amount := float64(verifyRes.Data.Amount) / 100.0

		// 2. ONLY NOW update the database
		if err := repository.RecordTransaction(db, userID, "deposit", "Paystack Wallet Deposit", amount); err != nil {
			http.Error(w, "Deposit update failed", http.StatusInternalServerError)
			return
		}

		// Trigger real-time tracking (Kafka)
		go events.PublishTransactionEvent(userID, amount, "online_payment")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "Success",
			"message": fmt.Sprintf("KES %.2f deposited successfully!", amount),
		})
	}
}

func HandleUploadImage(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Limit upload size to 10MB
		r.ParseMultipartForm(10 << 20)

		file, handler, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "Error retrieving file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Secure Upload to Cloudinary
		secureURL, err := services.UploadToCloudinary(file, handler.Filename)
		if err != nil {
			http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":    "Success",
			"image_url": secureURL,
		})
	}
}
func HandleWithdrawToMpesa(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Amount float64 `json:"amount"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		newBalance, phone, userID, err := repository.WithdrawToMpesa(db, email, req.Amount)
		if err != nil {
			http.Error(w, "Withdrawal failed: "+err.Error(), http.StatusForbidden)
			return
		}

		// Phase 15: Trigger actual M-Pesa B2C Transfer
		services.InitiateB2CTransfer(phone, req.Amount)

		// Trigger Kafka event for fraud detection (negative amount for withdrawal)
		go events.PublishTransactionEvent(userID, -req.Amount, "mpesa_withdrawal")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":      "Success",
			"message":     fmt.Sprintf("KES %.2f has been sent to %s via M-Pesa", req.Amount, phone),
			"new_balance": newBalance,
		})
	}
}

func HandleDeleteHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		if err := repository.DeleteHistory(db, email); err != nil {
			http.Error(w, "Failed to clear history", http.StatusInternalServerError)
			return
		}
		fmt.Fprint(w, "User activity history cleared.")
	}
}

func HandleDeleteAccount(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		if err := repository.DeleteAccount(db, email); err != nil {
			http.Error(w, "Failed to delete account", http.StatusInternalServerError)
			return
		}
		fmt.Fprint(w, "Account deleted successfully.")
	}
}

// HandleUpdateFCMToken allows mobile apps to register their Firebase Push Notification token.
func HandleUpdateFCMToken(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			FCMToken string `json:"fcm_token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid data", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		// Find User ID from Email
		var userID string
		err := db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Save the FCM Token in the DB
		if err := repository.UpdateFCMToken(db, userID, req.FCMToken); err != nil {
			http.Error(w, "Failed to update FCM token", http.StatusInternalServerError)
			return
		}

	}
}

func HandlePaystackWebhook(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Read the raw body for signature verification
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Could not read body", http.StatusBadRequest)
			return
		}

		// 2. Verify signature
		signature := r.Header.Get("X-Paystack-Signature")
		if !services.VerifyWebhookSignature(signature, body) {
			http.Error(w, "Invalid signature", http.StatusUnauthorized)
			return
		}

		// 3. Parse JSON
		var event struct {
			Event string `json:"event"`
			Data  struct {
				Reference string `json:"reference"`
				Amount    int    `json:"amount"`
				Status    string `json:"status"`
				Customer  struct {
					Email string `json:"email"`
				} `json:"customer"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &event); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// 4. Process Success
		if event.Event == "charge.success" && event.Data.Status == "success" {
			ref := event.Data.Reference
			amount := float64(event.Data.Amount) / 100.0

			// Handle Trip/Order Authorizations based on Reference Prefix
			if strings.HasPrefix(ref, "TRIP_") {
				tripID := strings.TrimPrefix(ref, "TRIP_")
				if err := repository.AuthorizeTripPayment(db, tripID); err == nil {
					fmt.Printf("✅ Webhook: Trip %s authorized and secured.\n", tripID)
					return
				}
			} else if strings.HasPrefix(ref, "ORDER_") {
				orderID := strings.TrimPrefix(ref, "ORDER_")
				if err := repository.AuthorizeOrderPayment(db, orderID); err == nil {
					fmt.Printf("✅ Webhook: Order %s authorized and secured.\n", orderID)
					return
				}
			}

			// Default: General Wallet Deposit
			var userID string
			err := db.QueryRow("SELECT user_id FROM users WHERE email = $1", event.Data.Customer.Email).Scan(&userID)
			if err == nil {
				repository.RecordTransaction(db, userID, "deposit", "Paystack Confirm", amount)
				go events.PublishTransactionEvent(userID, amount, "online_payment")
				fmt.Printf("✅ Webhook: Wallet updated for %s (Ref: %s)\n", event.Data.Customer.Email, ref)
			}
		}

		// Always return 200 to acknowledge receipt
		w.WriteHeader(http.StatusOK)
	}
}

func HandleUpdateProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			FullName    string `json:"full_name"`
			PhoneNumber string `json:"phone_number"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		if err := repository.UpdateUser(db, email, req.FullName, req.PhoneNumber); err != nil {
			http.Error(w, "Failed to update profile", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Success", "message": "Profile updated successfully"})
	}
}

func HandleGetStatement(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)

		statement, err := repository.GetDetailedStatement(db, userID)
		if err != nil {
			http.Error(w, "Could not fetch statement", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(statement)
	}
}
