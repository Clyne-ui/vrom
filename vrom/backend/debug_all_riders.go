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

    query := `
        SELECT u.full_name, u.email, r.status, r.last_lat, r.last_lng 
        FROM rider_profiles r 
        JOIN users u ON r.rider_id = u.user_id`
    
    rows, err := db.Query(query)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    fmt.Println("ALL RIDER PROFILES IN DB:")
    for rows.Next() {
        var name, email, status string
        var lat, lng float64
        rows.Scan(&name, &email, &status, &lat, &lng)
        fmt.Printf("- %s (%s) | Status: [%s] | Location: %f, %f\n", name, email, status, lat, lng)
    }
}
