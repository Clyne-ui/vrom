package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
)

type CloudinaryResponse struct {
	SecureURL string `json:"secure_url"`
	PublicID  string `json:"public_id"`
}

// UploadToCloudinary uploads a file to Cloudinary and returns the secure URL.
// It requires CLOUDINARY_URL to be set in environment variables.
func UploadToCloudinary(file io.Reader, filename string) (string, error) {
	cloudinaryURL := os.Getenv("CLOUDINARY_URL")
	if cloudinaryURL == "" {
		// FALLBACK: If no Cloudinary URL, we return a mock URL for testing.
		return fmt.Sprintf("https://vrom.test/uploads/mock_%s", filename), nil
	}

	// Cloudinary upload endpoint: https://api.cloudinary.com/v1_1/<cloud_name>/image/upload
	// We'll parse the URL or use a simple env var for Cloud Name.
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	if cloudName == "" {
		return "", fmt.Errorf("CLOUDINARY_CLOUD_NAME not set")
	}

	uploadPreset := os.Getenv("CLOUDINARY_UPLOAD_PRESET")
	if uploadPreset == "" {
		uploadPreset = "vrom_unsigned" // Default preset for unsigned uploads
	}

	url := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", cloudName)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	// Add file
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	_, err = io.Copy(part, file)
	if err != nil {
		return "", err
	}

	// Add upload preset (required for unsigned uploads)
	writer.WriteField("upload_preset", uploadPreset)
	writer.Close()

	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("cloudinary upload failed: %s", string(respBody))
	}

	var result CloudinaryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.SecureURL, nil
}
