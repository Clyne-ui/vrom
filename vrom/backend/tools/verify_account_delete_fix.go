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

	email := "delete_test@vrom.com"
	fmt.Printf("🧪 Starting Verification for Account Deletion: %s\n", email)

	// 1. Ensure clean state
	db.Exec("DELETE FROM users WHERE email = $1", email)

	// 2. Create User
	var userID string
	err = db.QueryRow("INSERT INTO users (full_name, email, phone_number, password_hash, role) VALUES ('Delete Test', $1, '0999000999', 'hash', 'customer') RETURNING user_id", email).Scan(&userID)
	if err != nil {
		log.Fatalf("❌ Failed to create user: %v", err)
	}
	fmt.Printf("✅ User created: %s\n", userID)

	// 3. Add Activity
	_, err = db.Exec("INSERT INTO user_activities (user_id, activity_type, description, amount) VALUES ($1, 'test', 'Test Activity', 0)", userID)
	if err != nil {
		log.Fatalf("❌ Failed to add activity: %v", err)
	}
	fmt.Println("✅ Activity added for user.")

	// 4. Delete User (This should now trigger CASCADE)
	result, err := db.Exec("DELETE FROM users WHERE user_id = $1", userID)
	if err != nil {
		log.Fatalf("❌ DELETE FAILED: %v (This confirms the FIX is NOT working)", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		log.Fatal("❌ No rows affected in DELETE")
	}
	fmt.Println("✅ DELETE SUCCESSFUL! foreign key constraint was handled by CASCADE.")

	// 5. Verify Activity is also gone
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM user_activities WHERE user_id = $1", userID).Scan(&count)
	if err != nil {
		log.Fatal(err)
	}

	if count != 0 {
		log.Fatalf("❌ Activity was NOT deleted. Found %d records remaining.", count)
	}
	fmt.Println("🎉 VERIFICATION COMPLETE: Both User and Activities were successfully purged.")
}
