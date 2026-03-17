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

	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}

	// 1. Create default shops for sellers who don't have one
	fmt.Println("Ensuring default shops exist...")
	insertShops := `
		INSERT INTO shops (seller_id, shop_name, shop_location)
		SELECT seller_id, business_name, shop_location 
		FROM seller_profiles s
		WHERE NOT EXISTS (SELECT 1 FROM shops sh WHERE sh.seller_id = s.seller_id)
		ON CONFLICT DO NOTHING`
	_, err = tx.Exec(insertShops)
	if err != nil {
		tx.Rollback()
		log.Fatalf("Failed to create default shops: %v", err)
	}

	// 2. Link orphaned products to the seller's first shop
	fmt.Println("Linking products to default shops...")
	linkProducts := `
		UPDATE products p
		SET shop_id = (SELECT shop_id FROM shops s WHERE s.seller_id = p.seller_id LIMIT 1)
		WHERE p.shop_id IS NULL`
	_, err = tx.Exec(linkProducts)
	if err != nil {
		tx.Rollback()
		log.Fatalf("Failed to link products: %v", err)
	}

	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Database cleanup successful! All products are now branch-aware.")
}
