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
	baseURL    = "http://localhost:8080"
	riderEmail = "rider@vrm.com"
)

func main() {
	fmt.Println("🚴 Updating Rider Rates...")

	reqBody, _ := json.Marshal(map[string]interface{}{
		"base_fare":    250.0, // High base fare for premium service
		"price_per_km": 60.0,  // Higher rate per km
	})

	req, _ := http.NewRequest("POST", baseURL+"/rider/rates/update", bytes.NewBuffer(reqBody))
	req.Header.Set("X-User-Email", riderEmail)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("❌ Request failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("Outcome: Status %d - %s\n", resp.StatusCode, string(body))
}
