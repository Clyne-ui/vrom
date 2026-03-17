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

	var exists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops')").Scan(&exists)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Shops table exists: %v\n", exists)

	if exists {
		rows, _ := db.Query("SELECT column_name FROM information_schema.columns WHERE table_name = 'shops'")
		fmt.Println("Columns in shops:")
		for rows.Next() {
			var name string
			rows.Scan(&name)
			fmt.Println("-", name)
		}
		rows.Close()
	}
}
