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

	fmt.Println("Migrating database for Multi-Branch support...")

	queries := []string{
		`ALTER TABLE seller_profiles RENAME COLUMN shop_name TO business_name`,
		`ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS business_image_url TEXT`,
		`CREATE TABLE IF NOT EXISTS shops (
			shop_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			seller_id UUID REFERENCES seller_profiles(seller_id),
			shop_name TEXT NOT NULL,
			shop_image_url TEXT,
			shop_location GEOGRAPHY(POINT, 4326),
			shop_address TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(shop_id)`,
	}

	for _, q := range queries {
		_, err := tx.Exec(q)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Migration failed on query [%s]: %v", q, err)
		}
	}

	// DATA SAFETY: Create a default shop for each seller and link their products
	fmt.Println("Creating default shops for existing sellers...")
	insertShops := `
		INSERT INTO shops (seller_id, shop_name, shop_location)
		SELECT seller_id, business_name, shop_location FROM seller_profiles
		ON CONFLICT DO NOTHING`
	_, err = tx.Exec(insertShops)
	if err != nil {
		tx.Rollback()
		log.Fatalf("Failed to create default shops: %v", err)
	}

	fmt.Println("Linking existing products to default shops...")
	linkProducts := `
		UPDATE products p
		SET shop_id = s.shop_id
		FROM shops s
		WHERE p.seller_id = s.seller_id AND p.shop_id IS NULL`
	_, err = tx.Exec(linkProducts)
	if err != nil {
		tx.Rollback()
		log.Fatalf("Failed to link products: %v", err)
	}

	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Migration successful!")
}
