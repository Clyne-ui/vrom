package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
)

func main() {
	writer := &kafka.Writer{
		Addr:     kafka.TCP("localhost:9092"),
		Topic:    "vrom.transactions.fraud_check",
		Balancer: &kafka.LeastBytes{},
	}
	defer writer.Close()

	userID := "52edcb44-00f3-4e1d-beea-11cdc11364c2"

	// 1. Send first transaction (Nairobi center)
	msg1 := map[string]interface{}{
		"transaction_id": "tx-1",
		"user_id":        userID,
		"amount":         100.0,
		"lat":            -1.286389,
		"lng":            36.817223,
		"timestamp":      time.Now().Unix() * 1000,
	}
	b1, _ := json.Marshal(msg1)
	writer.WriteMessages(context.Background(), kafka.Message{Value: b1})
	fmt.Println("🚀 Sent Tx 1 (Nairobi)")

	// 2. Send second transaction (Mombasa - ~480km away) immediately
	// This should trigger GPS_SPOOFING because speed > 300 kph
	msg2 := map[string]interface{}{
		"transaction_id": "tx-2",
		"user_id":        userID,
		"amount":         100.0,
		"lat":            -4.043477,
		"lng":            39.668205,
		"timestamp":      (time.Now().Unix() + 10) * 1000, // 10 seconds later
	}
	b2, _ := json.Marshal(msg2)
	writer.WriteMessages(context.Background(), kafka.Message{Value: b2})
	fmt.Println("🚀 Sent Tx 2 (Mombasa - 480km away after 10s)")

	fmt.Println("✅ Telemetry test completed. Check Flink logs for GPS_SPOOFING alerts.")
}
