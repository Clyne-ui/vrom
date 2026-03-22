package services

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

var (
	jwtSecret   = []byte("vrom_at_least_32_characters_secret_key_2026")
	redisClient *redis.Client
)

// InitAuthService initializes the Redis connection for token revocation
func InitAuthService(rdb *redis.Client) {
	redisClient = rdb
}

type UserClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateTokens creates both an Access Token (15 mins) and a Refresh Token (7 days)
func GenerateTokens(userID, email, role string) (string, string, error) {
	// 1. Access Token
	accessClaims := &UserClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	signedAccess, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	// 2. Refresh Token
	refreshClaims := &jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Subject:   userID,
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	signedRefresh, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	return signedAccess, signedRefresh, nil
}

// ValidateToken parses and validates a JWT string, checking if it's blacklisted in Redis
func ValidateToken(tokenString string) (*UserClaims, error) {
	// Check if token is blacklisted in Redis
	if redisClient != nil {
		isBlacklisted, _ := redisClient.Exists(context.Background(), "blacklisted:"+tokenString).Result()
		if isBlacklisted > 0 {
			return nil, errors.New("token is revoked")
		}
	}

	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// RevokeToken adds a token to the Redis blacklist until it expires
func RevokeToken(tokenString string) error {
	if redisClient == nil {
		return errors.New("redis client not initialized")
	}

	// Parse token WITHOUT validation (to get expiry)
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &UserClaims{})
	if err != nil {
		return err
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok {
		return errors.New("invalid token claims")
	}

	// Calculate remaining TTL
	expiration := time.Until(claims.ExpiresAt.Time)
	if expiration < 0 {
		return nil // Already expired
	}

	// Add to blacklist with TTL
	return redisClient.Set(context.Background(), "blacklisted:"+tokenString, "true", expiration).Err()
}

// RevokeUserTokens marks a userID as suspended in Redis so any valid token
// they hold will be rejected at the middleware level.
func RevokeUserTokens(userID string) {
	if redisClient == nil {
		return
	}
	// We store a suspended flag for 7 days (max refresh token lifetime)
	redisClient.Set(context.Background(), "suspended:"+userID, "true", 7*24*time.Hour)
}

// IsUserSuspended checks if a user has been emergency-suspended via the OCC.
func IsUserSuspended(userID string) bool {
	if redisClient == nil {
		return false
	}
	val, _ := redisClient.Exists(context.Background(), "suspended:"+userID).Result()
	return val > 0
}

// SetMaintenanceMode toggles the global "Maintenance Mode" (Kill Switch).
func SetMaintenanceMode(active bool) error {
	if redisClient == nil {
		return errors.New("redis client not initialized")
	}
	if active {
		return redisClient.Set(context.Background(), "system:maintenance_mode", "true", 0).Err()
	}
	return redisClient.Del(context.Background(), "system:maintenance_mode").Err()
}

// IsMaintenanceMode checks if the system is currently under maintenance.
func IsMaintenanceMode() bool {
	if redisClient == nil {
		return false
	}
	val, _ := redisClient.Exists(context.Background(), "system:maintenance_mode").Result()
	return val > 0
}
