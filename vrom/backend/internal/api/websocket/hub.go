package websocket

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
)

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	// Registered clients mapped by UserID. A user could have multiple devices.
	Clients map[string]map[*Client]bool

	// Inbound messages from the clients.
	Broadcast chan []byte

	// Register requests from the clients.
	Register chan *Client

	// Unregister requests from clients.
	Unregister chan *Client

	// Redis connection for cross-server pub/sub
	RedisClient *redis.Client
}

// NotificationMessage represents a cross-server message.
type NotificationMessage struct {
	TargetUserID string      `json:"target_user_id"`
	Payload      interface{} `json:"payload"`
}

func NewHub(redisURL string) *Hub {
	rdb := redis.NewClient(&redis.Options{
		Addr: redisURL, // e.g. "localhost:6379"
	})

	return &Hub{
		Broadcast:   make(chan []byte),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		Clients:     make(map[string]map[*Client]bool),
		RedisClient: rdb,
	}
}

// Run starts the Hub's main loop to handle registrations and cross-server Redis messages.
func (h *Hub) Run() {
	// 1. Start Redis Subscriber in a separate goroutine
	go h.listenToRedis()

	// 2. Main Hub Loop for local connections
	for {
		select {
		case client := <-h.Register:
			if h.Clients[client.UserID] == nil {
				h.Clients[client.UserID] = make(map[*Client]bool)
			}
			h.Clients[client.UserID][client] = true
			log.Printf("WS Client Registered: Host=%s UserID=%s", client.Conn.RemoteAddr(), client.UserID)

		case client := <-h.Unregister:
			if _, ok := h.Clients[client.UserID][client]; ok {
				delete(h.Clients[client.UserID], client)
				close(client.Send)
				if len(h.Clients[client.UserID]) == 0 {
					delete(h.Clients, client.UserID)
				}
				log.Printf("WS Client Unregistered: UserID=%s", client.UserID)
			}
		}
	}
}

// SendToUser triggers a message to be sent to a specific user, regardless of which Go server they are on.
func (h *Hub) SendToUser(ctx context.Context, userID string, payload interface{}) error {
	msg := NotificationMessage{
		TargetUserID: userID,
		Payload:      payload,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	
	// Publish to Redis so all Go servers receive it
	return h.RedisClient.Publish(ctx, "vrom_notifications", data).Err()
}

// listenToRedis listens for messages published by ANY Go server and delivers them to local clients.
func (h *Hub) listenToRedis() {
	ctx := context.Background()
	pubsub := h.RedisClient.Subscribe(ctx, "vrom_notifications")
	defer pubsub.Close()

	ch := pubsub.Channel()

	for msg := range ch {
		var notification NotificationMessage
		if err := json.Unmarshal([]byte(msg.Payload), &notification); err != nil {
			log.Printf("Error unmarshalling redis message: %v", err)
			continue
		}

		// Check if the target user is connected to THIS specific Go server instance
		if userClients, ok := h.Clients[notification.TargetUserID]; ok {
			payloadBytes, _ := json.Marshal(notification.Payload)
			
			// Send to all their connected devices on this server
			for client := range userClients {
				select {
				case client.Send <- payloadBytes:
				default:
					close(client.Send)
					delete(h.Clients[notification.TargetUserID], client)
					if len(h.Clients[notification.TargetUserID]) == 0 {
						delete(h.Clients, notification.TargetUserID)
					}
				}
			}
		}
	}
}
