package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"
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
			COALESCE((SELECT SUM(total_amount) FROM orders WHERE status NOT IN ('cancelled', 'rejected')), 0) + 
			COALESCE((SELECT SUM(actual_fare) FROM trips WHERE status NOT IN ('cancelled', 'rejected')), 0) AS gmv,
			
			-- Commission (Vrom Earnings = 10% orders + 20% trips)
			COALESCE((SELECT SUM(total_amount * 0.10) FROM orders WHERE status NOT IN ('cancelled', 'rejected')), 0) + 
			COALESCE((SELECT SUM(actual_fare * 0.20) FROM trips WHERE status NOT IN ('cancelled', 'rejected')), 0) AS commission,
			
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
		FROM orders
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
		       u.is_verified, u.created_at, COALESCE(w.balance, 0),
		       (SELECT COUNT(*) FROM orders WHERE buyer_id = u.user_id) as orders_count,
		       (SELECT COUNT(*) FROM trips WHERE buyer_id = u.user_id) as trips_count
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
	users := []models.AdminUserView{}
	for rows.Next() {
		var u models.AdminUserView
		if err := rows.Scan(&u.UserID, &u.FullName, &u.Email, &u.PhoneNumber, &u.Role,
			&u.IsVerified, &u.CreatedAt, &u.Balance, &u.OrdersCount, &u.TripsCount); err != nil {
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
	entries := []models.AuditEntry{}
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
	products := []models.FlaggedProduct{}
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
	leaders := []models.RiderLeaderboardEntry{}
	for rows.Next() {
		var e models.RiderLeaderboardEntry
		rows.Scan(&e.UserID, &e.FullName, &e.TripCount, &e.TotalEarnings, &e.AvgRating)
		leaders = append(leaders, e)
	}
	return leaders, nil
}

// ───────────────────────────────────────────────
// SECURITY ALERTS
// ───────────────────────────────────────────────

func GetSecurityAlerts(db *sql.DB, status string) ([]models.OCCSecurityAlert, error) {
	rows, err := db.Query(`
		SELECT alert_id, type, severity, message, status, region, created_at, COALESCE(resolved_at::text, '')
		FROM occ_security_alerts
		WHERE status = $1
		ORDER BY created_at DESC
		LIMIT 50`, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := []models.OCCSecurityAlert{}
	for rows.Next() {
		var a models.OCCSecurityAlert
		rows.Scan(&a.AlertID, &a.Type, &a.Severity, &a.Message, &a.Status, &a.Region, &a.CreatedAt, &a.ResolvedAt)
		alerts = append(alerts, a)
	}
	return alerts, nil
}

func UpdateSecurityAlert(db *sql.DB, alertID string, status string) error {
	var query string
	if status == "resolved" {
		query = "UPDATE occ_security_alerts SET status = $1, resolved_at = NOW() WHERE alert_id = $2"
	} else {
		query = "UPDATE occ_security_alerts SET status = $1 WHERE alert_id = $2"
	}
	_, err := db.Exec(query, status, alertID)
	return err
}

// ───────────────────────────────────────────────
// LIVE FLEET (MAP)
// ───────────────────────────────────────────────

func GetAllActiveTrips(db *sql.DB) ([]models.TripSummary, error) {
	rows, err := db.Query(`
		SELECT trip.trip_id::text, trip.status, trip.actual_fare, trip.created_at,
		       trip.pickup_address, trip.dropoff_address,
		       ST_Y(trip.pickup_location::geometry) as p_lat, ST_X(trip.pickup_location::geometry) as p_lng,
		       ST_Y(trip.dropoff_location::geometry) as d_lat, ST_X(trip.dropoff_location::geometry) as d_lng,
		       b.full_name as rider_name, b.phone_number as rider_phone,
		       s.full_name as driver_name, s.phone_number as driver_phone
		FROM trips trip
		LEFT JOIN users b ON trip.buyer_id = b.user_id
		LEFT JOIN users s ON trip.rider_id = s.user_id
		WHERE trip.status IN ('pending', 'accepted', 'picked_up')`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	trips := []models.TripSummary{}
	for rows.Next() {
		var t models.TripSummary
		var rName, rPhone, dName, dPhone sql.NullString
		
		err = rows.Scan(&t.TripID, &t.Status, &t.Fare, &t.CreatedAt, &t.PickupAddress, &t.DropoffAddress, &t.PLat, &t.PLng, &t.DLat, &t.DLng, &rName, &rPhone, &dName, &dPhone)
		if err == nil {
			t.RiderName = rName.String
			t.RiderPhone = rPhone.String
			t.DriverName = dName.String
			t.DriverPhone = dPhone.String
			trips = append(trips, t)
		}
	}
	return trips, nil
}

func GetIdleRiders(db *sql.DB) ([]models.IdleRider, error) {
	rows, err := db.Query(`
		SELECT p.rider_id::text, COALESCE(p.last_lat, 0), COALESCE(p.last_lng, 0),
		       u.full_name, u.phone_number
		FROM rider_profiles p
		JOIN users u ON p.rider_id = u.user_id
		WHERE TRIM(LOWER(p.status::text)) IN ('online', 'idle')
		  AND p.is_available = true
		  AND NOT EXISTS (
			  SELECT 1 FROM trips t 
			  WHERE t.rider_id = p.rider_id 
			    AND TRIM(LOWER(t.status::text)) IN ('pending', 'accepted', 'picked_up')
		  )`)
	if err != nil {
		fmt.Printf("⚠️ Query Error in GetIdleRiders: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var idle []models.IdleRider
	for rows.Next() {
		var r models.IdleRider
		if err := rows.Scan(&r.RiderID, &r.Lat, &r.Lng, &r.RiderName, &r.RiderPhone); err != nil {
			fmt.Printf("⚠️ Scan Error in GetIdleRiders: %v\n", err)
			continue
		}
		r.LastSeen = time.Now().Format(time.RFC3339)
		idle = append(idle, r)
	}
	return idle, nil
}

// GetRiderFullDetail fetches the complete profile, vehicle, and documents for a single rider.
func GetRiderFullDetail(db *sql.DB, userID string) (models.RiderFullDetail, error) {
	var detail models.RiderFullDetail

	// 1. Fetch Basic Info & Profile with assigned_region and vehicle_photo_url
	query := `
		SELECT u.user_id, u.full_name, u.email, u.phone_number, u.assigned_region,
		       COALESCE(p.vehicle_type, 'N/A'), COALESCE(p.plate_number, 'PENDING'), 
		       COALESCE(p.vehicle_photo_url, ''), COALESCE(p.status, 'pending'), 
		       COALESCE(p.is_available, false),
		       COALESCE(p.last_lat, 0), COALESCE(p.last_lng, 0)
		FROM users u
		LEFT JOIN rider_profiles p ON u.user_id = p.rider_id
		WHERE u.user_id = $1`

	err := db.QueryRow(query, userID).Scan(
		&detail.UserID, &detail.FullName, &detail.Email, &detail.PhoneNumber, &detail.AssignedRegion,
		&detail.VehicleType, &detail.PlateNumber, &detail.VehiclePhotoURL, &detail.Status, &detail.IsAvailable,
		&detail.LastLat, &detail.LastLng,
	)
	if err != nil {
		return detail, err
	}

	// 2. Fetch Documents
	docQuery := `
		SELECT document_value, image_url, verification_status
		FROM user_compliance_data
		WHERE user_id = $1`

	rows, err := db.Query(docQuery, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var doc models.RiderDocument
			if err := rows.Scan(&doc.DocumentType, &doc.ImageURL, &doc.VerificationStatus); err == nil {
				detail.Documents = append(detail.Documents, doc)
			}
		}
	}

	// 3. Fetch Recent Trip (Latest one) with customer details
	tripQuery := `
		SELECT t.trip_id, t.status, t.fare, t.pickup_address, t.dropoff_address, t.created_at,
		       u.full_name as customer_name, u.phone_number as customer_phone
		FROM trips t
		JOIN users u ON t.customer_id = u.user_id
		WHERE t.rider_id = $1
		ORDER BY t.created_at DESC
		LIMIT 1`

	var t models.TripSummary
	err = db.QueryRow(tripQuery, userID).Scan(
		&t.TripID, &t.Status, &t.Fare, &t.PickupAddress, &t.DropoffAddress, &t.CreatedAt,
		&t.CustomerName, &t.CustomerPhone,
	)
	if err == nil {
		detail.CurrentTrip = &t
	}

	return detail, nil
}

