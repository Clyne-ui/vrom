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

    rows, err := db.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    fmt.Println("TABLES IN DB:")
    for rows.Next() {
        var name string
        rows.Scan(&name)
        fmt.Printf("- %s\n", name)
    }
}
