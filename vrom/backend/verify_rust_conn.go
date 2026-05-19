package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"vrom-backend/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	addr := "localhost:50051"
	fmt.Printf("🔍 VERIFYING CONNECTION: Testing gRPC connection to Rust Engine at %s...\n", addr)

	// 1. Establish connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, addr, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithBlock())
	if err != nil {
		log.Fatalf("❌ CONNECTION FAILED: Could not connect to Rust Engine: %v\n", err)
	}
	defer conn.Close()

	fmt.Println("✅ gRPC CHANNEL ESTABLISHED")

	// 2. Create Client
	client := pb.NewMatchingEngineClient(conn)

	// 3. Call GetNearby (Test Request)
	fmt.Println("📡 SENDING TEST REQUEST: GetNearby(lat: -1.286389, lng: 36.817222)...")
	resp, err := client.GetNearby(ctx, &pb.NearbyRequest{
		Lat:      -1.286389,
		Lng:      36.817222,
		RadiusKm: 5,
	})

	if err != nil {
		log.Fatalf("❌ REQUEST FAILED: Matching Engine returned error: %v\n", err)
	}

	fmt.Printf("✅ SUCCESS! Matching Engine responded: %v\n", resp)
	fmt.Println("📍 Result: Received H3 Index", resp.H3Index)
	for _, entity := range resp.Entities {
		fmt.Printf("   - Found Entity: %s at distance %.2fkm\n", entity.Id, entity.DistanceKm)
	}
}
