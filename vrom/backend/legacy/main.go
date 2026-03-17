package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"math/rand"
    "time"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
    "vrom-backend/pb"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "github.com/segmentio/kafka-go"
)

var kafkaWriter *kafka.Writer

// 1. THE DATA STRUCTURE
type User struct {
	FullName    string `json:"full_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
	Role        string `json:"role"`
}
type RiderOnboarding struct {
    UserID             string `json:"user_id"`
    SelfieURL          string `json:"selfie_url"`
    IDFrontURL         string `json:"id_front_url"`
    IDBackURL          string `json:"id_back_url"`
    GoodConductURL     string `json:"good_conduct_url"`
    VehicleType        string `json:"vehicle_type"`
    PlateNumber        string `json:"plate_number"`
    VehiclePhotoURL    string `json:"vehicle_photo_url"`
}
type SellerOnboarding struct {
    UserID      string `json:"user_id"`
    ShopName    string `json:"shop_name"`
    ShopAddress string `json:"shop_address"`
    ShopLogoURL string `json:"shop_logo_url"`
    IDFrontURL  string `json:"id_front_url"`
    IDBackURL   string `json:"id_back_url"`
}

type Product struct {
	ProductID  string  `json:"product_id"`
	SellerID   string  `json:"seller_id"`
	ShopID     string  `json:"shop_id"`     // Link to physical branch
	CategoryID string  `json:"category_id"` // Category link
	Title      string  `json:"title"`
	Price      float64 `json:"price"`
	Currency   string  `json:"currency"`
	ImageURL   string  `json:"image_url"`
	StockCount int     `json:"stock_count"`
}

type Category struct {
	CategoryID  string `json:"category_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IconURL     string `json:"icon_url"`
}

type Shop struct {
	ShopID      string  `json:"shop_id"`
	SellerID    string  `json:"seller_id"`
	ShopName    string  `json:"shop_name"`
	ShopAddress string  `json:"shop_address"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

type DiscoveryInput struct {
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	Radius     float64 `json:"radius"`      // Optional
	CategoryID string  `json:"category_id"` // Filter by category
}

type OrderInput struct {
	ProductID   string  `json:"product_id"`
	Quantity    int     `json:"quantity"`
	DeliveryLat float64 `json:"delivery_lat"`
	DeliveryLng float64 `json:"delivery_lng"`
}

// For when you want to retrieve a seller's full profile
type SellerProfile struct {
    FullName    string `json:"full_name"`
    ShopName    string `json:"shop_name"`
    ShopAddress string `json:"shop_address"`
    Balance     float64 `json:"balance"`
}
type PendingRider struct {
	UserID      string `json:"user_id"`
	FullName    string `json:"full_name"`
	VehicleType string `json:"vehicle_type"`
	IDImage     string `json:"id_image_url"`
}
type Activity struct {
    ID           int     `json:"id"`
    ActivityType string  `json:"activity_type"`
    Amount       float64 `json:"amount"`
    Description  string  `json:"description"`
    CreatedAt    string  `json:"created_at"`
}
type RideRequestInput struct {
    PickupLat  float64 `json:"pickup_lat"`
    PickupLng  float64 `json:"pickup_lng"`
    DropoffLat float64 `json:"dropoff_lat"`
    DropoffLng float64 `json:"dropoff_lng"`
}
// 2. THE DATABASE LOGIC
func RegisterUser(db *sql.DB, u User) error {
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
    if err != nil { return err }

    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil { return err }

    var userID string
    userQuery := `INSERT INTO users (full_name, email, phone_number, password_hash, role) 
                  VALUES ($1, $2, $3, $4, $5) RETURNING user_id`

    err = tx.QueryRowContext(ctx, userQuery, u.FullName, u.Email, u.PhoneNumber, hashedPassword, u.Role).Scan(&userID)
    if err != nil { tx.Rollback(); return err }

    // Create wallet
    _, err = tx.ExecContext(ctx, `INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00)`, userID)
    if err != nil { tx.Rollback(); return err }

    // ONLY generate OTP now if it's a customer
    if u.Role == "customer" {
        otpCode := generateOTP()
        _, err = tx.ExecContext(ctx, `INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes')`, userID, otpCode)
        if err != nil { tx.Rollback(); return err }
        fmt.Printf("✅ Customer OTP for %s: %s\n", u.Email, otpCode)
    }

    return tx.Commit()
}
func OnboardRider(db *sql.DB, data RiderOnboarding) error {
    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    // 1. Update Rider Profile (Removed vehicle_photo_url as it's not in DB)
    riderQuery := `
        INSERT INTO rider_profiles (rider_id, vehicle_type, plate_number, model_year) 
        VALUES ($1, $2, $3, 2024) 
        ON CONFLICT (rider_id) DO UPDATE SET 
            plate_number = $3, 
            vehicle_type = $2`
    
    _, err = tx.ExecContext(ctx, riderQuery, data.UserID, data.VehicleType, data.PlateNumber)
    if err != nil {
        tx.Rollback()
        return err
    }

    // 2. Save Documents (Compliance)
    documents := []struct {
        Type string
        URL  string
    }{
        {"Certificate of Good Conduct", data.GoodConductURL},
        {"Selfie", data.SelfieURL},
        {"ID Front", data.IDFrontURL},
        {"ID Back", data.IDBackURL},
        {"Vehicle Photo", data.VehiclePhotoURL}, // Save this here instead
    }

    docQuery := `
        INSERT INTO user_compliance_data (user_id, document_value, image_url, verification_status) 
        VALUES ($1, $2, $3, 'pending')`

    for _, doc := range documents {
        if doc.URL != "" { // Only save if the URL is provided
            _, err = tx.ExecContext(ctx, docQuery, data.UserID, doc.Type, doc.URL)
            if err != nil {
                tx.Rollback()
                return err
            }
        }
    }

    // 3. Generate and save OTP
    otpCode := generateOTP()
    otpQuery := `INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes')`
    _, err = tx.ExecContext(ctx, otpQuery, data.UserID, otpCode)
    if err != nil {
        tx.Rollback()
        return err
    }

    fmt.Printf("✅ Onboarding complete! OTP for user %s: %s\n", data.UserID, otpCode)

    return tx.Commit()
}
func OnboardSeller(db *sql.DB, data SellerOnboarding) error {
    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    // 1. Update Seller Profile
    sellerQuery := `
        INSERT INTO seller_profiles (seller_id, business_name, shop_address) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (seller_id) DO UPDATE SET business_name = $2, shop_address = $3`
    
    _, err = tx.ExecContext(ctx, sellerQuery, data.UserID, data.ShopName, data.ShopAddress)
    if err != nil {
        tx.Rollback()
        return err
    }

    // 2. Save Compliance Document (e.g., ID Front)
    docQuery := `
        INSERT INTO user_compliance_data (user_id, document_value, image_url, verification_status) 
        VALUES ($1, 'Seller ID Front', $2, 'pending')`
    
    _, err = tx.ExecContext(ctx, docQuery, data.UserID, data.IDFrontURL)
    if err != nil {
        tx.Rollback()
        return err
    }
    // Generate and save OTP ONLY after docs are submitted
otpCode := generateOTP()
otpQuery := `INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes')`
_, err = tx.ExecContext(ctx, otpQuery, data.UserID, otpCode)
if err != nil {
    tx.Rollback()
    return err
}

fmt.Printf("✅ Onboarding complete! OTP for user %s: %s\n", data.UserID, otpCode)

    return tx.Commit()
}
func GetUserHistory(db *sql.DB, userID string) ([]Activity, error) {
    query := `
        SELECT id, activity_type, amount, description, created_at 
        FROM user_activities 
        WHERE user_id = $1 AND is_visible = true 
        ORDER BY created_at DESC`

    rows, err := db.Query(query, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var history []Activity
    for rows.Next() {
        var a Activity
        rows.Scan(&a.ID, &a.ActivityType, &a.Amount, &a.Description, &a.CreatedAt)
        history = append(history, a)
    }
    return history, nil
}


func GetPendingRiders(db *sql.DB) ([]PendingRider, error) {
    // This query removes the duplicates
    query := `
        SELECT DISTINCT ON (u.user_id) u.user_id, u.full_name, r.vehicle_type, c.image_url
        FROM users u
        JOIN rider_profiles r ON u.user_id = r.rider_id
        JOIN user_compliance_data c ON u.user_id = c.user_id
        WHERE u.role = 'rider' AND u.is_verified = false
        ORDER BY u.user_id, c.created_at DESC`

    rows, err := db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var riders []PendingRider
    for rows.Next() {
        var pr PendingRider
        if err := rows.Scan(&pr.UserID, &pr.FullName, &pr.VehicleType, &pr.IDImage); err != nil {
            return nil, err
        }
        riders = append(riders, pr)
    }
    return riders, nil
}

func RejectRider(db *sql.DB, userID string, reason string) error {
    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil { return err }

    // 1. Update the compliance status and store the reason
    // Note: You might need to add a 'rejection_reason' column to your table via SQL first
    query := `UPDATE user_compliance_data 
              SET verification_status = 'rejected', 
                  document_value = $2 -- We can temporarily store the reason here or in a new column
              WHERE user_id = $1`
    
    _, err = tx.ExecContext(ctx, query, userID, "REJECTED: "+reason)
    if err != nil {
        tx.Rollback()
        return err
    }

    // 2. Ensure the user remains unverified
    _, err = tx.ExecContext(ctx, "UPDATE users SET is_verified = false WHERE user_id = $1", userID)
    if err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
func CheckAdminRole(db *sql.DB, email string) (bool, error) {
    var role string
    query := `SELECT role FROM users WHERE email = $1`
    err := db.QueryRow(query, email).Scan(&role)
    if err != nil {
        return false, err
    }
    return role == "admin", nil
}
func RecordActivity(db *sql.DB, userID, aType, desc string, amount float64) {
    query := `INSERT INTO user_activities (user_id, activity_type, description, amount) VALUES ($1, $2, $3, $4)`
    db.Exec(query, userID, aType, desc, amount)
}
func RecordTransaction(db *sql.DB, userID string, aType string, desc string, amount float64) error {
    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil { return err }

    // 1. Get the latest balance from the wallet table (or the last activity)
    var currentBalance float64
    err = tx.QueryRowContext(ctx, "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE", userID).Scan(&currentBalance)
    if err != nil {
        tx.Rollback()
        return err
    }

    newBalance := currentBalance + amount

    // 2. Update the actual Wallet table
    _, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = $1 WHERE user_id = $2", newBalance, userID)
    if err != nil {
        tx.Rollback()
        return err
    }

    // 3. Insert into Activity History with the "balance_after" snapshot
    query := `INSERT INTO user_activities (user_id, activity_type, description, amount, balance_after) 
              VALUES ($1, $2, $3, $4, $5)`
    _, err = tx.ExecContext(ctx, query, userID, aType, desc, amount, newBalance)
    if err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
func ApproveRider(db *sql.DB, userID string) error {
    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil { return err }

    // 1. Mark user as verified
    _, err = tx.ExecContext(ctx, "UPDATE users SET is_verified = true WHERE user_id = $1", userID)
    if err != nil { tx.Rollback(); return err }

    // 2. Update compliance status
    _, err = tx.ExecContext(ctx, "UPDATE user_compliance_data SET verification_status = 'approved' WHERE user_id = $1", userID)
    if err != nil { tx.Rollback(); return err }

    // 3. RECORD THE ACTIVITY (New Step)
    _, err = tx.ExecContext(ctx, `
        INSERT INTO user_activities (user_id, activity_type, description, amount) 
        VALUES ($1, 'system', 'Account successfully verified by Admin. You can now start taking trips.', 0)`, 
        userID)
    if err != nil { tx.Rollback(); return err }

    return tx.Commit()
}
func CompleteSale(db *sql.DB, buyerID, sellerID string, amount float64, itemName string) error {
    ctx := context.Background()
    tx, err := db.BeginTx(ctx, nil)
    if err != nil { return err }

    // Record for the BUYER
    _, err = tx.ExecContext(ctx, 
        "INSERT INTO user_activities (user_id, activity_type, description, amount) VALUES ($1, 'purchase', $2, $3)", 
        buyerID, "Purchased "+itemName, -amount) // Negative amount (money out)
    if err != nil { tx.Rollback(); return err }

    // Record for the SELLER
    _, err = tx.ExecContext(ctx, 
        "INSERT INTO user_activities (user_id, activity_type, description, amount) VALUES ($1, 'sale', $2, $3)", 
        sellerID, "Sold "+itemName+" to Buyer", amount) // Positive amount (money in)
    if err != nil { tx.Rollback(); return err }

    return tx.Commit()
}
func CompleteTrip(db *sql.DB, riderID string, earnings float64, tripID string) {
    desc := fmt.Sprintf("Earnings from Trip ID: %s", tripID)
    RecordActivity(db, riderID, "trip", desc, earnings)
}
func RequireRole(db *sql.DB, allowedRoles []string, next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // In the future, we will use JWT tokens. For now, we use the Email header.
        email := r.Header.Get("X-User-Email")
        if email == "" {
            http.Error(w, "Authentication required", http.StatusUnauthorized)
            return
        }

        var userRole string
        err := db.QueryRow("SELECT role FROM users WHERE email = $1", email).Scan(&userRole)
        if err != nil {
            if err == sql.ErrNoRows {
                http.Error(w, "Access Denied: User account not found. Please register first.", http.StatusForbidden)
            } else {
                log.Printf("Database Error in RequireRole: %v", err)
                http.Error(w, "Internal Server Error: Database lookup failed", http.StatusInternalServerError)
            }
            return
        }

        // Check if the user's role is in the list of allowed roles
        isAllowed := false
        for _, role := range allowedRoles {
            if role == userRole {
                isAllowed = true
                break
            }
        }

        if !isAllowed {
            http.Error(w, "Access Denied: Your role does not allow this action", http.StatusForbidden)
            return
        }

        next(w, r)
    }
}
func LoginUser(db *sql.DB, email, password string) (string, error) {
    var storedHash string
    var fullName string

    // 1. Look for the user by email
    query := `SELECT password_hash, full_name FROM users WHERE email = $1`
    err := db.QueryRow(query, email).Scan(&storedHash, &fullName)
    if err != nil {
        if err == sql.ErrNoRows {
            return "", fmt.Errorf("invalid email or password")
        }
        return "", err
    }

    // 2. Compare the typed password with the hashed password
    err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
    if err != nil {
        return "", fmt.Errorf("invalid email or password")
    }

    return fullName, nil
}
func AdminOnly(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Standardize on X-User-Email for all roles
		adminEmail := r.Header.Get("X-User-Email")
		
		if adminEmail == "" {
			http.Error(w, "Authentication required (User Email header missing)", http.StatusUnauthorized)
			return
		}

		isAdmin, err := CheckAdminRole(db, adminEmail)
		if err != nil || !isAdmin {
			http.Error(w, "Access Denied: You do not have administrator privileges", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

// // 3. THE API HANDLER
func handleRegister(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 1. Only allow POST requests
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        // 2. Decode the JSON body
        var newUser User
        if err := json.NewDecoder(r.Body).Decode(&newUser); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        // --- NEW ADMIN SECURITY CHECK ---
        if newUser.Role == "admin" {
            // We check for a special secret key in the headers
            secretKey := r.Header.Get("X-Vrom-Admin-Secret")
            if secretKey != "MY_SUPER_SECRET_KEY_123" { // Use a strong password here
                http.Error(w, "Unauthorized: Invalid Admin Secret Key", http.StatusUnauthorized)
                return
            }
        }
        // --------------------------------

        // 3. Register the user in the database
        if err := RegisterUser(db, newUser); err != nil {
            if strings.Contains(err.Error(), "users_email_key") {
                http.Error(w, "Email already exists", http.StatusConflict)
            } else {
                http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
            }
            return
        }

        // 4. Decide which message to show based on the role
        message := "Registration successful! Please complete onboarding."
        if newUser.Role == "customer" {
            message = "Registration successful! Please verify your OTP."
        } else if newUser.Role == "admin" {
            message = "Admin account created successfully!"
        }

        // 5. Send the final response
        w.WriteHeader(http.StatusCreated)
        fmt.Fprint(w, message)
    }
}
func generateOTP() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%04d", rand.Intn(10000))
}
func handleGetPendingRiders(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Only allow GET requests for fetching data
        if r.Method != http.MethodGet {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        // Call the database logic function
        riders, err := GetPendingRiders(db)
        if err != nil {
            http.Error(w, "Failed to fetch pending riders: "+err.Error(), http.StatusInternalServerError)
            return
        }

        // Set the response header to JSON
        w.Header().Set("Content-Type", "application/json")
        
        // If the list is empty, send an empty array [] instead of null
        if riders == nil {
            riders = []PendingRider{}
        }

        json.NewEncoder(w).Encode(riders)
    }
}
func CleanupUnverifiedUsers(db *sql.DB) {
    // This deletes expired OTPs. 
    // Since otps table has 'ON DELETE CASCADE' linked to users, 
    // the unverified user will be deleted too!
    query := `DELETE FROM users WHERE is_verified = false 
              AND user_id IN (SELECT user_id FROM otps WHERE expires_at < CURRENT_TIMESTAMP)`
    
    result, _ := db.Exec(query)
    rows, _ := result.RowsAffected()
    if rows > 0 {
        fmt.Printf("🧹 Cleanup: Removed %d unverified ghost accounts.\n", rows)
    }
}
func handleLogin(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var credentials struct {
            Email    string `json:"email"`
            Password string `json:"password"`
        }

        if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        name, err := LoginUser(db, credentials.Email, credentials.Password)
        if err != nil {
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusUnauthorized)
            json.NewEncoder(w).Encode(map[string]string{
                "status":  "Error",
                "message": err.Error(),
            })
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "status":  "Success",
            "message": fmt.Sprintf("Welcome back, %s! Login successful.", name),
            "user": map[string]string{
                "full_name": name,
                "email":     credentials.Email,
            },
        })
    }
}
func handleOnboardRider(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var data RiderOnboarding
        if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        if err := OnboardRider(db, data); err != nil {
            http.Error(w, "Onboarding failed: "+err.Error(), http.StatusInternalServerError)
            return
        }

        fmt.Fprintf(w, "Rider onboarding documents submitted successfully!")
    }
}
func handleOnboardSeller(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var data SellerOnboarding
        if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        if err := OnboardSeller(db, data); err != nil {
            http.Error(w, "Seller onboarding failed: "+err.Error(), http.StatusInternalServerError)
            return
        }

        fmt.Fprintf(w, "Seller shop details submitted for verification!")
    }
}
func handleApproveRider(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req struct {
            UserID string `json:"user_id"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        if err := ApproveRider(db, req.UserID); err != nil {
            http.Error(w, "Approval failed: "+err.Error(), http.StatusInternalServerError)
            return
        }

        fmt.Fprintf(w, "Rider %s has been approved successfully!", req.UserID)
    }
}
func handleRejectRider(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req struct {
            UserID string `json:"user_id"`
            Reason string `json:"reason"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        if err := RejectRider(db, req.UserID, req.Reason); err != nil {
            http.Error(w, "Rejection failed: "+err.Error(), http.StatusInternalServerError)
            return
        }

        fmt.Fprintf(w, "Rider %s has been rejected. Reason: %s", req.UserID, req.Reason)
    }
}
func handleGetHistory(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // In a real app, you'd get the UserID from a JWT token.
        // For testing, we will use a URL parameter or Header.
        userID := r.URL.Query().Get("user_id")
        
        if userID == "" {
            http.Error(w, "User ID is required", http.StatusBadRequest)
            return
        }

        history, err := GetUserHistory(db, userID)
        if err != nil {
            http.Error(w, "Failed to fetch history", http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(history)
    }
}
func handleLogout(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "status":  "Success",
        "message": "Logout successful. Goodbye!",
    })
}
func DeleteUser(db *sql.DB, email string) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	// Delete the user by email. 
	// ON DELETE CASCADE in your SQL will handle the rest!
	query := `DELETE FROM users WHERE email = $1`
	result, err := tx.ExecContext(ctx, query, email)
	if err != nil {
		tx.Rollback()
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		tx.Rollback()
		return fmt.Errorf("user not found")
	}

	return tx.Commit()
}
func handleDeleteAccount(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only allow DELETE method
		if r.Method != http.MethodDelete {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Get email from query parameter or header
		email := r.URL.Query().Get("email")
		if email == "" {
			email = r.Header.Get("X-User-Email")
		}

		if email == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "Error", "message": "Email is required"})
			return
		}

		if err := DeleteUser(db, email); err != nil {
			w.Header().Set("Content-Type", "application/json")
			if err.Error() == "user not found" {
				w.WriteHeader(http.StatusNotFound)
			} else {
				w.WriteHeader(http.StatusInternalServerError)
			}
			json.NewEncoder(w).Encode(map[string]string{"status": "Error", "message": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "Success",
			"message": fmt.Sprintf("Account for %s has been permanently deleted.", email),
		})
	}
}
func handleWithdraw(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req struct {
            Email  string  `json:"email"`
            Amount float64 `json:"amount"` // The amount the user WANTS to receive
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        // 1. Calculate the 5% Fee
        commissionRate := 0.05
        vromFee := req.Amount * commissionRate
        totalDeduction := req.Amount + vromFee // They need enough to cover the fee too

        ctx := context.Background()
        tx, err := db.BeginTx(ctx, nil)
        if err != nil { return }

        // 2. Check Balance
        var currentBalance float64
        var userID string
        err = tx.QueryRowContext(ctx, `
            SELECT w.balance, u.user_id FROM wallets w 
            JOIN users u ON w.user_id = u.user_id 
            WHERE u.email = $1 FOR UPDATE`, req.Email).Scan(&currentBalance, &userID)

        if err != nil {
            tx.Rollback()
            http.Error(w, "User not found", http.StatusNotFound)
            return
        }

        if currentBalance < totalDeduction {
            tx.Rollback()
            http.Error(w, fmt.Sprintf("Insufficient funds. You need KES %.2f (including 5%% fee)", totalDeduction), http.StatusForbidden)
            return
        }

        // 3. Update Wallet
        newBalance := currentBalance - totalDeduction
        _, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = $1 WHERE user_id = $2", newBalance, userID)
        if err != nil {
            tx.Rollback()
            return
        }

        // 4. Record the Transaction in History
        desc := fmt.Sprintf("Withdrawal: KES %.2f (Fee: KES %.2f)", req.Amount, vromFee)
        _, err = tx.ExecContext(ctx, `
            INSERT INTO user_activities (user_id, activity_type, description, amount, balance_after, is_visible) 
            VALUES ($1, 'withdrawal', $2, $3, $4, true)`, 
            userID, desc, -totalDeduction, newBalance)

        if err != nil {
            tx.Rollback()
            return
        }

        tx.Commit()
        fmt.Fprintf(w, "Success! KES %.2f sent. Vrom Fee (5%%): KES %.2f. New Balance: KES %.2f", req.Amount, vromFee, newBalance)
    }
}
func handleDeleteHistory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.URL.Query().Get("email")
		if email == "" {
			http.Error(w, "Email is required", http.StatusBadRequest)
			return
		}

		// Soft delete: keep the data for the admin, but hide it from the user profile
		query := `UPDATE user_activities SET is_visible = false 
		          WHERE user_id = (SELECT user_id FROM users WHERE email = $1)`
		
		_, err := db.Exec(query, email)
		if err != nil {
			http.Error(w, "Failed to clear history", http.StatusInternalServerError)
			return
		}

		fmt.Fprint(w, "History cleared successfully from your profile.")
	}
}
// --- SELLER HANDLERS ---

func handleCreateShop(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var s Shop
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, "Invalid shop data", http.StatusBadRequest)
			return
		}

		sellerEmail := r.Header.Get("X-User-Email")
		if sellerEmail == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var sellerID string
		err := db.QueryRowContext(ctx, "SELECT user_id FROM users WHERE email = $1 AND role = 'seller'", sellerEmail).Scan(&sellerID)
		if err != nil {
			http.Error(w, "Seller profile not found", http.StatusForbidden)
			return
		}

		query := `
			INSERT INTO shops (seller_id, shop_name, shop_address, shop_location)
			VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
			RETURNING shop_id`
		
		var newShopID string
		err = db.QueryRowContext(ctx, query, sellerID, s.ShopName, s.ShopAddress, s.Lng, s.Lat).Scan(&newShopID)
		if err != nil {
			log.Printf("Shop Creation Error: %v", err)
			http.Error(w, "Failed to create shop branch", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"shop_id": newShopID,
			"message": fmt.Sprintf("Shop branch '%s' is now open!", s.ShopName),
		})
	}
}

func handleCompleteOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
			OTP     string `json:"otp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		riderEmail := r.Header.Get("X-User-Email")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Transaction failed", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// 1. Get Rider ID
		var riderID string
		err = tx.QueryRowContext(ctx, "SELECT user_id FROM users WHERE email = $1 AND role = 'rider'", riderEmail).Scan(&riderID)
		if err != nil {
			http.Error(w, "Rider not found", http.StatusForbidden)
			return
		}

		// 2. Lock Order and verify
		var buyerID, sellerID, currentRiderID string
		var totalAmount float64
		var status, expectedOTP string
		query := "SELECT buyer_id, seller_id, rider_id, total_amount, status, delivery_otp FROM orders WHERE order_id = $1 FOR UPDATE"
		err = tx.QueryRowContext(ctx, query, req.OrderID).Scan(&buyerID, &sellerID, &currentRiderID, &totalAmount, &status, &expectedOTP)
		if err != nil {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}

		if status != "picked_up" {
			http.Error(w, "Order is not in delivery status", http.StatusConflict)
			return
		}

		if currentRiderID != riderID {
			http.Error(w, "Unauthorized: You are not the assigned rider for this order", http.StatusUnauthorized)
			return
		}

		if req.OTP != expectedOTP {
			http.Error(w, "Invalid Delivery OTP", http.StatusUnauthorized)
			return
		}

		// 3. Release Funds (Simple split: 70% Seller, 20% Rider, 10% Vrom)
		sellerShare := totalAmount * 0.70
		riderShare := totalAmount * 0.20
		vromCommission := totalAmount * 0.10

		// Update Seller Wallet
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", sellerShare, sellerID)
		if err != nil { return }

		// Update Rider Wallet
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", riderShare, riderID)
		if err != nil { return }

		// Deduct from Buyer's Locked Funds
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET locked_funds = locked_funds - $1 WHERE user_id = $2", totalAmount, buyerID)
		if err != nil { return }

		// 4. Update Order Status
		_, err = tx.ExecContext(ctx, "UPDATE orders SET status = 'delivered', otp_verified = true WHERE order_id = $1", req.OrderID)
		if err != nil { return }

		// 5. Record Transaction (FUNDS_RELEASE)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
			VALUES ($1, $2, $3, 'FUNDS_RELEASE')`, 
			buyerID, req.OrderID, totalAmount)
		if err != nil { return }

		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to finalize payout", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"message": "Delivery completed! Funds released successfully.",
			"earned_kes": riderShare,
			"seller_payout_kes": sellerShare,
			"commission_kes": vromCommission,
		})
	}
}

func handleCreateCategory(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var c Category
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			http.Error(w, "Invalid category data", http.StatusBadRequest)
			return
		}

		if c.Name == "" {
			http.Error(w, "Category name is required", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		query := `
			INSERT INTO categories (name, description, icon_url)
			VALUES ($1, $2, $3)
			RETURNING category_id`
		
		var newID string
		err := db.QueryRowContext(ctx, query, c.Name, c.Description, c.IconURL).Scan(&newID)
		if err != nil {
			log.Printf("Category Creation Error: %v", err)
			http.Error(w, "Failed to create category", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"category_id": newID,
			"message": fmt.Sprintf("Category '%s' created!", c.Name),
		})
	}
}

func handleGetCategories(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		rows, err := db.QueryContext(ctx, "SELECT category_id, name, description, icon_url FROM categories ORDER BY name ASC")
		if err != nil {
			http.Error(w, "Failed to load categories", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var categories []Category
		for rows.Next() {
			var c Category
			var desc, icon sql.NullString
			if err := rows.Scan(&c.CategoryID, &c.Name, &desc, &icon); err != nil {
				continue
			}
			c.Description = desc.String
			c.IconURL = icon.String
			categories = append(categories, c)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(categories)
	}
}

func handleUploadProduct(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var p Product
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "Invalid product data", http.StatusBadRequest)
			return
		}

		if p.ShopID == "" || p.CategoryID == "" {
			http.Error(w, "Shop ID and Category ID are required", http.StatusBadRequest)
			return
		}

		sellerEmail := r.Header.Get("X-User-Email")
		if sellerEmail == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// 1. Get Seller ID
		var sellerID string
		err := db.QueryRowContext(ctx, "SELECT user_id FROM users WHERE email = $1 AND role = 'seller'", sellerEmail).Scan(&sellerID)
		if err != nil {
			http.Error(w, "Seller profile not found", http.StatusForbidden)
			return
		}

		// 2. Verify shop belongs to this seller
		var exists bool
		err = db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM shops WHERE shop_id = $1 AND seller_id = $2)", p.ShopID, sellerID).Scan(&exists)
		if err != nil || !exists {
			http.Error(w, "Unauthorized: This shop branch does not belong to you or does not exist", http.StatusUnauthorized)
			return
		}

		// 3. Insert product
		query := `
			INSERT INTO products (seller_id, shop_id, category_id, title, price, image_url, stock_count) 
			VALUES ($1, $2, $3, $4, $5, $6, $7) 
			RETURNING product_id`
		
		var newProductID string
		err = db.QueryRowContext(ctx, query, sellerID, p.ShopID, p.CategoryID, p.Title, p.Price, p.ImageURL, p.StockCount).Scan(&newProductID)
		if err != nil {
			log.Printf("Product Upload Error: %v", err)
			http.Error(w, "Failed to upload product", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"product_id": newProductID,
			"message": "Product online with category!",
		})
	}
}

func handleGetNearbyProducts(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input DiscoveryInput
		// Parse from JSON body (POST)
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid coordinates provided", http.StatusBadRequest)
			return
		}

		// Default radius to 50km if not provided
		if input.Radius <= 0 {
			input.Radius = 50000
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		query := `
			SELECT p.product_id, p.title, p.price, p.image_url, s.shop_name, s.shop_address,
			       c.name as category_name,
			       ST_Distance(s.shop_location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as distance
			FROM products p
			JOIN shops s ON p.shop_id = s.shop_id
			JOIN categories c ON p.category_id = c.category_id
			WHERE ST_DWithin(s.shop_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)`
		
		args := []interface{}{input.Lng, input.Lat, input.Radius}
		
		if input.CategoryID != "" {
			query += " AND p.category_id = $4"
			args = append(args, input.CategoryID)
		}

		query += " ORDER BY s.shop_location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) LIMIT 50"

		rows, err := db.QueryContext(ctx, query, args...)
		if err != nil {
			log.Printf("Discovery Error: %v", err)
			http.Error(w, "Discovery failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var products []map[string]interface{}
		for rows.Next() {
			var id, title, img, shop, addr, catName string
			var price, dist float64
			if err := rows.Scan(&id, &title, &price, &img, &shop, &addr, &catName, &dist); err != nil {
				continue
			}
			products = append(products, map[string]interface{}{
				"product_id":    id,
				"title":         title,
				"price":         price,
				"image_url":     img,
				"shop_name":     shop,
				"shop_address":  addr,
				"category_name": catName,
				"distance_m":    int(dist),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "Success",
			"count":    len(products),
			"products": products,
		})
	}
}

func handleOrderStock(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Seller Access Granted: Stock order placed with Production Company.")
	}
}

// --- RIDER HANDLERS ---

func handleUpdateRiderRates(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			BaseFare   float64 `json:"base_fare"`
			PricePerKm float64 `json:"price_per_km"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		if req.BaseFare < 0 || req.PricePerKm < 0 {
			http.Error(w, "Rates cannot be negative", http.StatusBadRequest)
			return
		}

		riderEmail := r.Header.Get("X-User-Email")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		_, err := db.ExecContext(ctx, `
			UPDATE rider_profiles 
			SET base_fare = $1, price_per_km = $2 
			WHERE rider_id = (SELECT user_id FROM users WHERE email = $3 AND role = 'rider')`,
			req.BaseFare, req.PricePerKm, riderEmail)
		
		if err != nil {
			log.Printf("Update Rates Error: %v", err)
			http.Error(w, "Failed to update rates", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"message": fmt.Sprintf("Your rates are set: KES %.2f base + KES %.2f/km", req.BaseFare, req.PricePerKm),
		})
	}
}

func handleAcceptDelivery(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		riderEmail := r.Header.Get("X-User-Email")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Transaction failed", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// 1. Get Rider ID
		var riderID string
		err = tx.QueryRowContext(ctx, "SELECT user_id FROM users WHERE email = $1 AND role = 'rider'", riderEmail).Scan(&riderID)
		if err != nil {
			http.Error(w, "Rider not found", http.StatusForbidden)
			return
		}

		// 2. Lock and Update Order
		var status string
		err = tx.QueryRowContext(ctx, "SELECT status FROM orders WHERE order_id = $1 FOR UPDATE", req.OrderID).Scan(&status)
		if err != nil {
			http.Error(w, "Order not found", http.StatusNotFound)
			return
		}

		if status != "paid_escrow" {
			http.Error(w, "Order is no longer available for pickup", http.StatusGone)
			return
		}

		_, err = tx.ExecContext(ctx, "UPDATE orders SET rider_id = $1, status = 'picked_up' WHERE order_id = $2", riderID, req.OrderID)
		if err != nil {
			http.Error(w, "Failed to accept delivery", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to finalize acceptance", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"message": "Delivery accepted! Please pick up the item from the shop.",
		})
	}
}


// --- GENERAL HANDLERS (Customer/Seller/Rider) ---

func handleCreateOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req OrderInput
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid order data", http.StatusBadRequest)
			return
		}

		if req.Quantity <= 0 {
			http.Error(w, "Quantity must be at least 1", http.StatusBadRequest)
			return
		}

		buyerEmail := r.Header.Get("X-User-Email")
		if buyerEmail == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Transaction failed", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// 1. Get Buyer ID and lock wallet
		var buyerID string
		var balance float64
		err = tx.QueryRowContext(ctx, "SELECT user_id, balance FROM wallets WHERE user_id = (SELECT user_id FROM users WHERE email = $1) FOR UPDATE", buyerEmail).Scan(&buyerID, &balance)
		if err != nil {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		// 2. Get Product details and shop location
		var productPrice float64
		var sellerID, shopID string
		var stockCount int
		var shopLat, shopLng float64
		query := `
			SELECT p.price, p.seller_id, p.shop_id, p.stock_count, 
			       ST_Y(s.shop_location::geometry) as lat, ST_X(s.shop_location::geometry) as lng
			FROM products p
			JOIN shops s ON p.shop_id = s.shop_id
			WHERE p.product_id = $1 FOR UPDATE`
		
		err = tx.QueryRowContext(ctx, query, req.ProductID).Scan(&productPrice, &sellerID, &shopID, &stockCount, &shopLat, &shopLng)
		if err != nil {
			http.Error(w, "Product not found or branch missing", http.StatusNotFound)
			return
		}

		if stockCount < req.Quantity {
			http.Error(w, "Insufficient stock", http.StatusConflict)
			return
		}

		// 3. Calculate distance and shipping fee (Simulated simple calc for now)
		// We use PostGIS ST_Distance later if refined, but let's do a basic per-km fee
		// or use the actual distance from DB
		var distance float64
		distQuery := `SELECT ST_Distance(
			ST_SetSRID(ST_MakePoint($1, $2), 4326),
			ST_SetSRID(ST_MakePoint($3, $4), 4326)
		)::float8 / 1000` // dist in km
		err = tx.QueryRowContext(ctx, distQuery, shopLng, shopLat, req.DeliveryLng, req.DeliveryLat).Scan(&distance)
		if err != nil {
			log.Printf("Distance Calculation Error: %v", err)
			http.Error(w, "Failed to calculate delivery distance", http.StatusInternalServerError)
			return
		}

		shippingFee := 50.0 + (distance * 20.0) // 50 base + 20 per km
		totalItemCost := productPrice * float64(req.Quantity)
		totalAmount := totalItemCost + shippingFee

		if balance < totalAmount {
			http.Error(w, fmt.Sprintf("Insufficient funds. Need %.2f but have %.2f", totalAmount, balance), http.StatusPaymentRequired)
			return
		}

		// 4. Deduct and lock in Escrow
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance - $1, locked_funds = locked_funds + $1 WHERE user_id = $2", totalAmount, buyerID)
		if err != nil {
			log.Printf("Create Order Error: Wallet escrow: %v", err)
			http.Error(w, "Failed to update wallet balance", http.StatusInternalServerError)
			return
		}

		// 5. Update stock
		_, err = tx.ExecContext(ctx, "UPDATE products SET stock_count = stock_count - $1 WHERE product_id = $2", req.Quantity, req.ProductID)
		if err != nil {
			log.Printf("Create Order Error: Update stock: %v", err)
			http.Error(w, "Failed to update stock", http.StatusInternalServerError)
			return
		}

		// 6. Create Order entry
		otp := generateOTP()
		var orderID string
		orderQuery := `
			INSERT INTO orders (buyer_id, product_id, seller_id, total_amount, status, delivery_otp, quantity)
			VALUES ($1, $2, $3, $4, 'paid_escrow', $5, $6)
			RETURNING order_id`
		err = tx.QueryRowContext(ctx, orderQuery, buyerID, req.ProductID, sellerID, totalAmount, otp, req.Quantity).Scan(&orderID)
		if err != nil { 
			log.Printf("Order Insert Error: %v", err)
			return 
		}

		// 7. Record Transaction
		_, err = tx.ExecContext(ctx, `
			INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
			VALUES ($1, $2, $3, 'ESCROW_LOCK')`, 
			buyerID, orderID, totalAmount)
		if err != nil {
			log.Printf("Create Order Error: Record transaction: %v", err)
			http.Error(w, "Failed to record transaction", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to finalize order", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"order_id": orderID,
			"total_kes": totalAmount,
			"shipping_kes": shippingFee,
			"delivery_otp": otp,
			"message": "Order placed! A rider will be notified for delivery.",
		})
	}
}

// ---------------------------------------------------------
// NEW: Seller Order Rejection/Cancellation
// ---------------------------------------------------------
func handleSellerRejectOrder(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			OrderID string `json:"order_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		sellerEmail := r.Header.Get("X-User-Email")
		if sellerEmail == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Transaction failed", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// 1. Get Seller ID
		var sellerID string
		err = tx.QueryRowContext(ctx, "SELECT user_id FROM users WHERE email = $1 AND role = 'seller'", sellerEmail).Scan(&sellerID)
		if err != nil {
			http.Error(w, "Seller not found", http.StatusForbidden)
			return
		}

		// 2. Lock Order and verify
		var buyerID, productID, status string
		var totalAmount float64
		var quantity int
		query := "SELECT buyer_id, product_id, total_amount, status, quantity FROM orders WHERE order_id = $1 AND seller_id = $2 FOR UPDATE"
		err = tx.QueryRowContext(ctx, query, req.OrderID, sellerID).Scan(&buyerID, &productID, &totalAmount, &status, &quantity)
		if err != nil {
			http.Error(w, "Order not found or you don't own this order", http.StatusNotFound)
			return
		}

		if status != "paid_escrow" {
			http.Error(w, "Only new orders (paid_escrow) can be rejected", http.StatusConflict)
			return
		}

		// 3. Update Order Status
		_, err = tx.ExecContext(ctx, "UPDATE orders SET status = 'cancelled' WHERE order_id = $1", req.OrderID)
		if err != nil {
			log.Printf("Cancel Order Error: Update status: %v", err)
			http.Error(w, "Failed to update order status", http.StatusInternalServerError)
			return
		}

		// 4. Return Funds to Buyer
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1, locked_funds = locked_funds - $1 WHERE user_id = $2", totalAmount, buyerID)
		if err != nil {
			log.Printf("Cancel Order Error: Refund buyer: %v", err)
			http.Error(w, "Failed to refund buyer", http.StatusInternalServerError)
			return
		}

		// 5. Restock the item
		_, err = tx.ExecContext(ctx, "UPDATE products SET stock_count = stock_count + $1 WHERE product_id = $2", quantity, productID)
		if err != nil {
			log.Printf("Cancel Order Error: Restock item: %v", err)
			http.Error(w, "Failed to restock item", http.StatusInternalServerError)
			return
		}

		// 6. Record Refund Transaction
		_, err = tx.ExecContext(ctx, `
			INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
			VALUES ($1, $2, $3, 'REFUND')`, 
			buyerID, req.OrderID, totalAmount)
		if err != nil {
			log.Printf("Cancel Order Error: Record refund transaction: %v", err)
			http.Error(w, "Failed to record refund transaction", http.StatusInternalServerError)
			return
		}

		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to reject order", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"message": "Order rejected successfully. Customer has been fully refunded.",
			"refunded_kes": totalAmount,
			"restocked_quantity": quantity,
		})
	}
}

func handleRequestRide(db *sql.DB, rustClient pb.MatchingEngineClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input RideRequestInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, "Invalid ride coordinates", http.StatusBadRequest)
			return
		}

		customerEmail := r.Header.Get("X-User-Email")
		if customerEmail == "" {
			http.Error(w, "Authentication email missing (X-User-Email header)", http.StatusUnauthorized)
			return
		}

		// 1. CALL RUST MATCHING ENGINE
		rustCtx, rustCancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer rustCancel()

		reqToRust := &pb.RouteRequest{
			RiderId: "Rider_Nairobi_Auto",
			Points: []*pb.Location{
				{Lat: input.PickupLat, Lng: input.PickupLng, Id: "Pickup"},
				{Lat: input.DropoffLat, Lng: input.DropoffLng, Id: "Dropoff"},
			},
		}

		res, err := rustClient.SolveTSP(rustCtx, reqToRust)
		if err != nil {
			log.Printf("Matching Engine Error: %v", err)
			http.Error(w, "Matching Engine Error: "+err.Error(), http.StatusInternalServerError)
			return
		}


		// 3. START DATABASE TRANSACTION
		dbCtx, dbCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer dbCancel()

		tx, err := db.BeginTx(dbCtx, nil)
		if err != nil {
			http.Error(w, "Database transaction failed", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// 4. GET WALLET & CUSTOMER ID
		var currentBalance float64
		var buyerID string
		err = tx.QueryRowContext(dbCtx, `
			SELECT w.balance, u.user_id 
			FROM wallets w 
			JOIN users u ON w.user_id = u.user_id 
			WHERE u.email = $1 FOR UPDATE`, customerEmail).Scan(&currentBalance, &buyerID)

		if err != nil {
			log.Printf("Wallet/User lookup failed: %v", err)
			http.Error(w, "User wallet not found", http.StatusNotFound)
			return
		}

		// 5. FIND THE NEAREST RIDER (High-Scale optimization)
		// We also fetch their custom rates here
		var riderID string
		var riderBaseFare, riderPricePerKm float64
		matchQuery := `
			SELECT rider_id, base_fare, price_per_km 
			FROM rider_profiles 
			WHERE is_available = true 
			  AND ST_DWithin(current_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), 10000)
			ORDER BY current_location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
			LIMIT 1`

		err = tx.QueryRowContext(dbCtx, matchQuery, input.PickupLng, input.PickupLat).Scan(&riderID, &riderBaseFare, &riderPricePerKm)

		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK) 
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "No Rider Found",
				"message": "There are no online riders near your location at the moment (10km radius).",
			})
			return
		}

		// 6. PRICING CALCULATION (Dynamic per-rider rates)
		estimatedPrice := riderBaseFare + (res.TotalDistance * riderPricePerKm)

		if currentBalance < estimatedPrice {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusPaymentRequired)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "Insufficient Funds",
				"message": fmt.Sprintf("This rider costs KES %.2f. You only have KES %.2f.", estimatedPrice, currentBalance),
			})
			return
		}

		// 7. DEDUCT MONEY & CREATE TRIP
		_, err = tx.ExecContext(dbCtx, "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2", estimatedPrice, buyerID)
		if err != nil {
			log.Printf("Wallet update failed: %v", err)
			http.Error(w, "Payment deduction failed", http.StatusInternalServerError)
			return
		}

		// Save destination coordinates
		tripOTP := generateOTP()[:4] // DB says CHAR(4)
		query := `
			INSERT INTO trips (buyer_id, rider_id, actual_fare, status, pickup_location, dropoff_location, trip_otp) 
			VALUES ($1, $2, $3, 'pending', ST_SetSRID(ST_MakePoint($4, $5), 4326), ST_SetSRID(ST_MakePoint($6, $7), 4326), $8)`
		
		_, err = tx.ExecContext(dbCtx, query, buyerID, riderID, estimatedPrice, input.PickupLng, input.PickupLat, input.DropoffLng, input.DropoffLat, tripOTP)
		if err != nil {
			log.Printf("TRIP INSERTION ERROR: %v", err)
			http.Error(w, "Trip creation failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// 7. COMMIT
		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to finalize ride", http.StatusInternalServerError)
			return
		}

		// 8. SUCCESS RESPONSE
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Ride Found & Escrow Secured",
			"estimated_price": estimatedPrice,
			"trip_otp": tripOTP,
		})
	}
}
func handleCancelRide(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Use a JSON body or Query Param. Query param is fine for a quick test.
		tripID := r.URL.Query().Get("trip_id")
		customerEmail := r.Header.Get("X-User-Email") // Safety check: who is cancelling?

		if tripID == "" {
			http.Error(w, "Trip ID is required", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "System error", http.StatusInternalServerError)
			return
		}
		// Ensure rollback happens if we return early due to an error
		defer tx.Rollback()

		// 1. Find the amount and ensure this trip belongs to the requesting user
		var amount float64
		var buyerID string
		query := `
			SELECT t.actual_fare, t.buyer_id 
			FROM trips t
			JOIN users u ON t.buyer_id = u.user_id
			WHERE t.trip_id = $1 AND t.status = 'pending' AND u.email = $2`
		
		err = tx.QueryRowContext(ctx, query, tripID, customerEmail).Scan(&amount, &buyerID)
		if err == sql.ErrNoRows {
			http.Error(w, "Trip not found, already started, or unauthorized", http.StatusNotFound)
			return
		} else if err != nil {
			log.Printf("Cancel Trip Lookup Error: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		// 2. Refund to Customer Wallet
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", amount, buyerID)
		if err != nil {
			http.Error(w, "Failed to refund wallet", http.StatusInternalServerError)
			return
		}

		// 3. Mark Trip as Cancelled
		_, err = tx.ExecContext(ctx, "UPDATE trips SET status = 'cancelled' WHERE trip_id = $1", tripID)
		if err != nil {
			http.Error(w, "Failed to update trip status", http.StatusInternalServerError)
			return
		}

		// 4. Commit the transaction
		if err := tx.Commit(); err != nil {
			http.Error(w, "Failed to finalize cancellation", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"message": fmt.Sprintf("Ride %s cancelled. KES %.2f has been returned to your wallet.", tripID, amount),
		})
	}
}
func handleRiderDecision(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			TripID string `json:"trip_id"`
			Action string `json:"action"` // "accept" or "reject"
			Email  string `json:"email"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Server error", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		if req.Action == "reject" {
			// 1. REJECT LOGIC
			// Reset rider_id so another rider can be found, but keep the status 'pending'
            // and the money in escrow.
			_, err = tx.ExecContext(ctx, 
				"UPDATE trips SET rider_id = NULL WHERE trip_id = $1", 
				req.TripID)
			
			if err != nil {
				http.Error(w, "Failed to process rejection", http.StatusInternalServerError)
				return
			}

			tx.Commit()
			fmt.Fprint(w, "Ride rejected. Finding another rider for the customer...")

		} else if req.Action == "accept" {
			// 2. ACCEPT LOGIC
			// We must ensure the trip is still available
			var status string
			err := tx.QueryRowContext(ctx, "SELECT status FROM trips WHERE trip_id = $1 FOR UPDATE", req.TripID).Scan(&status)
			
			if status != "pending" {
				http.Error(w, "Trip no longer available", http.StatusGone)
				return
			}

			// Mark Rider as Busy (Unavailable)
			_, err = tx.ExecContext(ctx, `
				UPDATE rider_profiles 
				SET is_available = false 
				WHERE rider_id = (SELECT user_id FROM users WHERE email = $1)`, req.Email)

			// Mark Trip as Paid Escrow (Accepted)
			_, err = tx.ExecContext(ctx, "UPDATE trips SET status = 'paid_escrow' WHERE trip_id = $1", req.TripID)

			if err != nil {
				http.Error(w, "Failed to accept ride", http.StatusInternalServerError)
				return
			}

			tx.Commit()
			
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "accepted",
				"message": "Ride accepted! Navigate to pickup.",
			})
		}
	}
}
func handleToggleStatus(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email  string  `json:"email"`
			Status string  `json:"status"` // "online" or "offline"
			Lat    float64 `json:"lat"`
			Lng    float64 `json:"lng"`
		}
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		isAvailable := strings.ToLower(req.Status) == "online"

		// Update is_available and current_location (PostGIS)
		query := `UPDATE rider_profiles 
		          SET is_available = $1, current_location = ST_SetSRID(ST_MakePoint($2, $3), 4326) 
		          WHERE rider_id = (SELECT user_id FROM users WHERE email = $4)`
		
		result, err := db.Exec(query, isAvailable, req.Lng, req.Lat, req.Email)
		
		if err != nil {
			http.Error(w, "Status update failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Check if the update actually happened
		rows, _ := result.RowsAffected()
		if rows == 0 {
			http.Error(w, "Rider not found. Check the email or onboarding status.", http.StatusNotFound)
			return
		}

		fmt.Fprintf(w, "Success: You are now %s", req.Status)
	}
}
func handleStartTrip(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			TripID string `json:"trip_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// We update the trip only if it was previously 'paid_escrow'
		res, err := db.ExecContext(ctx, 
			"UPDATE trips SET status = 'picked_up' WHERE trip_id = $1 AND status = 'paid_escrow'", 
			req.TripID)
		
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		rows, _ := res.RowsAffected()
		if rows == 0 {
			http.Error(w, "Cannot start trip: Trip is not in 'accepted' status or doesn't exist.", http.StatusConflict)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "in_progress",
			"message": "Trip started! Drive safely.",
		})
	}
}
func handleCompleteTrip(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Define the input expected from the Rider's App
		var req struct {
			TripID string  `json:"trip_id"`
			CurLat float64 `json:"current_lat"` // Rider's current GPS Latitude
			CurLng float64 `json:"current_lng"` // Rider's current GPS Longitude
		}

		// 1. Decode the JSON body
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input coordinates or Trip ID", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// 2. Start the Transaction
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			http.Error(w, "Internal server error: Transaction failed", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// 3. GET TRIP DATA & GEOLOCATION (Locking the row for update)
		var totalAmount, destLat, destLng float64
		var riderID string
		query := `
			SELECT actual_fare, rider_id, ST_Y(dropoff_location::geometry), ST_X(dropoff_location::geometry)
			FROM trips 
			WHERE trip_id = $1 AND status = 'picked_up' FOR UPDATE`
		
		err = tx.QueryRowContext(ctx, query, req.TripID).Scan(&totalAmount, &riderID, &destLat, &destLng)

		if err == sql.ErrNoRows {
			http.Error(w, "Trip not found or not currently 'in_progress'", http.StatusNotFound)
			return
		} else if err != nil {
			http.Error(w, "Database lookup error", http.StatusInternalServerError)
			return
		}

		// 4. GEOFENCING CHECK
		// 0.005 difference is roughly 500 meters. 
		// This prevents the rider from completing the trip prematurely.
		const threshold = 0.005 
		diffLat := req.CurLat - destLat
		diffLng := req.CurLng - destLng
		distanceSquared := (diffLat * diffLat) + (diffLng * diffLng)

		if distanceSquared > (threshold * threshold) {
			http.Error(w, "Access Denied: You are too far from the destination drop-off point.", http.StatusForbidden)
			return
		}

		// 5. CALCULATE THE EARNINGS (80% Rider / 20% Vrom)
		riderShare := totalAmount * 0.80
		vromCommission := totalAmount * 0.20

		// 6. EXECUTE THE MONEY MOVE
		// Move money to Rider's Wallet
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", riderShare, riderID)
		if err != nil { return }

		// Mark Trip as Completed (Delivered)
		_, err = tx.ExecContext(ctx, "UPDATE trips SET status = 'delivered' WHERE trip_id = $1", req.TripID)
		if err != nil { return }
		// Make Rider available again
		_, err = tx.ExecContext(ctx, "UPDATE rider_profiles SET is_available = true WHERE rider_id = $1", riderID)
		if err != nil { return }

		// 7. RECORD ACTIVITY LOG
		desc := fmt.Sprintf("Earnings from Trip #%s (Total KES %.2f)", req.TripID, totalAmount)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO user_activities (user_id, activity_type, description, amount, is_visible) 
			VALUES ($1, 'trip_earnings', $2, $3, true)`, 
			riderID, desc, riderShare)
		if err != nil { return }

		// 8. COMMIT THE CHANGES
		if err := tx.Commit(); err != nil {
			http.Error(w, "Finalizing payout failed", http.StatusInternalServerError)
			return
		}

		// 9. FINAL RESPONSE
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"earned_kes": riderShare,
			"commission_kes": vromCommission,
			"message": "Trip verified! Your earnings have been credited and you are now online.",
		})
	}
}
func handleGetActiveTrip(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        email := r.URL.Query().Get("email")
        
        query := `
            SELECT trip_id, status, actual_fare, ST_Y(dropoff_location::geometry), ST_X(dropoff_location::geometry)
            FROM trips 
            WHERE (buyer_id = (SELECT user_id FROM users WHERE email = $1) 
               OR rider_id = (SELECT user_id FROM users WHERE email = $1))
            AND status NOT IN ('completed', 'cancelled')
            LIMIT 1`

        var trip struct {
            ID      int     `json:"trip_id"`
            Status  string  `json:"status"`
            Amount  float64 `json:"amount"`
            Lat     float64 `json:"dest_lat"`
            Lng     float64 `json:"dest_lng"`
        }

        err := db.QueryRow(query, email).Scan(&trip.ID, &trip.Status, &trip.Amount, &trip.Lat, &trip.Lng)
        if err == sql.ErrNoRows {
            http.Error(w, "No active trip found", http.StatusNotFound)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(trip)
    }
}
func handleWithdrawToMpesa(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email  string  `json:"email"`
			Amount float64 `json:"amount"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		withdrawalFee := 10.0
		totalDeduction := req.Amount + withdrawalFee

		ctx := context.Background()
		tx, err := db.BeginTx(ctx, nil)
		if err != nil { return }

		// 1. GET RIDER BALANCE AND PHONE NUMBER
		var currentBalance float64
		var phoneNumber string
		var userID string
		err = tx.QueryRowContext(ctx, `
			SELECT w.balance, u.phone_number, u.user_id 
			FROM wallets w 
			JOIN users u ON w.user_id = u.user_id 
			WHERE u.email = $1 FOR UPDATE`, req.Email).Scan(&currentBalance, &phoneNumber, &userID)

		if err != nil {
			tx.Rollback()
			http.Error(w, "Rider details not found", http.StatusNotFound)
			return
		}

		// 2. VALIDATE BALANCE
		if currentBalance < req.Amount {
			tx.Rollback()
			http.Error(w, fmt.Sprintf("Insufficient balance. You need KES %.2f (including KES %.2f fee) but only have KES %.2f", req.Amount, withdrawalFee, currentBalance), http.StatusForbidden)
			return
		}

		// 3. DEDUCT FROM WALLET (including fee)
		newBalance := currentBalance - totalDeduction
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = $1 WHERE user_id = $2", newBalance, userID)
		if err != nil { tx.Rollback(); return }

		// 4. LOG THE TRANSACTION (Before calling M-Pesa API)
		_, err = tx.ExecContext(ctx, `
			INSERT INTO user_activities (user_id, activity_type, description, amount, balance_after) 
			VALUES ($1, 'mpesa_withdrawal', $2, $3, $4)`, 
			userID, fmt.Sprintf("M-Pesa Withdrawal to %s (Fee: KES %.2f)", phoneNumber, withdrawalFee), -totalDeduction, newBalance)

		if err != nil { tx.Rollback(); return }

		tx.Commit()
        go PublishTransactionEvent(userID, -totalDeduction)

		// 5. CALL MPESA B2C API (Placeholder for IntaSend/Safaricom Daraja)
		fmt.Printf("📲 Initiating M-Pesa B2C: KES %.2f to %s (Fee: KES %.2f)\n", req.Amount, phoneNumber, withdrawalFee)
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Processing",
			"message": fmt.Sprintf("KES %.2f is being sent to %s", req.Amount, phoneNumber),
			"fee": withdrawalFee,
			"new_balance": newBalance,
		})
	}
}

// ---------------------------------------------------------
// NEW: Wallet Deposit Endpoint for testing/topups
// ---------------------------------------------------------
func handleDeposit(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Amount float64 `json:"amount"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid data", http.StatusBadRequest)
			return
		}

		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		_, err := db.Exec("UPDATE wallets SET balance = balance + $1 WHERE user_id = (SELECT user_id FROM users WHERE email = $2)", req.Amount, email)
		if err != nil {
			http.Error(w, "Deposit failed", http.StatusInternalServerError)
			return
		}

		// Get user_id for Kafka event
		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)
		go PublishTransactionEvent(userID, req.Amount)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "Success",
			"message": fmt.Sprintf("KES %.2f deposited successfully!", req.Amount),
		})
	}
}

func handleGetBalance(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.Header.Get("X-User-Email")
		if email == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		var balance float64
		err := db.QueryRow("SELECT balance FROM wallets WHERE user_id = (SELECT user_id FROM users WHERE email = $1)", email).Scan(&balance)
		if err != nil {
			http.Error(w, "Wallet not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "Success",
			"balance": balance,
		})
	}
}

// Helper to publish transaction events to Kafka for Fraud Detection
func PublishTransactionEvent(userID string, amount float64) {
    if kafkaWriter == nil {
        return
    }

    event := map[string]interface{}{
        "transaction_id": fmt.Sprintf("tx-%d", time.Now().UnixNano()),
        "user_id":        userID,
        "amount":         amount,
        "timestamp":      time.Now().Unix(),
    }

    messageBytes, _ := json.Marshal(event)
    err := kafkaWriter.WriteMessages(context.Background(),
        kafka.Message{
            Key:   []byte(userID),
            Value: messageBytes,
        },
    )
    if err != nil {
        log.Printf("⚠️ Kafka Publish Error: %v", err)
    } else {
        fmt.Printf("📡 Kafka: Transaction event published for user %s\n", userID)
    }
}

// 4. THE MAIN ENTRY POINT
func main() {
    connStr := "postgres://postgres:37877975123@127.0.0.1:3000/Vromdatabase?sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Initialize Kafka Writer
    kafkaWriter = &kafka.Writer{
        Addr:     kafka.TCP("localhost:9092"),
        Topic:    "vrom.transactions.fraud_check",
        Balancer: &kafka.LeastBytes{},
    }
    defer kafkaWriter.Close()

    // High-Scale Connection Pooling configuration
    db.SetMaxOpenConns(100)          // Max concurrent connections
    db.SetMaxIdleConns(50)           // Max idle connections in the pool
    db.SetConnMaxLifetime(time.Hour) // Max age of a single connection
    // 2. Connect to the Rust Matching Engine
    grpcConn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf("❌ Could not connect to Rust Engine: %v", err)
    }
    defer grpcConn.Close()
    
    matchingClient := pb.NewMatchingEngineClient(grpcConn)

    // Verify DB connection
    if err := db.Ping(); err != nil {
        log.Fatalf("❌ CRITICAL: Could not connect to Database. Error: %v", err)
    }
    fmt.Println("✅ DATABASE CONNECTED")

    // Background cleanup
	go func() {
        for {
            CleanupUnverifiedUsers(db)
            time.Sleep(10 * time.Minute)
        }
    }()

    // 1. CUSTOMER & EVERYONE
    http.HandleFunc("/order/create", RequireRole(db, []string{"customer", "seller", "rider"}, handleCreateOrder(db)))
    http.HandleFunc("/ride/order/create", RequireRole(db, []string{"customer", "seller", "rider"}, handleCreateOrder(db)))
    http.HandleFunc("/order/complete", RequireRole(db, []string{"rider"}, handleCompleteOrder(db)))
    http.HandleFunc("/ride/order/complete", RequireRole(db, []string{"rider"}, handleCompleteOrder(db)))
    http.HandleFunc("/ride/request", RequireRole(db, []string{"customer", "seller", "rider"}, handleRequestRide(db, matchingClient)))
    http.HandleFunc("/ride/cancel", RequireRole(db, []string{"customer", "seller", "rider"}, handleCancelRide(db)))
    http.HandleFunc("/wallet/deposit", RequireRole(db, []string{"customer", "seller", "rider"}, handleDeposit(db)))
    http.HandleFunc("/ride/wallet/deposit", RequireRole(db, []string{"customer", "seller", "rider"}, handleDeposit(db)))
    http.HandleFunc("/wallet/balance", RequireRole(db, []string{"customer", "seller", "rider"}, handleGetBalance(db)))
    http.HandleFunc("/ride/wallet/balance", RequireRole(db, []string{"customer", "seller", "rider"}, handleGetBalance(db)))
    
    // Seller Order Management
    http.HandleFunc("/seller/order/reject", RequireRole(db, []string{"seller"}, handleSellerRejectOrder(db)))
    http.HandleFunc("/ride/seller/order/reject", RequireRole(db, []string{"seller"}, handleSellerRejectOrder(db)))

    // 2. SELLER ONLY: Uploading products and ordering stock
    http.HandleFunc("/seller/shop/create", RequireRole(db, []string{"seller"}, handleCreateShop(db)))
    http.HandleFunc("/ride/seller/shop/create", RequireRole(db, []string{"seller"}, handleCreateShop(db)))
    http.HandleFunc("/categories", handleGetCategories(db))
    http.HandleFunc("/ride/categories", handleGetCategories(db))
    http.HandleFunc("/seller/product/upload", RequireRole(db, []string{"seller"}, handleUploadProduct(db)))
    http.HandleFunc("/ride/seller/product/upload", RequireRole(db, []string{"seller"}, handleUploadProduct(db)))
    http.HandleFunc("/products/nearby", handleGetNearbyProducts(db))
    http.HandleFunc("/seller/stock/order", RequireRole(db, []string{"seller"}, handleOrderStock(db)))

    // 3. RIDER ONLY: Accepting deliveries and ride requests
    http.HandleFunc("/rider/delivery/accept", RequireRole(db, []string{"rider"}, handleAcceptDelivery(db)))
    http.HandleFunc("/ride/rider/delivery/accept", RequireRole(db, []string{"rider"}, handleAcceptDelivery(db)))
    http.HandleFunc("/rider/rates/update", RequireRole(db, []string{"rider"}, handleUpdateRiderRates(db)))
    //http.HandleFunc("/rider/ride/accept", RequireRole(db, []string{"rider"}, handleAcceptRide(db)))
    // Status toggle for riders
    http.HandleFunc("/rider/status", RequireRole(db, []string{"rider"}, handleToggleStatus(db)))
    http.HandleFunc("/rider/decision", RequireRole(db, []string{"rider"}, handleRiderDecision(db)))
    http.HandleFunc("/rider/start", RequireRole(db, []string{"rider"}, handleStartTrip(db)))
    http.HandleFunc("/rider/complete", RequireRole(db, []string{"rider", "admin"}, handleCompleteTrip(db)))
    http.HandleFunc("/trip/active", handleGetActiveTrip(db))
    http.HandleFunc("/wallet/withdraw", RequireRole(db, []string{"rider", "customer"}, handleWithdrawToMpesa(db)))

    http.HandleFunc("/register", handleRegister(db))
    http.HandleFunc("/onboard/rider", handleOnboardRider(db))
    http.HandleFunc("/ride/onboard/rider", handleOnboardRider(db))
    http.HandleFunc("/onboard/seller", handleOnboardSeller(db))
    http.HandleFunc("/ride/onboard/seller", handleOnboardSeller(db))
    http.HandleFunc("/admin/riders/pending", AdminOnly(db, handleGetPendingRiders(db)))
    http.HandleFunc("/admin/riders/approve", AdminOnly(db, handleApproveRider(db)))
    http.HandleFunc("/admin/riders/reject", AdminOnly(db, handleRejectRider(db)))
    http.HandleFunc("/admin/category/create", AdminOnly(db, handleCreateCategory(db)))
	http.HandleFunc("/verify-otp", handleVerifyOTP(db))
    //http.HandleFunc("/wallet/withdraw", handleWithdraw(db))
    http.HandleFunc("/login", handleLogin(db))
    http.HandleFunc("/ride/login", handleLogin(db))
    http.HandleFunc("/profile", handleProfile(db))
    http.HandleFunc("/profile/history/clear", handleDeleteHistory(db))
    http.HandleFunc("/delete-account", handleDeleteAccount(db))
    http.HandleFunc("/ride/delete-account", handleDeleteAccount(db))
	http.HandleFunc("/logout", handleLogout)
    http.HandleFunc("/ride/logout", handleLogout)

    // Senior Logger Middleware to see EVERY request
    loggingMiddleware := func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            fmt.Printf("🌐 [%s] %s from %s\n", r.Method, r.URL.Path, r.RemoteAddr)
            next.ServeHTTP(w, r)
        })
    }

    fmt.Println("🚀 Vrom Server running on http://localhost:8080")
    
    // Wrap the default mux with our logger
    log.Fatal(http.ListenAndServe(":8080", loggingMiddleware(http.DefaultServeMux)))
}

func handleVerifyOTP(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Email string `json:"email"`
            Code  string `json:"code"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Invalid input", http.StatusBadRequest)
            return
        }

        // Check if OTP matches and hasn't expired
        trimmedCode := strings.TrimSpace(req.Code)
        var userID string
        query := `
            SELECT user_id FROM otps 
            WHERE code = $1 AND user_id = (SELECT user_id FROM users WHERE email = $2)
            AND expires_at > CURRENT_TIMESTAMP`
        
        err := db.QueryRow(query, trimmedCode, req.Email).Scan(&userID)
        if err != nil {
            http.Error(w, "Invalid or expired OTP", http.StatusUnauthorized)
            return
        }

        // If match, verify the user!
        _, err = db.Exec("UPDATE users SET is_verified = true WHERE user_id = $1", userID)
        if err != nil {
            http.Error(w, "Database error", http.StatusInternalServerError)
            return
        }

        // Clean up: delete used OTP
        db.Exec("DELETE FROM otps WHERE user_id = $1", userID)

        fmt.Fprint(w, "OTP Verified! Redirecting to Home Page...")
    }
}
type UserProfile struct {
	FullName     string     `json:"full_name"`
	Email        string     `json:"email"`
	PhoneNumber  string     `json:"phone_number"`
	Role         string     `json:"role"`
	Balance      float64    `json:"balance"`
	History      []Activity `json:"history"`
	// Products []Product `json:"products,omitempty"` // Add this when you create your Product struct
}

func GetUserProfile(db *sql.DB, email string) (UserProfile, error) {
	var profile UserProfile
	// We JOIN the users table and wallets table on the user_id
query := `
    SELECT u.full_name, u.email, u.phone_number, w.balance 
    FROM users u 
	JOIN wallets w ON u.user_id = w.user_id
    WHERE u.email = $1`
	err := db.QueryRow(query, email).Scan(
		&profile.FullName, 
		&profile.Email, 
		&profile.PhoneNumber, 
		&profile.Balance,
	)
	return profile, err
}
func handleProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := r.URL.Query().Get("email")
		if email == "" {
			http.Error(w, "Email is required", http.StatusBadRequest)
			return
		}

		// 1. Get basic info & balance
		profile, err := GetUserProfile(db, email)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// 2. Get history (using the user_id we find via email)
		var userID string
		db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)
		
		history, err := GetUserHistory(db, userID)
		if err == nil {
			profile.History = history
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(profile)
	}
}