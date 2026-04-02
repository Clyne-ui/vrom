package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgres://postgres:37877975123@127.0.0.1:3000/Vromdatabase?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	userID := "3b11718f-0dd2-47f3-b27b-8610575b8ac5"

	query := `
		SELECT u.user_id, u.full_name, COALESCE(u.email, ''), COALESCE(u.phone_number, ''), 
		       COALESCE(u.assigned_region, ''),
		       COALESCE(p.vehicle_type, 'N/A'), COALESCE(p.plate_number, 'PENDING'), 
		       COALESCE(p.vehicle_photo_url, ''), COALESCE(p.status, 'pending'), 
		       COALESCE(p.is_available, false),
		       COALESCE(p.last_lat, 0), COALESCE(p.last_lng, 0)
		FROM users u
		LEFT JOIN rider_profiles p ON u.user_id = p.rider_id
		WHERE u.user_id = $1`

	var uid, fullName, email, phone, region, vehicleType, plate, vehiclePhoto, status string
	var isAvailable bool
	var lastLat, lastLng float64

	err = db.QueryRow(query, userID).Scan(
		&uid, &fullName, &email, &phone, &region,
		&vehicleType, &plate, &vehiclePhoto, &status, &isAvailable,
		&lastLat, &lastLng,
	)
	if err != nil {
		fmt.Printf("❌ QUERY ERROR: %v\n", err)
		return
	}

	fmt.Printf("✅ RIDER FOUND:\n")
	fmt.Printf("  ID: %s\n", uid)
	fmt.Printf("  Name: %s\n", fullName)
	fmt.Printf("  Email: %s\n", email)
	fmt.Printf("  Phone: %s\n", phone)
	fmt.Printf("  Region: %s\n", region)
	fmt.Printf("  Vehicle Type: %s\n", vehicleType)
	fmt.Printf("  Plate: %s\n", plate)
	fmt.Printf("  Status: %s\n", status)
	fmt.Printf("  Available: %v\n", isAvailable)

	// Also check trips
	tripQuery := `
		SELECT t.trip_id, t.status, t.fare, t.pickup_address, t.dropoff_address
		FROM trips t
		WHERE t.rider_id = $1
		ORDER BY t.created_at DESC
		LIMIT 1`

	var tripID, tripStatus, pickupAddr, dropoffAddr string
	var fare float64
	err = db.QueryRow(tripQuery, userID).Scan(&tripID, &tripStatus, &fare, &pickupAddr, &dropoffAddr)
	if err == sql.ErrNoRows {
		fmt.Printf("  No trips found for this rider\n")
	} else if err != nil {
		fmt.Printf("  Trip query error: %v\n", err)
	} else {
		fmt.Printf("  Recent Trip: %s (%s) fare=%.2f\n", tripID, tripStatus, fare)
	}

	// Check columns in trips table
	rows, err := db.Query("SELECT column_name FROM information_schema.columns WHERE table_name = 'trips' ORDER BY ordinal_position")
	if err != nil {
		fmt.Printf("Column check error: %v\n", err)
		return
	}
	defer rows.Close()
	fmt.Printf("\nTrips table columns:\n")
	for rows.Next() {
		var col string
		rows.Scan(&col)
		fmt.Printf("  - %s\n", col)
	}
}
