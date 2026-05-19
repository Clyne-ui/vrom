package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// Database connection string for local testing
	connStr := "postgres://postgres:37877975123@127.0.0.1:3000/Vromdatabase?sslmode=disable"
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Query the most recently registered user
	var email, passwordHash sql.NullString
	var fcmToken sql.NullString
	
	err = db.QueryRow("SELECT email, password_hash, fcm_token FROM users ORDER BY created_at DESC LIMIT 1").Scan(&email, &passwordHash, &fcmToken)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("No users found in the database. Try registering a user first!")
			return
		}
		log.Fatalf("Query failed: %v", err)
	}

	fmt.Println("--- DATABASE SECURITY CHECK ---")
	fmt.Printf("User Email: %s\n", email.String)
	
	// This shows the login/signup security (Bcrypt)
	fmt.Printf("\nPassword Hash (Bcrypt): \n%s\n", passwordHash.String)
	
	// This shows the FCM token encryption we just added (AES)
	if fcmToken.Valid && fcmToken.String != "" {
		fmt.Printf("\nFCM Token (AES Encrypted): \n%s\n", fcmToken.String)
	} else {
		fmt.Println("\nFCM Token: [Not set for this user yet]")
	}
	fmt.Println("-------------------------------")
	fmt.Println("Notice how the password is not stored as plain text! It is a bcrypt hash.")
}
