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

	res, err := db.Exec("DELETE FROM trips WHERE rider_id = '547a304b-ffce-4c48-881f-bd19a607c646' AND status IN ('pending', 'accepted', 'picked_up')")
	if err != nil {
		log.Fatal(err)
	}
	count, _ := res.RowsAffected()
	fmt.Printf("Successfully deleted %d ghost trips. The rider is now officially IDLE!\n", count)
}
