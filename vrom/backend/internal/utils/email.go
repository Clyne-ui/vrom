package utils

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
)

// SendEmail shoots a message out via SMTP (works perfectly with a Gmail App Password).
func SendEmail(to string, subject string, body string) {
	smtpHost := os.Getenv("SMTP_HOST") // e.g. "smtp.gmail.com"
	smtpPort := os.Getenv("SMTP_PORT") // e.g. "587"
	from := os.Getenv("SMTP_USER")     // e.g. "youremail@gmail.com"
	password := os.Getenv("SMTP_PASSWORD")

	if smtpHost == "" || from == "" || password == "" {
		log.Printf("⚠️ SMTP Not Configured in .env file. Email intended for %s (Subject: %s) was blocked.", to, subject)
		log.Printf("   Body preview: %s", body)
		return
	}

	message := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s\r\n", to, subject, body))
	auth := smtp.PlainAuth("", from, password, smtpHost)

	address := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	err := smtp.SendMail(address, auth, from, []string{to}, message)
	if err != nil {
		log.Printf("❌ Failed to send email to %s: %v", to, err)
		return
	}

	log.Printf("📧 Live Email successfully sent to %s", to)
}
