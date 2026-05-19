# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o vrom-backend ./cmd/vrom/main.go

# Run stage
FROM alpine:latest

# Install ca-certificates and timezone data
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy the binary from the builder
COPY --from=builder /app/vrom-backend .
# Copy necessary assets (Firebase JSON, etc.)
COPY --from=builder /app/vrom-firebase-adminsdk.json .

# Expose the API port
EXPOSE 8080

CMD ["./vrom-backend"]
