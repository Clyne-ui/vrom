SELECT * FROM wallets;
-- ==========================================
-- 1. CLEANUP (Wipe the slate clean for testing)
-- ==========================================
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS seller_profiles CASCADE;
DROP TABLE IF EXISTS rider_profiles CASCADE;
DROP TABLE IF EXISTS user_compliance_data CASCADE;
DROP TABLE IF EXISTS compliance_requirements CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ==========================================
-- 2. EXTENSIONS & TYPES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TYPE user_role AS ENUM ('customer', 'seller', 'rider', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'pending_payment', 'paid_escrow', 'picked_up', 'delivered', 'disputed', 'cancelled');
CREATE TYPE order_type AS ENUM ('marketplace', 'service', 'ride');

-- ==========================================
-- 3. IDENTITY & COMPLIANCE
-- ==========================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    is_verified BOOLEAN DEFAULT FALSE,
    fcm_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compliance_requirements (
    requirement_id SERIAL PRIMARY KEY,
    country_code CHAR(2) NOT NULL, 
    target_role user_role NOT NULL,
    document_name TEXT NOT NULL, 
    is_mandatory BOOLEAN DEFAULT TRUE,
    description TEXT
);

CREATE TABLE ai_content_flags (
    flag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(product_id),
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    flagged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE occ_audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_flagged BOOLEAN DEFAULT FALSE;

CREATE TABLE user_compliance_data (
    data_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    requirement_id INT REFERENCES compliance_requirements(requirement_id),
    document_value TEXT, 
    image_url TEXT, 
    verification_status TEXT DEFAULT 'pending', 
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE password_reset_tokens (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE TABLE otps (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    code CHAR(4) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. PROFILES (Sellers & Riders)
-- ==========================================
CREATE TABLE rider_profiles (
    rider_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL, 
    model_year INT NOT NULL,
    plate_number TEXT UNIQUE NOT NULL,
    current_location GEOGRAPHY(POINT, 4326),
    is_available BOOLEAN DEFAULT TRUE,
    avg_rating DECIMAL(3,2) DEFAULT 5.00
);

CREATE TABLE seller_profiles (
    seller_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_image_url TEXT,
    avg_rating DECIMAL(3,2) DEFAULT 5.00
);

CREATE TABLE shops (
    shop_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES seller_profiles(seller_id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    shop_image_url TEXT,
    shop_location GEOGRAPHY(POINT, 4326),
    shop_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. MARKETPLACE & LOGISTICS
-- ==========================================
CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES seller_profiles(seller_id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(shop_id) ON DELETE CASCADE, -- Linked to a specific physical location
    title TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    image_url TEXT NOT NULL,
    stock_count INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE trips (
    trip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    rider_id UUID REFERENCES rider_profiles(rider_id) ON DELETE CASCADE,
    pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT,
    dropoff_address TEXT,
    estimated_distance_km DECIMAL(10, 2),
    actual_fare DECIMAL(12, 2) NOT NULL,
    status order_status DEFAULT 'pending',
    trip_otp CHAR(4) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
    seller_id UUID REFERENCES seller_profiles(seller_id) ON DELETE CASCADE,
    rider_id UUID REFERENCES rider_profiles(rider_id) ON DELETE CASCADE,
    total_amount DECIMAL(12, 2) NOT NULL,
    status order_status DEFAULT 'pending',
    delivery_otp CHAR(4) NOT NULL,
    otp_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. FINANCIALS (Hacker-Proof Ledger)
-- ==========================================
CREATE TABLE wallets (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    locked_funds DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE wallet_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(user_id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL, 
    transaction_type TEXT NOT NULL, -- 'ESCROW_LOCK', 'FUNDS_RELEASE', 'WITHDRAWAL', 'REFUND'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_activities (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    amount DECIMAL(15, 2),
    description TEXT,
    balance_after DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_rider_location ON rider_profiles USING GIST (current_location);
CREATE INDEX idx_trips_pickup ON trips USING GIST (pickup_location);