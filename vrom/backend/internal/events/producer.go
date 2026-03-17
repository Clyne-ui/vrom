package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

var Writer *kafka.Writer

// InitKafkaWriter initializes the global Kafka writer
func InitKafkaWriter(broker, topic string) {
	Writer = &kafka.Writer{
		Addr:     kafka.TCP(broker),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
	}
}

// PublishTransactionEvent sends a transaction message to Kafka with metadata (H3 or payment type)
func PublishTransactionEvent(userID string, amount float64, metadata string) {
	if Writer == nil {
		return
	}

	event := map[string]interface{}{
		"transaction_id": fmt.Sprintf("tx-%d", time.Now().UnixNano()),
		"user_id":        userID,
		"amount":         amount,
		"metadata":       metadata, // H3 index or payment type
		"timestamp":      time.Now().Unix() * 1000, // Milliseconds for Flink compat
	}

	messageBytes, _ := json.Marshal(event)
	err := Writer.WriteMessages(context.Background(),
		kafka.Message{
			Key:   []byte(userID),
			Value: messageBytes,
		},
	)
	if err != nil {
		log.Printf("⚠️ Kafka Publish Error: %v", err)
	} else {
		fmt.Printf("📡 Kafka: Transaction event published for user %s\n", userID)
	}
}
