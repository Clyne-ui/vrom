package middleware

import (
	"database/sql"
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
			http.Error(w, "Invalid or expired session. Please login again.", http.StatusUnauthorized)
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
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := services.ValidateToken(tokenString)
		if err != nil || claims.Role != "admin" {
			http.Error(w, "Access Denied: You do not have administrator privileges", http.StatusForbidden)
			return
		}

		r.Header.Set("X-User-Email", claims.Email)
		r.Header.Set("X-User-ID", claims.UserID)
		
		next(w, r)
	}
}
