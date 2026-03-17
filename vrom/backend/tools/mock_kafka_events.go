//go:build ignore

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/segmentio/kafka-go"
)

// CustomerDemand represents a ride request event
type CustomerDemand struct {
	EventID   string  `json:"event_id"`
	UserID    string  `json:"user_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Timestamp int64   `json:"timestamp"`
	Geohash   string  `json:"geohash"`
}

// DriverSupply represents a driver location ping
type DriverSupply struct {
	EventID   string  `json:"event_id"`
	DriverID  string  `json:"driver_id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Timestamp int64   `json:"timestamp"`
	Geohash   string  `json:"geohash"`
}

func main() {
	fmt.Println("Starting Mock Kafka Events Producer...")

	// Create Kafka writers
	demandWriter := &kafka.Writer{
		Addr:     kafka.TCP("localhost:9092"),
		Topic:    "vrom.rides.requested",
		Balancer: &kafka.LeastBytes{},
	}

	supplyWriter := &kafka.Writer{
		Addr:     kafka.TCP("localhost:9092"),
		Topic:    "vrom.driver.locations",
		Balancer: &kafka.LeastBytes{},
	}

	defer demandWriter.Close()
	defer supplyWriter.Close()

	// Simulate producing events indefinitely
	ctx := context.Background()
	source := rand.NewSource(time.Now().UnixNano())
	random := rand.New(source)

	// We'll use a mocked Geohash for simplicity (e.g., region 'u1x')
	geohashes := []string{"u1x", "u1y", "u1z"}

	for {
		// 1. Generate Driver Supply
		supply := DriverSupply{
			EventID:   fmt.Sprintf("evt-ds-%d", random.Intn(100000)),
			DriverID:  fmt.Sprintf("driver-%d", random.Intn(100)),
			Lat:       -1.2921 + (random.Float64() * 0.01),
			Lng:       36.8219 + (random.Float64() * 0.01),
			Timestamp: time.Now().UnixMilli(),
			Geohash:   geohashes[random.Intn(len(geohashes))],
		}
		supplyBytes, _ := json.Marshal(supply)
		err := supplyWriter.WriteMessages(ctx, kafka.Message{
			Key:   []byte(supply.DriverID),
			Value: supplyBytes,
		})
		if err != nil {
			log.Printf("Failed to write supply: %v\n", err)
		} else {
			fmt.Printf("Produced DriverSupply -> %s\n", supply.Geohash)
		}

		// 2. Generate Customer Demand (slightly less frequent)
		if random.Float32() < 0.6 {
			demand := CustomerDemand{
				EventID:   fmt.Sprintf("evt-cd-%d", random.Intn(100000)),
				UserID:    fmt.Sprintf("user-%d", random.Intn(500)),
				Lat:       -1.2921 + (random.Float64() * 0.01),
				Lng:       36.8219 + (random.Float64() * 0.01),
				Timestamp: time.Now().UnixMilli(),
				Geohash:   geohashes[random.Intn(len(geohashes))],
			}
			demandBytes, _ := json.Marshal(demand)
			err = demandWriter.WriteMessages(ctx, kafka.Message{
				Key:   []byte(demand.UserID),
				Value: demandBytes,
			})
			if err != nil {
				log.Printf("Failed to write demand: %v\n", err)
			} else {
				fmt.Printf("Produced CustomerDemand -> %s\n", demand.Geohash)
			}
		}

		time.Sleep(1 * time.Second)
	}
}
