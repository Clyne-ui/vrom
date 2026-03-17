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

	fmt.Println("Migrating database for Product Categories...")

	queries := []string{
		`CREATE TABLE IF NOT EXISTS categories (
			category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			icon_url TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`,
		`ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(category_id)`,
	}

	for _, q := range queries {
		_, err := tx.Exec(q)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Migration failed on query [%s]: %v", q, err)
		}
	}

	// Seed default categories
	fmt.Println("Seeding default categories...")
	defaultCategories := []string{"Electronics", "Food & Drinks", "Fashion", "Pharmacy", "Groceries", "Home & Living"}
	for _, cat := range defaultCategories {
		_, err = tx.Exec("INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", cat)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Failed to seed category %s: %v", cat, err)
		}
	}

	// Link existing products to a default category (e.g., Electronics or General)
	_, err = tx.Exec("UPDATE products SET category_id = (SELECT category_id FROM categories WHERE name = 'Electronics' LIMIT 1) WHERE category_id IS NULL")
	if err != nil {
		tx.Rollback()
		log.Fatalf("Failed to link products to default category: %v", err)
	}

	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Migration successful! Product Categorization is ready.")
}
