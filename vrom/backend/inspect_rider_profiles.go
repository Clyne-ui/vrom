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

	rows, err := db.Query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rider_profiles'")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("COLUMNS IN rider_profiles:")
	for rows.Next() {
		var name, dtype string
		rows.Scan(&name, &dtype)
		fmt.Printf("- %s (%s)\n", name, dtype)
	}
}
