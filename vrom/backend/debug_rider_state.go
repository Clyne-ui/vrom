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

	var riderID, status string
	var isAvailable bool
	var lastLat, lastLng float64
	var email string = "rider@vrm.com"

	err = db.QueryRow(`
		SELECT p.rider_id, p.status, p.is_available, p.last_lat, p.last_lng
		FROM rider_profiles p
		JOIN users u ON p.rider_id = u.user_id
		WHERE u.email = $1`, email).Scan(&riderID, &status, &isAvailable, &lastLat, &lastLng)

	if err != nil {
		fmt.Printf("Error finding rider %s: %v\n", email, err)
		return
	}

	fmt.Printf("Rider: %s\n- ID: %s\n- Status: %s\n- IsAvailable: %v\n- Location: %f, %f\n", email, riderID, status, isAvailable, lastLat, lastLng)

	// Check for active trips
	var tripCount int
	db.QueryRow("SELECT count(*) FROM trips WHERE rider_id = $1 AND status IN ('pending', 'accepted', 'picked_up')", riderID).Scan(&tripCount)
	fmt.Printf("- Active Trips: %d\n", tripCount)
}
