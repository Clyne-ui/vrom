//go:build ignore

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/segmentio/kafka-go"
)

// TransactionRequest matches the JSON from Postman
type TransactionRequest struct {
	TransactionID string  `json:"transaction_id"`
	UserID        string  `json:"user_id"`
	Amount        float64 `json:"amount"`
	Timestamp     int64   `json:"timestamp"`
}

func main() {
	// Initialize Kafka Writer for fraud check topic
	kafkaWriter := &kafka.Writer{
		Addr:     kafka.TCP("localhost:9092"),
		Topic:    "vrom.transactions.fraud_check",
		Balancer: &kafka.LeastBytes{},
	}
	defer kafkaWriter.Close()

	// Setup HTTP handler
	http.HandleFunc("/mock-transaction", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
			return
		}

		var req TransactionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid Request Body", http.StatusBadRequest)
			return
		}

		// Prepare message for Kafka
		messageBytes, err := json.Marshal(req)
		if err != nil {
			http.Error(w, "Failed to marshal JSON", http.StatusInternalServerError)
			return
		}

		// Write to Kafka
		err = kafkaWriter.WriteMessages(context.Background(),
			kafka.Message{
				Key:   []byte(req.UserID), // Key by User ID so Flink routes to the same node
				Value: messageBytes,
			},
		)
		if err != nil {
			log.Printf("Failed to write to Kafka: %v", err)
			http.Error(w, "Failed to send to Kafka broker", http.StatusInternalServerError)
			return
		}

		fmt.Printf("Produced transaction for %s\n", req.UserID)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "Accepted",
			"message": "Transaction routed to Kafka for processing",
		})
	})

	fmt.Println("🚀 Postman-to-Kafka Proxy Server running on port :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
