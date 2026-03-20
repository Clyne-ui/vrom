package http

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"vrom-backend/internal/models"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/services"
	"vrom-backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

func HandleRegister(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var newUser models.User
		if err := json.NewDecoder(r.Body).Decode(&newUser); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if newUser.Role == "admin" {
			secretKey := r.Header.Get("X-Vrom-Admin-Secret")
			if secretKey != "MY_SUPER_SECRET_KEY_123" {
				http.Error(w, "Unauthorized: Invalid Admin Secret Key", http.StatusUnauthorized)
				return
			}
		}

		_, err := repository.RegisterUser(db, newUser)
		if err != nil {
			if strings.Contains(err.Error(), "users_email_key") {
				http.Error(w, "Email already exists", http.StatusConflict)
			} else {
				http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
			}
			return
		}

		message := "Registration successful! Please complete onboarding."
		if newUser.Role == "customer" {
			message = "Registration successful! Please verify your OTP."
		} else if newUser.Role == "admin" {
			message = "Admin account created successfully!"
		}

		w.WriteHeader(http.StatusCreated)
		fmt.Fprint(w, message)
	}
}

func HandleLogin(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var credentials struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		var storedHash, fullName, userID, role string
		var isVerified bool
		err := db.QueryRow("SELECT password_hash, full_name, user_id, role, is_verified FROM users WHERE email = $1", credentials.Email).Scan(&storedHash, &fullName, &userID, &role, &isVerified)
		if err != nil {
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}

		if role == "customer" && !isVerified {
			http.Error(w, "Account not verified! Please enter your OTP at /verify-otp to activate your account.", http.StatusForbidden)
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(credentials.Password)); err != nil {
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}

		// Generate JWT Tokens
		accessToken, refreshToken, err := services.GenerateTokens(userID, credentials.Email, role)
		if err != nil {
			http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":        "Success",
			"message":       fmt.Sprintf("Welcome back, %s!", fullName),
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": map[string]string{
				"user_id":   userID,
				"full_name": fullName,
				"email":     credentials.Email,
				"role":      role,
			},
		})
	}
}

func HandleVerifyOTP(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email string `json:"email"`
			Code  string `json:"code"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		var userID string
		query := `
            SELECT user_id FROM otps 
            WHERE code = $1 AND user_id = (SELECT user_id FROM users WHERE email = $2)
            AND expires_at > CURRENT_TIMESTAMP`
		
		err := db.QueryRow(query, strings.TrimSpace(req.Code), req.Email).Scan(&userID)
		if err != nil {
			http.Error(w, "Invalid or expired OTP", http.StatusUnauthorized)
			return
		}

		db.Exec("UPDATE users SET is_verified = true WHERE user_id = $1", userID)
		db.Exec("DELETE FROM otps WHERE user_id = $1", userID)

		fmt.Fprint(w, "OTP Verified! Redirecting to Home Page...")
	}
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		// Blacklist the token in Redis until it naturally expires
		err := services.RevokeToken(tokenString)
		if err != nil {
			log.Printf("⚠️ Logout Revocation Error: %v", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "Success",
		"message": "Logged out successfully! Token has been invalidated.",
	})
}

func HandleRequestPasswordReset(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		token := utils.GenerateOTP() // Reuse OTP logic for a simple 6-digit reset token or use a GUID
		err := repository.CreateResetToken(db, req.Email, token)
		if err != nil {
			http.Error(w, "Error generating reset token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// In a real app, you would EMAIL this token. For local testing, we print to terminal.
		fmt.Printf("🛡️ PASSWORD RESET TOKEN for %s: %s\n", req.Email, token)
		
		// Asynchronously send the real email!
		go utils.SendEmail(req.Email, "Password Reset Code", fmt.Sprintf("Your Vrom Password Reset Code is: %s", token))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "Success",
			"message": "If an account exists, a reset token has been generated.",
		})
	}
}

func HandleResetPassword(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Token       string `json:"token"`
			NewPassword string `json:"new_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		err := repository.ResetPasswordWithToken(db, req.Token, req.NewPassword)
		if err != nil {
			http.Error(w, "Reset failed: "+err.Error(), http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "Success",
			"message": "Password updated successfully! Please login with your new password.",
		})
	}
}
