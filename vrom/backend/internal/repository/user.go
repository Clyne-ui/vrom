package repository

import (
	"context"
	"database/sql"
	"fmt"
	"vrom-backend/internal/models"
	"vrom-backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

func RegisterUser(db *sql.DB, u models.User) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), 12)
	if err != nil {
		return "", err
	}

	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}

	var userID string
	userQuery := `INSERT INTO users (full_name, email, phone_number, password_hash, role) 
                  VALUES ($1, $2, $3, $4, $5) RETURNING user_id`

	err = tx.QueryRowContext(ctx, userQuery, u.FullName, u.Email, u.PhoneNumber, hashedPassword, u.Role).Scan(&userID)
	if err != nil {
		tx.Rollback()
		return "", err
	}

	// Create wallet
	_, err = tx.ExecContext(ctx, `INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00)`, userID)
	if err != nil {
		tx.Rollback()
		return "", err
	}

	// ONLY generate OTP now if it's a customer
	if u.Role == "customer" {
		otpCode := utils.GenerateOTP()
		_, err = tx.ExecContext(ctx, `INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes')`, userID, otpCode)
		if err != nil {
			tx.Rollback()
			return "", err
		}
		fmt.Printf("✅ Customer OTP for %s: %s\n", u.Email, otpCode)
	}

	return userID, tx.Commit()
}

func GetUserHistory(db *sql.DB, userID string) ([]models.Activity, error) {
	rows, err := db.Query("SELECT id, activity_type, amount, description, created_at FROM user_activities WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.Activity
	for rows.Next() {
		var act models.Activity
		if err := rows.Scan(&act.ID, &act.ActivityType, &act.Amount, &act.Description, &act.CreatedAt); err != nil {
			return nil, err
		}
		history = append(history, act)
	}
	return history, nil
}

// UpdateFCMToken saves the latest Firebase device token for a user so we can send them push notifications.
func UpdateFCMToken(db *sql.DB, userID, token string) error {
	_, err := db.Exec("UPDATE users SET fcm_token = $1 WHERE user_id = $2", token, userID)
	return err
}

// GetFCMToken retrieves the Firebase device token for a user.
func GetFCMToken(db *sql.DB, userID string) (string, error) {
	var token sql.NullString
	err := db.QueryRow("SELECT fcm_token FROM users WHERE user_id = $1", userID).Scan(&token)
	if err != nil {
		return "", err
	}
	return token.String, nil
}

func RecordTransaction(db *sql.DB, userID string, aType string, desc string, amount float64) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	var currentBalance float64
	err = tx.QueryRowContext(ctx, "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE", userID).Scan(&currentBalance)
	if err != nil {
		tx.Rollback()
		return err
	}

	newBalance := currentBalance + amount

	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = $1 WHERE user_id = $2", newBalance, userID)
	if err != nil {
		tx.Rollback()
		return err
	}

	query := `INSERT INTO user_activities (user_id, activity_type, description, amount, balance_after) 
              VALUES ($1, $2, $3, $4, $5)`
	_, err = tx.ExecContext(ctx, query, userID, aType, desc, amount, newBalance)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func OnboardRider(db *sql.DB, data models.RiderOnboarding) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

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

	documents := []struct {
		Type string
		URL  string
	}{
		{"Certificate of Good Conduct", data.GoodConductURL},
		{"Selfie", data.SelfieURL},
		{"ID Front", data.IDFrontURL},
		{"ID Back", data.IDBackURL},
		{"Vehicle Photo", data.VehiclePhotoURL},
		{"Good Conduct", data.GoodConductURL},
	}

	docQuery := `
        INSERT INTO user_compliance_data (user_id, document_value, image_url, verification_status) 
        VALUES ($1, $2, $3, 'pending')`

	for _, doc := range documents {
		if doc.URL != "" {
			_, err = tx.ExecContext(ctx, docQuery, data.UserID, doc.Type, doc.URL)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	otpCode := utils.GenerateOTP()
	otpQuery := `INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes')`
	_, err = tx.ExecContext(ctx, otpQuery, data.UserID, otpCode)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func OnboardSeller(db *sql.DB, data models.SellerOnboarding) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	sellerQuery := `
        INSERT INTO seller_profiles (seller_id, business_name, shop_address) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (seller_id) DO UPDATE SET business_name = $2, shop_address = $3`

	_, err = tx.ExecContext(ctx, sellerQuery, data.UserID, data.ShopName, data.ShopAddress)
	if err != nil {
		tx.Rollback()
		return err
	}

	docQuery := `
        INSERT INTO user_compliance_data (user_id, document_value, image_url, verification_status) 
        VALUES ($1, $2, $3, 'pending')`

	documents := []struct {
		Type string
		URL  string
	}{
		{"Shop Logo", data.ShopLogoURL},
		{"Seller ID Front", data.IDFrontURL},
		{"Seller ID Back", data.IDBackURL},
	}

	for _, doc := range documents {
		if doc.URL != "" {
			_, err = tx.ExecContext(ctx, docQuery, data.UserID, doc.Type, doc.URL)
			if err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	otpCode := utils.GenerateOTP()
	otpQuery := `INSERT INTO otps (user_id, code, expires_at) VALUES ($1, $2, NOW() + interval '10 minutes')`
	_, err = tx.ExecContext(ctx, otpQuery, data.UserID, otpCode)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func ApproveRider(db *sql.DB, userID string) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	// 1. Mark user as verified
	_, err = tx.ExecContext(ctx, "UPDATE users SET is_verified = true WHERE user_id = $1", userID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 2. Update compliance status
	_, err = tx.ExecContext(ctx, "UPDATE user_compliance_data SET verification_status = 'approved' WHERE user_id = $1", userID)
	if err != nil {
		tx.Rollback()
		return err
	}

	// 3. RECORD THE ACTIVITY
	_, err = tx.ExecContext(ctx, `
        INSERT INTO user_activities (user_id, activity_type, description, amount) 
        VALUES ($1, 'system', 'Account successfully verified by Admin. You can now start taking trips.', 0)`,
		userID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func RejectRider(db *sql.DB, userID string, reason string) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	query := `UPDATE user_compliance_data 
              SET verification_status = 'rejected', 
                  document_value = $2
              WHERE user_id = $1`

	_, err = tx.ExecContext(ctx, query, userID, "REJECTED: "+reason)
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.ExecContext(ctx, "UPDATE users SET is_verified = false WHERE user_id = $1", userID)
	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}

func CheckAdminRole(db *sql.DB, email string) (bool, error) {
	var role string
	err := db.QueryRow("SELECT role FROM users WHERE email = $1", email).Scan(&role)
	if err != nil {
		return false, err
	}
	return role == "admin", nil
}

func GetUserProfile(db *sql.DB, email string) (models.UserProfile, error) {
	var profile models.UserProfile
	query := `
        SELECT u.full_name, u.email, u.phone_number, u.role, w.balance 
        FROM users u 
        JOIN wallets w ON u.user_id = w.user_id
        WHERE u.email = $1`
	err := db.QueryRow(query, email).Scan(
		&profile.FullName,
		&profile.Email,
		&profile.PhoneNumber,
		&profile.Role,
		&profile.Balance,
	)
	return profile, err
}

func GetPendingRiders(db *sql.DB) ([]models.PendingRider, error) {
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

	var riders []models.PendingRider
	for rows.Next() {
		var pr models.PendingRider
		if err := rows.Scan(&pr.UserID, &pr.FullName, &pr.VehicleType, &pr.IDImage); err != nil {
			return nil, err
		}
		riders = append(riders, pr)
	}
	return riders, nil
}

func WithdrawToMpesa(db *sql.DB, email string, amount float64) (float64, string, string, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, "", "", err
	}
	defer tx.Rollback()

	withdrawalFee := 10.0
	totalDeduction := amount + withdrawalFee

	var currentBalance float64
	var phoneNumber, userID string
	err = tx.QueryRowContext(ctx, `
		SELECT w.balance, u.phone_number, u.user_id 
		FROM wallets w 
		JOIN users u ON w.user_id = u.user_id 
		WHERE u.email = $1 FOR UPDATE`, email).Scan(&currentBalance, &phoneNumber, &userID)

	if err != nil {
		return 0, "", "", err
	}

	if currentBalance < totalDeduction {
		return 0, "", "", fmt.Errorf("insufficient balance. Need %.2f (inc fee) but have %.2f", totalDeduction, currentBalance)
	}

	newBalance := currentBalance - totalDeduction
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = $1 WHERE user_id = $2", newBalance, userID)
	if err != nil {
		return 0, "", "", err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO user_activities (user_id, activity_type, description, amount, balance_after) 
		VALUES ($1, 'mpesa_withdrawal', $2, $3, $4)`, 
		userID, fmt.Sprintf("M-Pesa Withdrawal to %s (Fee: KES %.2f)", phoneNumber, withdrawalFee), -totalDeduction, newBalance)
	if err != nil {
		return 0, "", "", err
	}

	if err := tx.Commit(); err != nil {
		return 0, "", "", err
	}

	return newBalance, phoneNumber, userID, nil
}

func DeleteAccount(db *sql.DB, email string) error {
	_, err := db.Exec("DELETE FROM users WHERE email = $1", email)
	return err
}

func DeleteHistory(db *sql.DB, email string) error {
	_, err := db.Exec("DELETE FROM user_activities WHERE user_id = (SELECT user_id FROM users WHERE email = $1)", email)
	return err
}

func CleanupUnverifiedUsers(db *sql.DB) {
	res, err := db.Exec("DELETE FROM users WHERE is_verified = false AND created_at < NOW() - interval '24 hours' AND role = 'customer'")
	if err != nil {
		fmt.Printf("⚠️ Cleanup Error: %v\n", err)
	} else {
		count, _ := res.RowsAffected()
		if count > 0 {
			fmt.Printf("🧹 Background Cleanup: Removed %d unverified accounts older than 24h\n", count)
		}
	}
}

func CreateResetToken(db *sql.DB, email, token string) error {
	var userID string
	err := db.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userID)
	if err != nil {
		return err
	}

	_, err = db.Exec("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + interval '15 minutes')", userID, token)
	return err
}

func ResetPasswordWithToken(db *sql.DB, token, newPassword string) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID string
	err = tx.QueryRowContext(ctx, `
		UPDATE password_reset_tokens 
		SET used = true 
		WHERE token = $1 AND used = false AND expires_at > NOW() 
		RETURNING user_id`, token).Scan(&userID)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("invalid or expired token")
		}
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "UPDATE users SET password_hash = $1 WHERE user_id = $2", hashedPassword, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
