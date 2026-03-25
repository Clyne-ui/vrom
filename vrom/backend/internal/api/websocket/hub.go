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

	// Topic subscription requests
	Subscribe   chan *TopicAction
	Unsubscribe chan *TopicAction

	// Redis connection for cross-server pub/sub
	RedisClient *redis.Client

	// Topic-based subscriptions
	TopicClients map[string]map[*Client]bool
}

// GlobalHub allows cross-package access to push realtime events
var GlobalHub *Hub

// NotificationMessage represents a cross-server message.
type NotificationMessage struct {
	TargetUserID string      `json:"target_user_id"`
	Payload      interface{} `json:"payload"`
}

// TopicAction represents a request to join or leave a broadcast topic.
type TopicAction struct {
	Client *Client
	Topic  string
}

// NewHub creates and returns a new Hub
func NewHub(redisAddr string) *Hub {
	rdb := redis.NewClient(&redis.Options{
		Addr: redisAddr, // e.g. "localhost:6379"
	})

	GlobalHub = &Hub{
		Broadcast:   make(chan []byte),
		Register:     make(chan *Client),
		Unregister:   make(chan *Client),
		Subscribe:    make(chan *TopicAction),
		Unsubscribe:  make(chan *TopicAction),
		Clients:      make(map[string]map[*Client]bool),
		TopicClients: make(map[string]map[*Client]bool),
		RedisClient:  rdb,
	}
	return GlobalHub
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
				
				// Also remove from all topics
				for topic := range h.TopicClients {
					delete(h.TopicClients[topic], client)
				}
				
				log.Printf("WS Client Unregistered: UserID=%s", client.UserID)
			}

		case action := <-h.Subscribe:
			if h.TopicClients[action.Topic] == nil {
				h.TopicClients[action.Topic] = make(map[*Client]bool)
			}
			h.TopicClients[action.Topic][action.Client] = true
			log.Printf("Client subscribed to topic: %s (User: %s)", action.Topic, action.Client.UserID)

		case action := <-h.Unsubscribe:
			if _, ok := h.TopicClients[action.Topic][action.Client]; ok {
				delete(h.TopicClients[action.Topic], action.Client)
				if len(h.TopicClients[action.Topic]) == 0 {
					delete(h.TopicClients, action.Topic)
				}
				log.Printf("Client unsubscribed from topic: %s", action.Topic)
			}
		}
	}
}

// BroadcastToTopic sends a message to all users subscribed to a specific topic across the cluster.
func (h *Hub) BroadcastToTopic(ctx context.Context, topic string, payload interface{}) error {
	msg := NotificationMessage{
		TargetUserID: "__TOPIC__:" + topic,
		Payload:      payload,
	}
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return h.RedisClient.Publish(ctx, "vrom_notifications", data).Err()
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

		// 1. TOPIC BROADCAST
		if len(notification.TargetUserID) > 8 && notification.TargetUserID[:9] == "__TOPIC__:" {
			topic := notification.TargetUserID[9:]
			if topicClients, ok := h.TopicClients[topic]; ok {
				payloadBytes, _ := json.Marshal(notification.Payload)
				for client := range topicClients {
					select {
					case client.Send <- payloadBytes:
					default:
						// Clean up stale client
						delete(h.TopicClients[topic], client)
					}
				}
			}
			continue
		}

		// 2. TARGETED USER MESSAGE
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
