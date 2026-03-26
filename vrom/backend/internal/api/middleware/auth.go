package middleware

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"vrom-backend/internal/services"
)

// RequireRole checks if the user has a valid JWT and one of the allowed roles
func RequireRole(db *sql.DB, allowedRoles []string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Authentication required (Missing or invalid Authorization header)", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := services.ValidateToken(tokenString)
		if err != nil {
			// If system is under maintenance, even invalid tokens get the 503 instead of 401
			// This prevents revealing system status vs auth status to unauthed users.
			if services.IsMaintenanceMode() {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				json.NewEncoder(w).Encode(map[string]string{
					"status":  "Under Maintenance 🚧",
					"message": "Vrom is currently undergoing scheduled maintenance to improve our service. We'll be back online shortly!",
				})
				return
			}
			http.Error(w, "Invalid or expired session. Please login again.", http.StatusUnauthorized)
			return
		}

		// 🧬 GLOBAL KILL SWITCH (Maintenance Mode)
		// Admins can bypass this to use the OCC Dashboard during maintenance.
		if services.IsMaintenanceMode() && claims.Role != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "Under Maintenance 🚧",
				"message": "Vrom is currently undergoing scheduled maintenance to improve our service. We'll be back online shortly!",
			})
			return
		}

		// Stateless RBAC check
		isAllowed := false
		for _, role := range allowedRoles {
			if role == claims.Role {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			http.Error(w, "Access Denied: Your role does not allow this action", http.StatusForbidden)
			return
		}

		// Check if user has been emergency-suspended by OCC
		if services.IsUserSuspended(claims.UserID) {
			http.Error(w, "Your account has been suspended. Please contact support.", http.StatusForbidden)
			return
		}

		// Inject identity into headers for downstream handlers (if needed)
		r.Header.Set("X-User-Email", claims.Email)
		r.Header.Set("X-User-ID", claims.UserID)
		r.Header.Set("X-User-Role", claims.Role)

		next(w, r)
	}
}

// AdminOnly is a specialized middleware for admin paths using JWT
func AdminOnly(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		tokenString := ""
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			log.Printf("AdminOnly: Found Bearer token in header")
		} else {
			tokenString = r.URL.Query().Get("token")
			log.Printf("AdminOnly: No header, checking query token (len=%d)", len(tokenString))
		}

		if (tokenString == "" || tokenString == "undefined") {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}
		claims, err := services.ValidateToken(tokenString)
		if err != nil {
			log.Printf("AdminOnly: Token validation failed: %v", err)
			http.Error(w, "Authentication expired: Invalid session", http.StatusUnauthorized)
			return
		}

		if claims.Role != "admin" && claims.Role != "super_admin" {
			log.Printf("AdminOnly: Role mismatch. User=%s Role=%s", claims.Email, claims.Role)
			http.Error(w, "Access Denied: You do not have administrator privileges", http.StatusForbidden)
			return
		}

		r.Header.Set("X-User-Email", claims.Email)
		r.Header.Set("X-User-ID", claims.UserID)
		
		next(w, r)
	}
}
