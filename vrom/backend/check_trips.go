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
		SELECT t.trip_id, t.status, u.email 
		FROM trips t 
		JOIN users u ON t.rider_id = u.user_id 
		WHERE u.email = 'rider@vrm.com'`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("TRIPS FOR rider@vrm.com:")
	for rows.Next() {
		var id, status, email string
		rows.Scan(&id, &status, &email)
		fmt.Printf("- ID: %s, Status: [%s]\n", id, status)
	}
}
