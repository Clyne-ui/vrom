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

	fmt.Println("🔍 Fetching Sample IDs for Postman Testing...")

	// 1. Get a Seller and their Shop
	var sellerEmail, shopID string
	err = db.QueryRow(`
		SELECT u.email, s.shop_id 
		FROM users u 
		JOIN shops s ON u.user_id = s.seller_id 
		WHERE u.role = 'seller' 
		LIMIT 1`).Scan(&sellerEmail, &shopID)
	
	if err != nil {
		fmt.Println("⚠️ No automated shop found. Looking for any seller...")
		err = db.QueryRow("SELECT email FROM users WHERE role = 'seller' LIMIT 1").Scan(&sellerEmail)
		if err != nil {
			log.Fatal("❌ No sellers found in database.")
		}
	}

	// 2. Get a Category
	var categoryID, categoryName string
	err = db.QueryRow("SELECT category_id, name FROM categories LIMIT 1").Scan(&categoryID, &categoryName)
	if err != nil {
		log.Fatal("❌ No categories found in database.")
	}

	fmt.Printf("\n✅ Ready to use IDs:\n")
	fmt.Printf("- Seller Email: %s\n", sellerEmail)
	fmt.Printf("- Shop ID: %s\n", shopID)
	fmt.Printf("- Category ID: %s (%s)\n", categoryID, categoryName)
}
