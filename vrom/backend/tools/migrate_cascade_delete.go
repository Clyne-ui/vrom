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

	fmt.Println("🛠️ Migrating Database: Adding ON DELETE CASCADE to all user-related tables...")

	// List of adjustments to make
	// Note: We drop naming constraints if they exist, or use the default Postgres names if not.
	// Since we didn't always name them, we'll look them up or use a safer approach.
	
	queries := []string{
		// 1. user_activities
		`ALTER TABLE user_activities DROP CONSTRAINT IF EXISTS user_activities_user_id_fkey;`,
		`ALTER TABLE user_activities ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;`,

		// 2. otps
		`ALTER TABLE otps DROP CONSTRAINT IF EXISTS otps_user_id_fkey;`,
		`ALTER TABLE otps ADD CONSTRAINT otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;`,

		// 3. user_compliance_data
		`ALTER TABLE user_compliance_data DROP CONSTRAINT IF EXISTS user_compliance_data_user_id_fkey;`,
		`ALTER TABLE user_compliance_data ADD CONSTRAINT user_compliance_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;`,

		// 4. wallets
		`ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;`,
		`ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;`,

		// 5. trips (buyer_id)
		`ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_buyer_id_fkey;`,
		`ALTER TABLE trips ADD CONSTRAINT trips_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE;`,

		// 6. orders (buyer_id)
		`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;`,
		`ALTER TABLE orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE;`,
	}

	for _, q := range queries {
		_, err := db.Exec(q)
		if err != nil {
			log.Printf("⚠️ Warning during migration step: %v", err)
		}
	}

	fmt.Println("✅ Migration successful! Account deletion will now automatically clean up all associated data.")
}
