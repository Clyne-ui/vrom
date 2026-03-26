package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"vrom-backend/internal/models"
)

// CreateNotification inserts a new notification into the database.
func CreateNotification(db *sql.DB, notifType, title, message string) (models.SystemNotification, error) {
	n := models.SystemNotification{
		ID:        uuid.New().String(),
		Type:      notifType,
		Title:     title,
		Message:   message,
		Read:      false,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	_, err := db.Exec(
		`INSERT INTO system_notifications (id, type, title, message, read, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
		n.ID, n.Type, n.Title, n.Message, n.Read, n.CreatedAt,
	)
	if err != nil {
		return n, fmt.Errorf("createNotification: %w", err)
	}
	return n, nil
}

// GetNotifications returns all notifications, newest first.
func GetNotifications(db *sql.DB) ([]models.SystemNotification, error) {
	rows, err := db.Query(
		`SELECT id, type, title, message, read, created_at FROM system_notifications ORDER BY created_at DESC LIMIT 100`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.SystemNotification
	for rows.Next() {
		var n models.SystemNotification
		if err := rows.Scan(&n.ID, &n.Type, &n.Title, &n.Message, &n.Read, &n.CreatedAt); err != nil {
			continue
		}
		list = append(list, n)
	}
	return list, nil
}

// MarkNotificationRead marks a single notification as read.
func MarkNotificationRead(db *sql.DB, id string) error {
	_, err := db.Exec(`UPDATE system_notifications SET read = TRUE WHERE id = $1`, id)
	return err
}

// MarkAllNotificationsRead marks ALL notifications as read.
func MarkAllNotificationsRead(db *sql.DB) error {
	_, err := db.Exec(`UPDATE system_notifications SET read = TRUE`)
	return err
}

// DeleteNotification removes a single notification by ID.
func DeleteNotification(db *sql.DB, id string) error {
	_, err := db.Exec(`DELETE FROM system_notifications WHERE id = $1`, id)
	return err
}

// ClearAllNotifications removes every notification from the database.
func ClearAllNotifications(db *sql.DB) error {
	_, err := db.Exec(`DELETE FROM system_notifications`)
	return err
}
