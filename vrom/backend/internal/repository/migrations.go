package repository

import (
	"database/sql"
	"fmt"
)

// InitDatabase ensures all tables from recent updates are present in the DB.
// This prevents 500 errors when a developer hasn't re-run the full SQL script.
func InitDatabase(db *sql.DB) {
	fmt.Println("🔄 RUNNING AUTO-MIGRATIONS...")

	// 1. OTPS Table
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS otps (
			user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
			code CHAR(4) NOT NULL,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`)

	// 2. User Activities Table
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS user_activities (
			id SERIAL PRIMARY KEY,
			user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
			activity_type TEXT NOT NULL,
			amount DECIMAL(15, 2),
			description TEXT,
			balance_after DECIMAL(15, 2),
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`)

	// 3. AI Content Flags
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS ai_content_flags (
			flag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			product_id UUID REFERENCES products(product_id),
			reason TEXT,
			status TEXT DEFAULT 'pending',
			flagged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`)

	// 4. Security Alerts Table
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS occ_security_alerts (
			alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			type TEXT NOT NULL, -- 'fraud', 'suspicious_activity', 'compliance'
			severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
			message TEXT NOT NULL,
			status TEXT DEFAULT 'active', -- 'active', 'resolved', 'ignored'
			region TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			resolved_at TIMESTAMP WITH TIME ZONE
		)`)

	// 4. Trips Table enhancements (OTP)
	_, _ = db.Exec("ALTER TABLE trips ADD COLUMN IF NOT EXISTS delivery_otp CHAR(4)")

	// 5. Update order_status ENUM to include 'pending_payment'
	// Note: Postgres doesn't support IF NOT EXISTS for ADD VALUE easily in a single line,
	// so we use a small block to check first.
	_, _ = db.Exec(`
		DO $$ BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'pending_payment') THEN
				ALTER TYPE order_status ADD VALUE 'pending_payment';
			END IF;
		END $$;`)

	fmt.Println("✅ AUTO-MIGRATIONS COMPLETE")
}
