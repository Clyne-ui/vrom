package repository

import (
	"database/sql"
	"fmt"
	"vrom-backend/internal/models"

	"github.com/google/uuid"
)

// CreateRegion inserts a new region.
func CreateRegion(db *sql.DB, r models.Region) (models.Region, error) {
	r.ID = uuid.New().String()
	r.Status = "active"

	_, err := db.Exec(
		`INSERT INTO regions (id, name, country, currency, lat, lng, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		r.ID, r.Name, r.Country, r.Currency, r.Lat, r.Lng, r.Status,
	)
	if err != nil {
		return r, fmt.Errorf("createRegion: %w", err)
	}
	return r, nil
}

// GetRegions fetches all active regions.
func GetRegions(db *sql.DB) ([]models.Region, error) {
	rows, err := db.Query(
		`SELECT id, name, country, currency, lat, lng, status, created_at FROM regions ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Region
	for rows.Next() {
		var r models.Region
		if err := rows.Scan(&r.ID, &r.Name, &r.Country, &r.Currency, &r.Lat, &r.Lng, &r.Status, &r.CreatedAt); err != nil {
			continue
		}
		list = append(list, r)
	}
	return list, nil
}
