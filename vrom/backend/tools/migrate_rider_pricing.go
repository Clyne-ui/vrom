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

	fmt.Println("Migrating database for Custom Rider Pricing...")

	queries := []string{
		`ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS base_fare DECIMAL(12, 2) DEFAULT 100.0`,
		`ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS price_per_km DECIMAL(12, 2) DEFAULT 40.0`,
	}

	for _, q := range queries {
		_, err := db.Exec(q)
		if err != nil {
			log.Fatalf("Migration failed on query [%s]: %v", q, err)
		}
	}

	fmt.Println("Migration successful! Riders can now set their own rates.")
}
