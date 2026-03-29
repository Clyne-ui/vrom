package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/models"
	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgres://postgres:37877975123@127.0.0.1:3000/Vromdatabase?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	idle, err := repository.GetIdleRiders(db)
	if err != nil {
		fmt.Printf("GetIdleRiders error: %v\n", err)
	}
	
	resp := models.LiveFleetResponse{
		IdleRiders: idle,
	}
	
	data, _ := json.MarshalIndent(resp, "", "  ")
	fmt.Printf("RESULT: %s\n", string(data))
}
