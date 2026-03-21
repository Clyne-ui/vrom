package http

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"vrom-backend/internal/repository"
)

func HandleGetTripHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)

		trips, err := repository.GetTripHistory(db, userID)
		if err != nil {
			http.Error(w, "Could not fetch trip history", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(trips)
	}
}

func HandleGetOrderHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)

		orders, err := repository.GetOrderHistory(db, userID)
		if err != nil {
			http.Error(w, "Could not fetch order history", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(orders)
	}
}
