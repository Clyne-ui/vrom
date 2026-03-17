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

	// Move John Ridr (rider@vrm.com) to Nairobi city center
    // ID: 547a304b-ffce-4c48-881f-bd19a607c646
	query := `UPDATE rider_profiles 
	          SET current_location = ST_SetSRID(ST_MakePoint(36.817223, -1.286389), 4326), 
	              is_available = true 
	          WHERE rider_id = '547a304b-ffce-4c48-881f-bd19a607c646'`
	
	res, err := db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}

	rows, _ := res.RowsAffected()
	fmt.Printf("Updated %d rider(s) location to Nairobi.\n", rows)
}
