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

	tripID := "dbfaec84-3b12-4720-9aa2-1d21d1ac1a99" // ID from user screenshot
	var status string
	err = db.QueryRow("SELECT status FROM trips WHERE trip_id = $1", tripID).Scan(&status)
	if err != nil {
		fmt.Printf("Error or Trip not found: %v\n", err)
		return
	}
	fmt.Printf("Trip ID: %s | Status: %s\n", tripID, status)
}
