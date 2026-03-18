package repository

import (
	"context"
	"database/sql"
	"fmt"
	"vrom-backend/internal/models"
)

// ───────────────────────────────────────────────
// FINANCIALS
// ───────────────────────────────────────────────

// GetLiveFinancials returns a snapshot of today's platform financials.
func GetLiveFinancials(db *sql.DB) (models.OCCFinancials, error) {
	var f models.OCCFinancials
	err := db.QueryRow(`
		SELECT 
			-- Overall GMV (Orders + Trips)
			COALESCE((SELECT SUM(total_amount) FROM orders WHERE status NOT IN ('cancelled', 'rejected')) + 
			         (SELECT SUM(actual_fare) FROM trips WHERE status NOT IN ('cancelled', 'rejected')), 0) AS gmv,
			
			-- Commission (Vrom Earnings = 10% orders + 20% trips)
			COALESCE((SELECT SUM(total_amount * 0.10) FROM orders WHERE status NOT IN ('cancelled', 'rejected')) + 
			         (SELECT SUM(actual_fare * 0.20) FROM trips WHERE status NOT IN ('cancelled', 'rejected')), 0) AS commission,
			
			-- Wallet & Escrow
			COALESCE((SELECT SUM(locked_funds) FROM wallets), 0) AS escrow_in_flight,
			COALESCE((SELECT SUM(balance) FROM wallets), 0) AS total_wallet_balance,
			COALESCE((SELECT SUM(amount) FROM user_activities WHERE activity_type = 'withdrawal'), 0) AS total_withdrawn,
			
			-- Counts
			(SELECT COUNT(*) FROM orders) AS total_orders,
			(SELECT COUNT(*) FROM orders WHERE status = 'delivered') AS completed_sales,
			(SELECT COUNT(*) FROM trips WHERE status IN ('pending', 'accepted', 'in_progress')) AS pending_trips,
			(SELECT COUNT(*) FROM trips WHERE status = 'completed') AS completed_trips
	`).Scan(
		&f.GMV, &f.Commission, &f.EscrowInFlight, &f.TotalWalletBalance, &f.TotalWithdrawn,
		&f.TotalOrders, &f.CompletedSales, &f.PendingTrips, &f.CompletedTrips,
	)
	return f, err
}

// GetRevenueBreakdown returns daily, weekly, and monthly revenue totals.
func GetRevenueBreakdown(db *sql.DB) (models.RevenueBreakdown, error) {
	var r models.RevenueBreakdown
	err := db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN total_amount * 0.10 ELSE 0 END), 0) AS daily,
			COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days'   THEN total_amount * 0.10 ELSE 0 END), 0) AS weekly,
			COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days'  THEN total_amount * 0.10 ELSE 0 END), 0) AS monthly
		FROM orders WHERE status NOT IN ('cancelled')
	`).Scan(&r.Daily, &r.Weekly, &r.Monthly)
	return r, err
}

// GetEscrowOrders returns all orders currently holding funds in escrow.
func GetEscrowOrders(db *sql.DB) ([]models.EscrowEntry, error) {
	rows, err := db.Query(`
		SELECT o.order_id, u.full_name, o.total_amount, o.status, o.created_at
		FROM orders o
		JOIN users u ON o.buyer_id = u.user_id
		WHERE o.status IN ('paid_escrow', 'seller_approved', 'pending_payment')
		ORDER BY o.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []models.EscrowEntry
	for rows.Next() {
		var e models.EscrowEntry
		if err := rows.Scan(&e.OrderID, &e.BuyerName, &e.Amount, &e.Status, &e.CreatedAt); err != nil {
			continue
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// ───────────────────────────────────────────────
// USER CRM
// ───────────────────────────────────────────────

// SearchUsers finds users by email, phone, name, or role.
func SearchUsers(db *sql.DB, query, role string) ([]models.AdminUserView, error) {
	q := `
		SELECT u.user_id, u.full_name, u.email, u.phone_number, u.role, 
		       u.is_verified, u.created_at, COALESCE(w.balance, 0)
		FROM users u
		LEFT JOIN wallets w ON u.user_id = w.user_id
		WHERE (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone_number ILIKE $1)
	`
	args := []interface{}{"%" + query + "%"}
	if role != "" {
		q += " AND u.role = $2"
		args = append(args, role)
	}
	q += " ORDER BY u.created_at DESC LIMIT 50"

	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []models.AdminUserView
	for rows.Next() {
		var u models.AdminUserView
		if err := rows.Scan(&u.UserID, &u.FullName, &u.Email, &u.PhoneNumber, &u.Role,
			&u.IsVerified, &u.CreatedAt, &u.Balance); err != nil {
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

// GetUserFullHistory returns complete transaction + trip + order history for a user.
func GetUserFullHistory(db *sql.DB, userID string) (*models.AdminUserHistory, error) {
	var h models.AdminUserHistory
	h.UserID = userID

	// Transactions
	rows, err := db.Query(`SELECT id, activity_type, amount, description, created_at, balance_after
		FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var a models.Activity
			rows.Scan(&a.ID, &a.ActivityType, &a.Amount, &a.Description, &a.CreatedAt, &a.BalanceAfter)
			h.Activities = append(h.Activities, a)
		}
	}

	// Trips
	tripRows, _ := db.Query(`SELECT trip_id, status, actual_fare, created_at FROM trips WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 50`, userID)
	if tripRows != nil {
		defer tripRows.Close()
		for tripRows.Next() {
			var t models.TripSummary
			tripRows.Scan(&t.TripID, &t.Status, &t.Fare, &t.CreatedAt)
			h.Trips = append(h.Trips, t)
		}
	}

	// Orders
	orderRows, _ := db.Query(`SELECT order_id, status, total_amount, created_at FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 50`, userID)
	if orderRows != nil {
		defer orderRows.Close()
		for orderRows.Next() {
			var o models.OrderSummary
			orderRows.Scan(&o.OrderID, &o.Status, &o.Amount, &o.CreatedAt)
			h.Orders = append(h.Orders, o)
		}
	}

	return &h, nil
}

// ───────────────────────────────────────────────
// KILL SWITCH & SUSPENSION
// ───────────────────────────────────────────────

// SuspendUser disables a user account immediately.
func SuspendUser(db *sql.DB, userID string) error {
	_, err := db.Exec("UPDATE users SET is_verified = false WHERE user_id = $1", userID)
	return err
}

// UnsuspendUser re-enables a user account.
func UnsuspendUser(db *sql.DB, userID string) error {
	_, err := db.Exec("UPDATE users SET is_verified = true WHERE user_id = $1", userID)
	return err
}

// ───────────────────────────────────────────────
// DISPUTE RESOLUTION
// ───────────────────────────────────────────────

// GetOpenDisputes returns all orders in a disputed state.
func GetOpenDisputes(db *sql.DB) ([]models.DisputeEntry, error) {
	rows, err := db.Query(`
		SELECT o.order_id, buyer.full_name, seller.full_name, o.total_amount, o.status, o.created_at
		FROM orders o
		JOIN users buyer  ON o.buyer_id  = buyer.user_id
		JOIN users seller ON o.seller_id = seller.user_id
		WHERE o.status = 'disputed'
		ORDER BY o.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var disputes []models.DisputeEntry
	for rows.Next() {
		var d models.DisputeEntry
		rows.Scan(&d.OrderID, &d.BuyerName, &d.SellerName, &d.Amount, &d.Status, &d.CreatedAt)
		disputes = append(disputes, d)
	}
	return disputes, nil
}

// ResolveDisputeRefund refunds the buyer and cancels the order.
func ResolveDisputeRefund(db *sql.DB, orderID string) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var buyerID string
	var totalAmount float64
	err = tx.QueryRowContext(ctx,
		"SELECT buyer_id, total_amount FROM orders WHERE order_id = $1 FOR UPDATE", orderID).
		Scan(&buyerID, &totalAmount)
	if err != nil {
		return fmt.Errorf("order not found: %v", err)
	}

	// Return funds from escrow back to buyer's balance
	_, err = tx.ExecContext(ctx,
		"UPDATE wallets SET balance = balance + $1, locked_funds = locked_funds - $1 WHERE user_id = $2",
		totalAmount, buyerID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "UPDATE orders SET status = 'cancelled' WHERE order_id = $1", orderID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// ───────────────────────────────────────────────
// AUDIT LOG
// ───────────────────────────────────────────────

// WriteAuditLog records an admin action immutably.
func WriteAuditLog(db *sql.DB, adminEmail, action, targetID, ipAddress string) {
	db.Exec(`INSERT INTO occ_audit_log (admin_email, action, target_id, ip_address) VALUES ($1, $2, $3, $4)`,
		adminEmail, action, targetID, ipAddress)
}

// GetAuditLog returns paginated audit log entries.
func GetAuditLog(db *sql.DB, page, limit int) ([]models.AuditEntry, error) {
	offset := (page - 1) * limit
	rows, err := db.Query(`
		SELECT log_id, admin_email, action, target_id, ip_address, created_at
		FROM occ_audit_log
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []models.AuditEntry
	for rows.Next() {
		var e models.AuditEntry
		rows.Scan(&e.LogID, &e.AdminEmail, &e.Action, &e.TargetID, &e.IPAddress, &e.CreatedAt)
		entries = append(entries, e)
	}
	return entries, nil
}

// ───────────────────────────────────────────────
// CONTENT MODERATION QUEUE
// ───────────────────────────────────────────────

// GetFlaggedContent returns products flagged by AI for admin review.
func GetFlaggedContent(db *sql.DB) ([]models.FlaggedProduct, error) {
	rows, err := db.Query(`
		SELECT p.product_id, p.title, p.image_url, p.price, u.full_name, p.created_at
		FROM products p
		JOIN users u ON p.seller_id = u.user_id
		WHERE p.ai_flagged = true AND p.is_active = true
		ORDER BY p.created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var products []models.FlaggedProduct
	for rows.Next() {
		var fp models.FlaggedProduct
		rows.Scan(&fp.ProductID, &fp.Title, &fp.ImageURL, &fp.Price, &fp.SellerName, &fp.FlaggedAt)
		products = append(products, fp)
	}
	return products, nil
}

// ApproveContent clears the AI flag and keeps the product active.
func ApproveContent(db *sql.DB, productID string) error {
	_, err := db.Exec("UPDATE products SET ai_flagged = false WHERE product_id = $1", productID)
	return err
}

// RejectContent deactivates the flagged product.
func RejectContent(db *sql.DB, productID string) error {
	_, err := db.Exec("UPDATE products SET is_active = false, ai_flagged = false WHERE product_id = $1", productID)
	return err
}

// ───────────────────────────────────────────────
// RIDER LEADERBOARD
// ───────────────────────────────────────────────

func GetRiderLeaderboard(db *sql.DB) ([]models.RiderLeaderboardEntry, error) {
	rows, err := db.Query(`
		SELECT u.user_id, u.full_name, COUNT(t.trip_id) AS trips, 
		       COALESCE(SUM(t.actual_fare * 0.80), 0) AS earnings,
		       rp.avg_rating
		FROM users u
		JOIN rider_profiles rp ON u.user_id = rp.rider_id
		LEFT JOIN trips t ON t.rider_id = u.user_id AND t.status = 'completed'
		GROUP BY u.user_id, u.full_name, rp.avg_rating
		ORDER BY earnings DESC
		LIMIT 20
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var leaders []models.RiderLeaderboardEntry
	for rows.Next() {
		var e models.RiderLeaderboardEntry
		rows.Scan(&e.UserID, &e.FullName, &e.TripCount, &e.TotalEarnings, &e.AvgRating)
		leaders = append(leaders, e)
	}
	return leaders, nil
}
