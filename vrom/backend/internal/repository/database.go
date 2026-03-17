package repository

import (
	"database/sql"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// ConnectDB initializes the database connection
func ConnectDB(connStr string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// High-Scale Connection Pooling configuration
	db.SetMaxOpenConns(100)          // Max concurrent connections
	db.SetMaxIdleConns(50)           // Max idle connections in the pool
	db.SetConnMaxLifetime(time.Hour) // Max time a connection can be reused

	if err := db.Ping(); err != nil {
		return nil, err
	}

	DB = db
	return db, nil
}
