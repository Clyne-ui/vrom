//go:build ignore

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

	rows, err := db.Query(`
		SELECT rider_id, is_available, base_fare, price_per_km,
		       ST_Y(current_location::geometry) as lat, 
		       ST_X(current_location::geometry) as lng 
		FROM rider_profiles 
		WHERE is_available = true`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("🚴 Available Riders:")
	for rows.Next() {
		var id string
		var available bool
		var base, rate, lat, lng float64
		if err := rows.Scan(&id, &available, &base, &rate, &lat, &lng); err != nil {
			fmt.Printf("Scan error: %v\n", err)
			continue
		}
		fmt.Printf("- ID: %s, Rates: (Base: %.2f, Rate: %.2f), Location: (%.4f, %.4f)\n", id, base, rate, lat, lng)
	}
}
