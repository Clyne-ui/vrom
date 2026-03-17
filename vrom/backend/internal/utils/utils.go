package utils

import (
	"fmt"
	"math/rand"
	"time"
)

func GenerateOTP() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%04d", rand.Intn(10000))
}

// LatLngToH3Placeholder is a non-CGO temporary fallback that returns a simple string.
// In this architecture, we delegate the heavy H3 conversion to Rust (Matching Engine)
// and Java (Flink) which handle the spatial intelligence natively.
func LatLngToH3Placeholder(lat, lng float64, res int) string {
	return fmt.Sprintf("h3-res%d-lat%.3f-lng%.3f", res, lat, lng)
}
