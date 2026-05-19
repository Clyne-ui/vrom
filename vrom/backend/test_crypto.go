package main

import (
	"fmt"
	"log"
	"os"
	"vrom-backend/internal/utils"
)

func main() {
	// Set the environment variable just for this test script
	os.Setenv("ENCRYPTION_KEY", "a7f3e8b945d1c2a0f8b7e6d5c4b3a291f0e9d8c7b6a594837261504f3e2d1c0b")

	originalText := "sample-fcm-token-1234567890"
	fmt.Printf("Original Text: %s\n", originalText)

	// Encrypt
	encrypted, err := utils.EncryptAES(originalText)
	if err != nil {
		log.Fatalf("Encryption failed: %v", err)
	}
	fmt.Printf("Encrypted (Ciphertext): %s\n", encrypted)

	// Decrypt
	decrypted, err := utils.DecryptAES(encrypted)
	if err != nil {
		log.Fatalf("Decryption failed: %v", err)
	}
	fmt.Printf("Decrypted Text: %s\n", decrypted)

	if originalText == decrypted {
		fmt.Println("\n✅ SUCCESS: Decrypted text matches the original text!")
	} else {
		fmt.Println("\n❌ ERROR: Decrypted text does NOT match the original text!")
	}
}
