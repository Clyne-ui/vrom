package repository

import (
	"context"
	"database/sql"
	"fmt"
	"vrom-backend/internal/models"
)

// RequestRide: Validates wallet balance, locks funds in escrow, creates the trip record.
// NO OTP is generated for rides — that is only for product delivery.
func RequestRide(db *sql.DB, customerEmail string, input models.RideRequestInput, estimatedPrice float64, riderID string) (string, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	// 1. Get buyer ID and LOCK wallet to check balance
	var buyerID string
	var walletBalance float64
	err = tx.QueryRowContext(ctx,
		"SELECT user_id, balance FROM wallets WHERE user_id = (SELECT user_id FROM users WHERE email = $1) FOR UPDATE",
		customerEmail).Scan(&buyerID, &walletBalance)
	if err != nil {
		return "", fmt.Errorf("could not find your account: %v", err)
	}

	// 2. Enforce: customer MUST have enough funds
	if walletBalance < estimatedPrice {
		return "", fmt.Errorf("insufficient wallet balance. Ride costs KES %.2f but your wallet has KES %.2f", estimatedPrice, walletBalance)
	}

	// 3. Move funds to escrow (deduct from balance, lock in locked_funds)
	_, err = tx.ExecContext(ctx,
		"UPDATE wallets SET balance = balance - $1, locked_funds = locked_funds + $1 WHERE user_id = $2",
		estimatedPrice, buyerID)
	if err != nil {
		return "", fmt.Errorf("failed to secure escrow: %v", err)
	}

	// 4. Create the trip record (NO OTP — trips use GPS verification, not OTP)
	var tripID string
	query := `
		INSERT INTO trips (buyer_id, rider_id, actual_fare, status, pickup_location, dropoff_location) 
		VALUES ($1, $2, $3, 'pending', ST_SetSRID(ST_MakePoint($4, $5), 4326), ST_SetSRID(ST_MakePoint($6, $7), 4326))
		RETURNING trip_id`

	err = tx.QueryRowContext(ctx, query,
		buyerID, riderID, estimatedPrice,
		input.PickupLng, input.PickupLat,
		input.DropoffLng, input.DropoffLat).Scan(&tripID)
	if err != nil {
		return "", fmt.Errorf("failed to create trip: %v", err)
	}

	return tripID, tx.Commit()
}

func GetActiveTrip(db *sql.DB, email string) (string, string, float64, float64, float64, error) {
	query := `
		SELECT trip_id::text, status, actual_fare, ST_Y(dropoff_location::geometry), ST_X(dropoff_location::geometry)
		FROM trips 
		WHERE (buyer_id = (SELECT user_id FROM users WHERE email = $1) 
		   OR rider_id = (SELECT user_id FROM users WHERE email = $1))
		AND status NOT IN ('completed', 'cancelled')
		LIMIT 1`

	var id, status string
	var amount, lat, lng float64

	err := db.QueryRow(query, email).Scan(&id, &status, &amount, &lat, &lng)
	return id, status, amount, lat, lng, err
}

func UpdateTripStatus(db *sql.DB, tripID string, fromStatus, toStatus string) error {
	result, err := db.Exec("UPDATE trips SET status = $1 WHERE trip_id = $2 AND status = $3", toStatus, tripID, fromStatus)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("trip not found or is not in '%s' status", fromStatus)
	}
	return nil
}

// CompleteTrip: Verifies the rider is physically at the destination BEFORE releasing funds.
// This is GPS-based — no OTP involved.
// Geofence threshold: ~500 meters (0.005 degrees ≈ 500m)
func CompleteTrip(db *sql.DB, tripID string, curLat, curLng float64) (float64, float64, string, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, "", err
	}
	defer tx.Rollback()

	// 1. Lock the trip and fetch its details
	var totalAmount, destLat, destLng float64
	var riderID, buyerID string
	query := `
		SELECT actual_fare, rider_id, buyer_id,
		       ST_Y(dropoff_location::geometry),
		       ST_X(dropoff_location::geometry)
		FROM trips 
		WHERE trip_id = $1 AND status = 'picked_up' FOR UPDATE`

	err = tx.QueryRowContext(ctx, query, tripID).Scan(&totalAmount, &riderID, &buyerID, &destLat, &destLng)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, 0, "", fmt.Errorf("trip not found or passenger has not been picked up yet")
		}
		return 0, 0, "", err
	}

	// 2. Geofencing: Check rider is within ~500m of destination
	const geofenceThreshold = 0.005 // ~500 meters in decimal degrees
	diffLat := curLat - destLat
	diffLng := curLng - destLng
	distanceSquared := (diffLat * diffLat) + (diffLng * diffLng)

	if distanceSquared > (geofenceThreshold * geofenceThreshold) {
		approxDistM := (diffLat*diffLat + diffLng*diffLng) * 111000 // rough meters
		_ = approxDistM
		return 0, 0, "", fmt.Errorf(
			"❌ Cannot complete trip: You are too far from the destination (%.4f°N, %.4f°E). Please drive to the dropoff point and try again",
			destLat, destLng,
		)
	}

	// 3. Split earnings — 80% Rider, 20% Vrom commission
	riderShare := totalAmount * 0.80
	vromCommission := totalAmount * 0.20

	// 4. Credit rider's wallet
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", riderShare, riderID)
	if err != nil {
		return 0, 0, "", err
	}

	// 5. Release buyer's locked escrow funds (they are consumed now)
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET locked_funds = locked_funds - $1 WHERE user_id = $2", totalAmount, buyerID)
	if err != nil {
		return 0, 0, "", err
	}

	// 6. Mark trip as completed
	_, err = tx.ExecContext(ctx, "UPDATE trips SET status = 'completed' WHERE trip_id = $1", tripID)
	if err != nil {
		return 0, 0, "", err
	}

	// 7. Mark rider as available again
	_, err = tx.ExecContext(ctx, "UPDATE rider_profiles SET is_available = true WHERE rider_id = $1", riderID)
	if err != nil {
		return 0, 0, "", err
	}

	// 8. Record earnings in activity log
	desc := fmt.Sprintf("Trip #%s completed. Fare: KES %.2f (Vrom took %.2f)", tripID, totalAmount, vromCommission)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO user_activities (user_id, activity_type, description, amount, is_visible) 
		VALUES ($1, 'trip_earnings', $2, $3, true)`,
		riderID, desc, riderShare)
	if err != nil {
		return 0, 0, "", err
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, "", err
	}

	return riderShare, vromCommission, riderID, nil
}

func CancelRide(db *sql.DB, tripID, customerEmail string) (float64, string, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, "", err
	}
	defer tx.Rollback()

	var amount float64
	var buyerID string
	query := `
		SELECT t.actual_fare, t.buyer_id 
		FROM trips t
		JOIN users u ON t.buyer_id = u.user_id
		WHERE t.trip_id = $1 AND t.status = 'pending' AND u.email = $2`

	err = tx.QueryRowContext(ctx, query, tripID, customerEmail).Scan(&amount, &buyerID)
	if err != nil {
		return 0, "", fmt.Errorf("trip not found or already in progress")
	}

	// Return both balance and locked_funds
	_, err = tx.ExecContext(ctx,
		"UPDATE wallets SET balance = balance + $1, locked_funds = locked_funds - $1 WHERE user_id = $2",
		amount, buyerID)
	if err != nil {
		return 0, "", err
	}

	_, err = tx.ExecContext(ctx, "UPDATE trips SET status = 'cancelled' WHERE trip_id = $1", tripID)
	if err != nil {
		return 0, "", err
	}

	if err := tx.Commit(); err != nil {
		return 0, "", err
	}

	return amount, tripID, nil
}
