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

const baseURL = "http://localhost:8080"

func main() {
	fmt.Println("🔍 Starting State Machine Transition Verification...")

	// Case 1: Attempt to complete a trip that is NOT in 'picked_up' status
	// (Assuming there was a trip created but not started)
	fmt.Println("\n🧪 Test 1: Complete trip without starting (forbidden state jump)")
	testInvalidTripCompletion()

	// Case 2: Attempt to complete an order with WRONG OTP
	fmt.Println("\n🧪 Test 2: Complete order with WRONG OTP (security check)")
	testInvalidOrderOTP()
}

func testInvalidTripCompletion() {
	// We use a dummy ID or a known non-start ID
	reqBody, _ := json.Marshal(map[string]string{
		"trip_id": "00000000-0000-0000-0000-000000000000", 
		"otp": "0000",
	})
	
	req, _ := http.NewRequest("POST", baseURL+"/rider/complete", bytes.NewBuffer(reqBody))
	req.Header.Set("X-User-Email", "rider@vrom.com")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("Outcome: Expected failure, Got Status %d - %s\n", resp.StatusCode, string(body))
}

func testInvalidOrderOTP() {
	// Attempt to complete your last successful order with WRONG OTP
	// Using a fake ID first
	reqBody, _ := json.Marshal(map[string]string{
		"order_id": "0029a36a-5684-400a-8812-b945f1dccb83", 
		"otp": "9999", // Wrong OTP
	})
	
	req, _ := http.NewRequest("POST", baseURL+"/order/complete", bytes.NewBuffer(reqBody))
	req.Header.Set("X-User-Email", "rider@vrom.com")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("Outcome: Expected failure, Got Status %d - %s\n", resp.StatusCode, string(body))
}
