package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type PaystackInitResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		AuthorizationURL string `json:"authorization_url"`
		AccessCode       string `json:"access_code"`
		Reference        string `json:"reference"`
	} `json:"data"`
}

type PaystackVerifyResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		ID        int    `json:"id"`
		Status    string `json:"status"`
		Reference string `json:"reference"`
		Amount    int    `json:"amount"` // In kobo/cents
		Currency  string `json:"currency"`
	} `json:"data"`
}

// InitializePayment calls Paystack to get a checkout URL.
func InitializePayment(email string, amount float64) (*PaystackInitResponse, error) {
	secretKey := os.Getenv("PAYSTACK_SECRET_KEY")
	if secretKey == "" {
		// FALLBACK: Mock for local testing
		return &PaystackInitResponse{
			Status: true,
			Data: struct {
				AuthorizationURL string `json:"authorization_url"`
				AccessCode       string `json:"access_code"`
				Reference        string `json:"reference"`
			}{
				AuthorizationURL: fmt.Sprintf("https://paystack.test/checkout/%s", email),
				Reference:        "test_ref_" + email,
			},
		}, nil
	}

	url := "https://api.paystack.co/transaction/initialize"
	
	// Paystack expects amount in Kobo (KES * 100)
	payload := map[string]interface{}{
		"email":  email,
		"amount": int(amount * 100),
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+secretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result PaystackInitResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// VerifyPayment checks the status of a Paystack transaction.
func VerifyPayment(reference string) (*PaystackVerifyResponse, error) {
	secretKey := os.Getenv("PAYSTACK_SECRET_KEY")
	if secretKey == "" {
		// FALLBACK: Mock for local testing (always success for mock refs)
		return &PaystackVerifyResponse{
			Status: true,
			Data: struct {
				ID        int    `json:"id"`
				Status    string `json:"status"`
				Reference string `json:"reference"`
				Amount    int    `json:"amount"`
				Currency  string `json:"currency"`
			}{
				Status: "success",
				Reference: reference,
			},
		}, nil
	}

	url := fmt.Sprintf("https://api.paystack.co/transaction/verify/%s", reference)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+secretKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result PaystackVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// VerifyWebhookSignature validates the Paystack HMAC signature
func VerifyWebhookSignature(signature string, body []byte) bool {
	secretKey := os.Getenv("PAYSTACK_SECRET_KEY")
	if secretKey == "" {
		return true // Allow in mock mode
	}

	h := hmac.New(sha512.New, []byte(secretKey))
	h.Write(body)
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	return signature == expectedSignature
}
