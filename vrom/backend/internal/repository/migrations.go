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

	// 5. Update order_status ENUM to include missing statuses
	_, _ = db.Exec(`
		DO $$ BEGIN
			-- Common across orders and trips
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'pending_payment') THEN
				ALTER TYPE order_status ADD VALUE 'pending_payment';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'rejected') THEN
				ALTER TYPE order_status ADD VALUE 'rejected';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'cancelled') THEN
				ALTER TYPE order_status ADD VALUE 'cancelled';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'completed') THEN
				ALTER TYPE order_status ADD VALUE 'completed';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'delivered') THEN
				ALTER TYPE order_status ADD VALUE 'delivered';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'in_progress') THEN
				ALTER TYPE order_status ADD VALUE 'in_progress';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'accepted') THEN
				ALTER TYPE order_status ADD VALUE 'accepted';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'picked_up') THEN
				ALTER TYPE order_status ADD VALUE 'picked_up';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'disputed') THEN
				ALTER TYPE order_status ADD VALUE 'disputed';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'paid_escrow') THEN
				ALTER TYPE order_status ADD VALUE 'paid_escrow';
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'seller_approved') THEN
				ALTER TYPE order_status ADD VALUE 'seller_approved';
			END IF;
		END $$;`)

	// 6. System Notifications Table
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS system_notifications (
			id TEXT PRIMARY KEY,
			type TEXT NOT NULL,
			title TEXT NOT NULL,
			message TEXT NOT NULL,
			read BOOLEAN DEFAULT FALSE,
			created_at TEXT NOT NULL
		)`)

	// 7. Regions Table
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS regions (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			country TEXT NOT NULL,
			currency TEXT NOT NULL,
			lat DOUBLE PRECISION NOT NULL,
			lng DOUBLE PRECISION NOT NULL,
			status TEXT DEFAULT 'active',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)`)

	// 8. Add assigned_region to Users for Regional Admins
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_region TEXT`)

	fmt.Println("✅ AUTO-MIGRATIONS COMPLETE")
}
