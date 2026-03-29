package http

import (
	"context"
	"database/sql"
	"fmt"
	"vrom-backend/internal/api/websocket"
	"vrom-backend/internal/models"
	"vrom-backend/internal/repository"
)

// BroadcastOCCFleetUpdate fetches the current active trips and idle riders and broadcasts them to the "fleet" topic.
func BroadcastOCCFleetUpdate(db *sql.DB) {
	if websocket.GlobalHub == nil {
		return
	}

	trips, err := repository.GetAllActiveTrips(db)
	if err != nil {
		fmt.Printf("⚠️  Broadcast Error: Failed to fetch active fleet: %v\n", err)
		return
	}

	idle, err := repository.GetIdleRiders(db)
	if err != nil {
		fmt.Printf("⚠️  Broadcast Warning: Failed to fetch idle riders: %v\n", err)
		idle = []models.IdleRider{}
	}

	payload := models.LiveFleetResponse{
		ActiveTrips: trips,
		IdleRiders:  idle,
		Hotspots:    []interface{}{},
	}

	websocket.GlobalHub.BroadcastToTopic(context.Background(), "fleet", payload)
}
