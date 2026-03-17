//go:build ignore

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"
)

const (
	baseURL      = "http://localhost:8080"
	customerEmail = "customer@vrom.com"
)

func main() {
	fmt.Println("🚖 Simulating Ride Request...")

	reqBody, _ := json.Marshal(map[string]interface{}{
		"pickup_lat":  0.2820,
		"pickup_lng":  34.7510,
		"dropoff_lat": 0.2900,
		"dropoff_lng": 34.7600,
	})

	req, _ := http.NewRequest("POST", baseURL+"/ride/request", bytes.NewBuffer(reqBody))
	req.Header.Set("X-User-Email", customerEmail)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("Outcome: Status %d - %s\n", resp.StatusCode, string(body))
}
