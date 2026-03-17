package http

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
	"vrom-backend/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func HandleSupportChat(aiAddr string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Query string `json:"query"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		if email == "" {
			email = "anonymous"
		}

		// 1. Connect to AI Service
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		conn, err := grpc.NewClient(aiAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			http.Error(w, "AI Service Unavailable", http.StatusServiceUnavailable)
			return
		}
		defer conn.Close()

		client := pb.NewAIServiceClient(conn)

		// 2. Call SupportChat RPC
		resp, err := client.SupportChat(ctx, &pb.ChatRequest{
			UserId: email,
			Query:  req.Query,
		})

		if err != nil {
			http.Error(w, "AI failed to respond: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "Success",
			"response": resp.Response,
			"sources":  resp.Sources,
		})
	}
}

func HandlePredictETA(aiAddr string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			StartLat    float64 `json:"start_lat"`
			StartLng    float64 `json:"start_lng"`
			EndLat      float64 `json:"end_lat"`
			EndLng      float64 `json:"end_lng"`
			VehicleType string  `json:"vehicle_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		conn, err := grpc.NewClient(aiAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			http.Error(w, "AI Service Connection Error", http.StatusServiceUnavailable)
			return
		}
		defer conn.Close()

		client := pb.NewAIServiceClient(conn)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		resp, err := client.PredictETA(ctx, &pb.ETARequest{
			StartLat:    req.StartLat,
			StartLng:    req.StartLng,
			EndLat:      req.EndLat,
			EndLng:      req.EndLng,
			VehicleType: req.VehicleType,
		})

		if err != nil {
			http.Error(w, "ETA Prediction failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}
