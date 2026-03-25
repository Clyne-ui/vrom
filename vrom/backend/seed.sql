-- 1. Create a Super Admin
INSERT INTO users (full_name, email, phone_number, password_hash, role, is_verified)
VALUES ('System Admin', 'admin@vrom.io', '+254700000000', '$2a$12$LQv3c1yqBWVHxkd0LHAkGuzmLvWJlzR.O7YzXb.B6m5n9E5pW0k2K', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Create some sample Users
INSERT INTO users (full_name, email, phone_number, password_hash, role, is_verified)
VALUES 
('Clyne Mwangi', 'clyne@vrom.io', '+254711111111', '$2a$12$LQv3c1yqBWVHxkd0LHAkGuzmLvWJlzR.O7YzXb.B6m5n9E5pW0k2K', 'rider', true),
('Alice Wanjiku', 'alice@gmail.com', '+254722222222', '$2a$12$LQv3c1yqBWVHxkd0LHAkGuzmLvWJlzR.O7YzXb.B6m5n9E5pW0k2K', 'customer', true),
('Emeka Okafor', 'emeka@vrom.io', '+234800000000', '$2a$12$LQv3c1yqBWVHxkd0LHAkGuzmLvWJlzR.O7YzXb.B6m5n9E5pW0k2K', 'rider', true)
ON CONFLICT (email) DO NOTHING;

-- 3. Create Wallets
INSERT INTO wallets (user_id, balance, locked_funds)
SELECT user_id, 50000.00, 2500.00 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create Sample Trips
INSERT INTO trips (trip_id, buyer_id, rider_id, actual_fare, status, pickup_location, dropoff_location, pickup_address, dropoff_address)
VALUES 
(uuid_generate_v4(), (SELECT user_id FROM users WHERE email='alice@gmail.com'), (SELECT user_id FROM users WHERE email='clyne@vrom.io'), 450.00, 'picked_up', ST_SetSRID(ST_MakePoint(36.8172, -1.2863), 4326), ST_SetSRID(ST_MakePoint(36.8225, -1.2954), 4326), 'Nairobi CBD', 'Westlands'),
(uuid_generate_v4(), (SELECT user_id FROM users WHERE email='alice@gmail.com'), (SELECT user_id FROM users WHERE email='emeka@vrom.io'), 1200.00, 'pending', ST_SetSRID(ST_MakePoint(3.3792, 6.5244), 4326), ST_SetSRID(ST_MakePoint(3.3614, 6.4520), 4326), 'Ikeja, Lagos', 'Victoria Island')
ON CONFLICT DO NOTHING;

-- 5. Create Security Alerts
INSERT INTO occ_security_alerts (type, severity, message, region)
VALUES 
('fraud', 'critical', 'Detected 5+ rapid failed payment attempts from User USR-9283 (Lagos)', 'nigeria'),
('security', 'high', 'Admin account accessed from new location (unknown IP: 192.168.4.12)', 'global'),
('anomaly', 'medium', 'Pickup density in Nairobi Downtown is 300% above normal distribution', 'kenya');

-- 6. Create Audit Logs
INSERT INTO occ_audit_log (admin_email, action, target_id, ip_address)
VALUES 
('admin@vrom.io', 'LOGIN', 'SYSTEM', '127.0.0.1'),
('admin@vrom.io', 'SYSTEM_MAINTENANCE_OFF', 'SYSTEM', '127.0.0.1');
