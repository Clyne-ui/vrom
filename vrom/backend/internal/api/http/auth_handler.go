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

		// Set Cookies
		http.SetCookie(w, &http.Cookie{
			Name:     "vrom_session_token",
			Value:    accessToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   900, // 15 minutes
		})

		http.SetCookie(w, &http.Cookie{
			Name:     "vrom_refresh_token",
			Value:    refreshToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800, // 7 days
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":        "Success",
			"message":       fmt.Sprintf("Welcome back, %s!", fullName),
			"access_token":  accessToken, // Kept for WebSocket usage
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

		var userID, role string
		query := `
            SELECT u.user_id, u.role FROM otps o
            JOIN users u ON o.user_id = u.user_id
            WHERE o.code = $1 AND u.email = $2
              AND o.expires_at > CURRENT_TIMESTAMP`
		
		err := db.QueryRow(query, strings.TrimSpace(req.Code), req.Email).Scan(&userID, &role)
		if err != nil {
			http.Error(w, "Invalid or expired OTP", http.StatusUnauthorized)
			return
		}

		db.Exec("UPDATE users SET is_verified = true WHERE user_id = $1", userID)
		db.Exec("DELETE FROM otps WHERE user_id = $1", userID)

		// Generate JWT Tokens for Auto-Login
		accessToken, refreshToken, err := services.GenerateTokens(userID, req.Email, role)
		if err != nil {
			http.Error(w, "Failed to generate tokens", http.StatusInternalServerError)
			return
		}

		// Set Cookies
		http.SetCookie(w, &http.Cookie{
			Name:     "vrom_session_token",
			Value:    accessToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   900, // 15 minutes
		})

		http.SetCookie(w, &http.Cookie{
			Name:     "vrom_refresh_token",
			Value:    refreshToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800, // 7 days
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":        "Success",
			"message":       "OTP Verified! Auto-logging you in...",
			"access_token":  accessToken,
			"refresh_token": refreshToken,
			"user": map[string]string{
				"user_id": userID,
				"email":   req.Email,
				"role":    role,
			},
		})
	}
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	// 1. Invalidate Token in Redis if available
	authHeader := r.Header.Get("Authorization")
	var tokenString string
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	} else {
		if cookie, err := r.Cookie("vrom_session_token"); err == nil {
			tokenString = cookie.Value
		}
	}

	if tokenString != "" {
		err := services.RevokeToken(tokenString)
		if err != nil {
			log.Printf("⚠️ Logout Revocation Error: %v", err)
		}
	}

	// 2. Clear Cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "vrom_session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "vrom_refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		MaxAge:   -1,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "Success",
		"message": "Logged out successfully! Tokens have been invalidated.",
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

// HandleRefreshToken exchanges a valid refresh token for a new access token.
// The frontend calls this silently every ~12 minutes to stay logged in.
func HandleRefreshToken(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var refreshToken string
		
		// Attempt to read from cookie first
		cookie, err := r.Cookie("vrom_refresh_token")
		if err == nil && cookie.Value != "" {
			refreshToken = cookie.Value
		} else {
			// Fallback to body (for backward compatibility or testing)
			var req struct {
				RefreshToken string `json:"refresh_token"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
				refreshToken = req.RefreshToken
			}
		}

		if refreshToken == "" {
			http.Error(w, "Invalid input: refresh_token required", http.StatusBadRequest)
			return
		}

		// Parse the refresh token (it only has RegisteredClaims, no custom role/email)
		claims, err := services.ValidateRefreshToken(refreshToken)
		if err != nil {
			log.Printf("HandleRefreshToken: invalid refresh token: %v", err)
			http.Error(w, "Refresh token expired or invalid. Please login again.", http.StatusUnauthorized)
			return
		}

		userID := claims.Subject

		// Re-fetch live user data to get current role/email (they might have changed)
		var email, role string
		err = db.QueryRow(
			`SELECT email, role FROM users WHERE user_id = $1`, userID,
		).Scan(&email, &role)
		if err != nil {
			http.Error(w, "User not found", http.StatusUnauthorized)
			return
		}

		// Issue a brand-new access token
		newAccess, _, err := services.GenerateTokens(userID, email, role)
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		// Set the new access token as an HttpOnly cookie
		http.SetCookie(w, &http.Cookie{
			Name:     "vrom_session_token",
			Value:    newAccess,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   900, // 15 minutes
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"access_token": newAccess,
		})
	}
}
