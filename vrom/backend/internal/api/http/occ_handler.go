package http

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/services"
)

// ─────────────────────────────────────────────────
// SECTION 1: LIVE SSE STREAMS (Real-Time Feeds)
// ─────────────────────────────────────────────────

// HandleOCCFinancialStream streams live GMV, commission, and escrow every 5 seconds.
func HandleOCCFinancialStream(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "SSE not supported", http.StatusInternalServerError)
			return
		}

		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-r.Context().Done():
				return
			case <-ticker.C:
				financials, err := repository.GetLiveFinancials(db)
				if err != nil {
					continue
				}
				data, _ := json.Marshal(financials)
				fmt.Fprintf(w, "event: financials\ndata: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// HandleOCCHealthStream pings all services and streams latency every 10 seconds.
func HandleOCCHealthStream() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "SSE not supported", http.StatusInternalServerError)
			return
		}

		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		check := func(url string) int64 {
			start := time.Now()
			resp, err := http.Get(url)
			if err != nil || resp.StatusCode >= 500 {
				return -1
			}
			return time.Since(start).Milliseconds()
		}

		for {
			select {
			case <-r.Context().Done():
				return
			case <-ticker.C:
				health := map[string]interface{}{
					"go_api_ms":   check("http://localhost:8080/categories"),
					"rust_ms":     check("http://localhost:50051"),
					"python_ms":   check("http://localhost:50052"),
					"checked_at":  time.Now().Format(time.RFC3339),
				}
				data, _ := json.Marshal(health)
				fmt.Fprintf(w, "event: health\ndata: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}

// ─────────────────────────────────────────────────
// SECTION 2: FINANCIAL VAULT
// ─────────────────────────────────────────────────

func HandleOCCGetFinancials(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		financials, err := repository.GetLiveFinancials(db)
		if err != nil {
			http.Error(w, "Failed to fetch financials", http.StatusInternalServerError)
			return
		}
		revenue, _ := repository.GetRevenueBreakdown(db)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"financials": financials,
			"revenue":    revenue,
		})
	}
}

func HandleOCCGetEscrow(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entries, err := repository.GetEscrowOrders(db)
		if err != nil {
			http.Error(w, "Failed to fetch escrow orders", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(entries)
	}
}

// ─────────────────────────────────────────────────
// SECTION 3: USER CRM
// ─────────────────────────────────────────────────

func HandleOCCSearchUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		role := r.URL.Query().Get("role")

		users, err := repository.SearchUsers(db, query, role)
		if err != nil {
			http.Error(w, "Search failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

func HandleOCCGetUserHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		if userID == "" {
			http.Error(w, "user_id required", http.StatusBadRequest)
			return
		}
		history, err := repository.GetUserFullHistory(db, userID)
		if err != nil {
			http.Error(w, "Failed to get user history", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(history)
	}
}

// ─────────────────────────────────────────────────
// SECTION 4: KILL SWITCH
// ─────────────────────────────────────────────────

func HandleOCCSuspendUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
			http.Error(w, "user_id required", http.StatusBadRequest)
			return
		}

		// Suspend in DB
		if err := repository.SuspendUser(db, req.UserID); err != nil {
			http.Error(w, "Suspension failed", http.StatusInternalServerError)
			return
		}

		// Revoke any active JWT token via Redis
		services.RevokeUserTokens(req.UserID)

		// Write audit log
		adminEmail := r.Header.Get("X-User-Email")
		repository.WriteAuditLog(db, adminEmail, "SUSPENDED_USER", req.UserID, r.RemoteAddr)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "Success",
			"message": fmt.Sprintf("User %s has been suspended and their session revoked.", req.UserID),
		})
	}
}

func HandleOCCUnsuspendUser(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			UserID string `json:"user_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
			http.Error(w, "user_id required", http.StatusBadRequest)
			return
		}

		if err := repository.UnsuspendUser(db, req.UserID); err != nil {
			http.Error(w, "Unsuspend failed", http.StatusInternalServerError)
			return
		}

		adminEmail := r.Header.Get("X-User-Email")
		repository.WriteAuditLog(db, adminEmail, "UNSUSPENDED_USER", req.UserID, r.RemoteAddr)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Success", "message": "User reinstated."})
	}
}

func HandleOCCGetMaintenanceStatus() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		status := services.IsMaintenanceMode()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"maintenance_mode": status,
		})
	}
}

func HandleOCCToggleMaintenance(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Active bool `json:"active"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if err := services.SetMaintenanceMode(req.Active); err != nil {
			http.Error(w, "Failed to toggle maintenance mode", http.StatusInternalServerError)
			return
		}

		adminEmail := r.Header.Get("X-User-Email")
		action := "SYSTEM_MAINTENANCE_OFF"
		if req.Active {
			action = "SYSTEM_MAINTENANCE_ON"
		}
		repository.WriteAuditLog(db, adminEmail, action, "SYSTEM", r.RemoteAddr)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":           "Success",
			"maintenance_mode": req.Active,
		})
	}
}

// ─────────────────────────────────────────────────
// SECTION 5: DISPUTE RESOLUTION
// ─────────────────────────────────────────────────

func HandleOCCGetDisputes(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		disputes, err := repository.GetOpenDisputes(db)
		if err != nil {
			http.Error(w, "Failed to fetch disputes", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(disputes)
	}
}

func HandleOCCResolveDispute(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if err := repository.ResolveDisputeRefund(db, req.OrderID); err != nil {
			http.Error(w, "Resolution failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		adminEmail := r.Header.Get("X-User-Email")
		repository.WriteAuditLog(db, adminEmail, "RESOLVED_DISPUTE_REFUND", req.OrderID, r.RemoteAddr)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "Success",
			"message": "Dispute resolved. Buyer has been refunded.",
		})
	}
}

// ─────────────────────────────────────────────────
// SECTION 6: AUDIT LOG
// ─────────────────────────────────────────────────

func HandleOCCGetAuditLog(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		entries, err := repository.GetAuditLog(db, page, 50)
		if err != nil {
			http.Error(w, "Failed to fetch audit log", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(entries)
	}
}

// ─────────────────────────────────────────────────
// SECTION 7: CONTENT MODERATION QUEUE
// ─────────────────────────────────────────────────

func HandleOCCGetContentQueue(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		products, err := repository.GetFlaggedContent(db)
		if err != nil {
			http.Error(w, "Failed to fetch content queue", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(products)
	}
}

func HandleOCCApproveContent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ProductID string `json:"product_id"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		repository.ApproveContent(db, req.ProductID)
		adminEmail := r.Header.Get("X-User-Email")
		repository.WriteAuditLog(db, adminEmail, "APPROVED_CONTENT", req.ProductID, r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Approved"})
	}
}

func HandleOCCRejectContent(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ProductID string `json:"product_id"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		repository.RejectContent(db, req.ProductID)
		adminEmail := r.Header.Get("X-User-Email")
		repository.WriteAuditLog(db, adminEmail, "REJECTED_CONTENT", req.ProductID, r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "Rejected & Deactivated"})
	}
}

// ─────────────────────────────────────────────────
// SECTION 8: LEADERBOARD & ANALYTICS
// ─────────────────────────────────────────────────

func HandleOCCRiderLeaderboard(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		leaders, err := repository.GetRiderLeaderboard(db)
		if err != nil {
			http.Error(w, "Failed to fetch leaderboard", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(leaders)
	}
}
