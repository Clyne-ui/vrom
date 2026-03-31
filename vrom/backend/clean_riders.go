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

    res, err := db.Exec("UPDATE rider_profiles SET is_available = false WHERE TRIM(LOWER(status::text)) = 'offline'")
    if err != nil {
        log.Fatal(err)
    }
    
    rows, _ := res.RowsAffected()
    fmt.Printf("✅ DB CLEANUP COMPLETE: Synchronized %d riders to unavailable (offline).\n", rows)
}
