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

	fmt.Println("--- PRODUCTS ---")
	rows, _ := db.Query("SELECT product_id, title, seller_id FROM products")
	for rows.Next() {
		var id, title, sid string
		rows.Scan(&id, &title, &sid)
		fmt.Printf("ID: %s | Title: %s | SellerID: %s\n", id, title, sid)
	}

	fmt.Println("\n--- SELLER PROFILES ---")
	rows, _ = db.Query("SELECT seller_id, shop_name, ST_AsText(shop_location) FROM seller_profiles")
	for rows.Next() {
		var sid, name, loc sql.NullString
		rows.Scan(&sid, &name, &loc)
		fmt.Printf("SellerID: %s | Name: %s | Location: %s\n", sid.String, name.String, loc.String)
	}
}
