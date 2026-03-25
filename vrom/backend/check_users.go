package main

import (
	"database/sql"
	"fmt"
	"log"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	connStr := "postgres://postgres:37877975123@127.0.0.1:3000/Vromdatabase?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Ensure the user exists and is verified
	newPassword := "password123"
	hash, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	passwordHash := string(hash)
	
	_, err = db.Exec(`
		UPDATE users SET role = 'admin', is_verified = true, password_hash = $1
		WHERE email = 'adminvrom@gmail.com'`, passwordHash)
	if err != nil {
		log.Fatalf("Update error: %v", err)
	}
	
	// If it doesn't exist, insert it
	_, err = db.Exec(`
		INSERT INTO users (full_name, email, phone_number, password_hash, role, is_verified)
		VALUES ('Admin Vrom', 'adminvrom@gmail.com', '+254799000000', $1, 'admin', true)
		ON CONFLICT DO NOTHING`, passwordHash)

	// List all tables
	tableRows, err := db.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
	if err == nil {
		fmt.Println("Tables in DB:")
		for tableRows.Next() {
			var tableName string
			tableRows.Scan(&tableName)
			fmt.Printf("- %s\n", tableName)
		}
		tableRows.Close()
	}

	rows, err := db.Query("SELECT email, role, is_verified FROM users")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Full List of Emails in DB:")
	count := 0
	for rows.Next() {
		var email, role string
		var verified bool
		rows.Scan(&email, &role, &verified)
		fmt.Printf("- %s (Role: %s, Verified: %v)\n", email, role, verified)
		count++
	}
	fmt.Printf("Total Users: %d\n", count)
}
