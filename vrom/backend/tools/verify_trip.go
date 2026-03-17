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

	var tripID, status, otp string
	var fare float64
	err = db.QueryRow(`
		SELECT trip_id, status, actual_fare, trip_otp 
		FROM trips 
		ORDER BY created_at DESC 
		LIMIT 1`).Scan(&tripID, &status, &fare, &otp)
	
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("📜 Latest Trip Details:")
	fmt.Printf("- Trip ID: %s\n", tripID)
	fmt.Printf("- Status: %s\n", status)
	fmt.Printf("- Fare: KES %.2f\n", fare)
	fmt.Printf("- OTP: %s\n", otp)
}
