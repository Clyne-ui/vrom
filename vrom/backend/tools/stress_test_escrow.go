//go:build ignore

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
	"time"
)

const (
	baseURL      = "http://localhost:8080"
	buyerEmail   = "customer@vrom.com" // Ensure this user exists with balance
	productID    = "dac1c01f-7063-4bb1-a8cf-2c466d1cda34" // Kakamega Maize from previous test
	concurrentReq = 10
)

type OrderInput struct {
	ProductID   string  `json:"product_id"`
	Quantity    int     `json:"quantity"`
	DeliveryLat float64 `json:"delivery_lat"`
	DeliveryLng float64 `json:"delivery_lng"`
}

func main() {
	var wg sync.WaitGroup
	fmt.Printf("🚀 Starting Stress Test: %d concurrent orders for product %s\n", concurrentReq, productID)

	start := time.Now()

	for i := 0; i < concurrentReq; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			order := OrderInput{
				ProductID:   productID,
				Quantity:    1,
				DeliveryLat: -1.286,
				DeliveryLng: 36.817,
			}
			
			body, _ := json.Marshal(order)
			req, _ := http.NewRequest("POST", baseURL+"/order/create", bytes.NewBuffer(body))
			req.Header.Set("X-User-Email", buyerEmail)
			req.Header.Set("Content-Type", "application/json")

			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				fmt.Printf("❌ Request %d failed: %v\n", id, err)
				return
			}
			defer resp.Body.Close()

			respBody, _ := ioutil.ReadAll(resp.Body)
			if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
				fmt.Printf("✅ Request %d: SUCCESS\n", id)
			} else {
				fmt.Printf("⚠️ Request %d: FAILED (%d) - %s\n", id, resp.StatusCode, string(respBody))
			}
		}(i)
	}

	wg.Wait()
	fmt.Printf("\n⏱️ Stress Test completed in %v\n", time.Since(start))
}
