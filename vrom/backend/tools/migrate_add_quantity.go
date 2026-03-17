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

	// Add quantity column if it doesn't exist
	_, err = db.Exec(`
		ALTER TABLE orders 
		ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1 NOT NULL;
	`)
	if err != nil {
		log.Fatalf("Failed to add quantity column: %v", err)
	}

	fmt.Println("✅ Successfully added 'quantity' column to orders table.")
}
