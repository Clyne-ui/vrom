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
		log.Fatalf("❌ Failed to connect to db: %v", err)
	}
	defer db.Close()

	fmt.Println("Migrating database: Adding fcm_token column to users table...")

	_, err = db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;`)
	if err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	fmt.Println("✅ Successfully added fcm_token column!")
}
