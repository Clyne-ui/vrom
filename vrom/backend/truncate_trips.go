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

    res, err := db.Exec("TRUNCATE TABLE trips RESTART IDENTITY CASCADE")
    if err != nil {
        log.Fatal(err)
    }
    
    count, _ := res.RowsAffected()
    fmt.Printf("DATABASE WIPED: All old trips cleared (%d affected). Your map is now a fresh blackboard!\n", count)
}
