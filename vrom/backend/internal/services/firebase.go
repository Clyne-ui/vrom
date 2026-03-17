package services

import (
	"context"
	"fmt"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

var FCMClient *messaging.Client

// InitFirebase initializes the Firebase Admin SDK using a service account JSON file.
// The credentialsFile path should point to the JSON downloaded from the Firebase Console.
func InitFirebase(credentialsFile string) error {
	ctx := context.Background()
	opt := option.WithCredentialsFile(credentialsFile)
	
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return fmt.Errorf("error initializing app: %v", err)
	}

	// Get a messaging client
	client, err := app.Messaging(ctx)
	if err != nil {
		return fmt.Errorf("error getting Messaging client: %v", err)
	}

	FCMClient = client
	log.Println("🔥 Firebase Cloud Messaging Initialized")
	return nil
}

// SendPushNotification sends an FCM message to a specific device token.
func SendPushNotification(ctx context.Context, deviceToken, title, body string, data map[string]string) error {
	if FCMClient == nil {
		return fmt.Errorf("firebase not initialized")
	}

	message := &messaging.Message{
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data:  data, // Optional key-value pairs for the app to handle silently
		Token: deviceToken,
	}

	// Send a message to the device corresponding to the provided registration token.
	response, err := FCMClient.Send(ctx, message)
	if err != nil {
		log.Printf("Failure sending FCM message: %v", err)
		return err
	}
	
	log.Printf("Successfully sent FCM message: %v", response)
	return nil
}
