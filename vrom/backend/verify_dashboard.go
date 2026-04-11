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

	var gmv, commission, escrow float64
	var totalOrders, drivers int

	err = db.QueryRow(`
		SELECT 
			COALESCE((SELECT SUM(total_amount) FROM orders WHERE status NOT IN ('cancelled', 'rejected')), 0) + 
			COALESCE((SELECT SUM(actual_fare) FROM trips WHERE status NOT IN ('cancelled', 'rejected')), 0) AS gmv,
			
			COALESCE((SELECT SUM(total_amount * 0.10) FROM orders WHERE status NOT IN ('cancelled', 'rejected')), 0) + 
			COALESCE((SELECT SUM(actual_fare * 0.20) FROM trips WHERE status NOT IN ('cancelled', 'rejected')), 0) AS commission,
			
			COALESCE((SELECT SUM(locked_funds) FROM wallets), 0) AS escrow,
			(SELECT COUNT(*) FROM orders) AS total_orders,
			(SELECT COUNT(*) FROM users WHERE role = 'rider') AS drivers
	`).Scan(&gmv, &commission, &escrow, &totalOrders, &drivers)

	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("DB_GMV: %.2f\n", gmv)
	fmt.Printf("DB_COMMISSION: %.2f\n", commission)
	fmt.Printf("DB_ESCROW: %.2f\n", escrow)
	fmt.Printf("DB_ORDERS: %d\n", totalOrders)
	fmt.Printf("DB_DRIVERS: %d\n", drivers)
}
