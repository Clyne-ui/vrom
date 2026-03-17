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

	rows, err := db.Query(`
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public'`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var tableName string
		rows.Scan(&tableName)
		fmt.Printf("\n--- Table: %s ---\n", tableName)

		cols, err := db.Query(fmt.Sprintf(`
			SELECT column_name, data_type 
			FROM information_schema.columns 
			WHERE table_name = '%s'`, tableName))
		if err != nil {
			log.Fatal(err)
		}
		for cols.Next() {
			var colName, dataType string
			cols.Scan(&colName, &dataType)
			fmt.Printf("- %s (%s)\n", colName, dataType)
		}
		cols.Close()
	}
}
