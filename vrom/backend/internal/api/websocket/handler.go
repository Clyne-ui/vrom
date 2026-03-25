package websocket

import (
	"log"
	"net/http"
	"vrom-backend/internal/services"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Important for a public API: restrict this in production!
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	tokenString := r.URL.Query().Get("token")
	userID := "anonymous"

	if tokenString != "" && tokenString != "undefined" {
		claims, err := services.ValidateToken(tokenString)
		if err == nil {
			userID = claims.UserID
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS: Upgrade failed for %s: %v", userID, err)
		return
	}
	log.Printf("WS: Upgrade SUCCESS for %s", userID)

	client := &Client{
		Hub:    hub,
		UserID: userID,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}
	client.Hub.Register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.WritePump()
	go client.ReadPump()
}
