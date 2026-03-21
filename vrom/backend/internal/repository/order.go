package repository

import (
	"context"
	"database/sql"
	"fmt"
	"vrom-backend/internal/models"
)

// SellerApproveOrder: Seller confirms they will prepare the item.
// System then finds the nearest available rider to assign for delivery.
// If no rider is available, returns a descriptive error — seller must wait.
func SellerApproveOrder(db *sql.DB, orderID, sellerID string, shopLat, shopLng float64) (string, string, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", "", err
	}
	defer tx.Rollback()

	// 1. Verify this order belongs to this seller and is in the correct state
	var status string
	err = tx.QueryRowContext(ctx,
		"SELECT status FROM orders WHERE order_id = $1 AND seller_id = $2 FOR UPDATE",
		orderID, sellerID).Scan(&status)
	if err != nil {
		return "", "", fmt.Errorf("order not found or you are not the seller")
	}

	if status != "paid_escrow" {
		return "", "", fmt.Errorf("this order is already being processed (status: %s)", status)
	}

	// 2. Find the nearest available rider within 10km of the shop
	var riderID, riderName string
	riderQuery := `
		SELECT rp.rider_id, u.full_name
		FROM rider_profiles rp
		JOIN users u ON rp.rider_id = u.user_id
		WHERE rp.is_available = true
		  AND ST_DWithin(
		      rp.current_location,
		      ST_SetSRID(ST_MakePoint($1, $2), 4326),
		      10000
		  )
		ORDER BY rp.current_location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
		LIMIT 1`

	err = tx.QueryRowContext(ctx, riderQuery, shopLng, shopLat).Scan(&riderID, &riderName)
	if err == sql.ErrNoRows {
		// No rider found — inform the seller to wait, but don't cancel the order
		return "", "", fmt.Errorf("no_rider_available: No riders are currently online near your shop. Your order is still active — we will notify you as soon as a rider becomes available")
	}
	if err != nil {
		return "", "", fmt.Errorf("failed to find rider: %v", err)
	}

	// 3. Assign the rider and mark the order as seller-approved
	_, err = tx.ExecContext(ctx,
		"UPDATE orders SET status = 'seller_approved', rider_id = $1 WHERE order_id = $2",
		riderID, orderID)
	if err != nil {
		return "", "", err
	}

	// 4. Mark rider as busy
	_, err = tx.ExecContext(ctx,
		"UPDATE rider_profiles SET is_available = false WHERE rider_id = $1", riderID)
	if err != nil {
		return "", "", err
	}

	if err := tx.Commit(); err != nil {
		return "", "", err
	}

	return riderID, riderName, nil
}

// CompleteOrder handles the fund split and order finalization
func CreateOrder(db *sql.DB, buyerEmail string, req models.OrderInput, otp string) (string, float64, float64, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", 0, 0, err
	}
	defer tx.Rollback()

	// 1. Get Buyer ID and lock wallet
	var buyerID string
	var balance float64
	err = tx.QueryRowContext(ctx, "SELECT user_id, balance FROM wallets WHERE user_id = (SELECT user_id FROM users WHERE email = $1) FOR UPDATE", buyerEmail).Scan(&buyerID, &balance)
	if err != nil {
		return "", 0, 0, err
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
		return "", 0, 0, err
	}

	if stockCount < req.Quantity {
		return "", 0, 0, fmt.Errorf("insufficient stock")
	}

	// 3. Calculate distance and shipping fee
	var distance float64
	distQuery := `SELECT ST_Distance(
		ST_SetSRID(ST_MakePoint($1, $2), 4326),
		ST_SetSRID(ST_MakePoint($3, $4), 4326)
	)::float8 / 1000` // dist in km
	err = tx.QueryRowContext(ctx, distQuery, shopLng, shopLat, req.DeliveryLng, req.DeliveryLat).Scan(&distance)
	if err != nil {
		return "", 0, 0, err
	}

	shippingFee := 50.0 + (distance * 20.0)
	totalItemCost := productPrice * float64(req.Quantity)
	totalAmount := totalItemCost + shippingFee

	// 4. Determine status and handle escrow
	var status string = "paid_escrow"
	if balance < totalAmount {
		status = "pending_payment"
	} else {
		_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance - $1, locked_funds = locked_funds + $1 WHERE user_id = $2", totalAmount, buyerID)
		if err != nil {
			return "", 0, 0, err
		}
	}

	// 5. Update stock (We reserve stock even if payment is pending)
	_, err = tx.ExecContext(ctx, "UPDATE products SET stock_count = stock_count - $1 WHERE product_id = $2", req.Quantity, req.ProductID)
	if err != nil {
		return "", 0, 0, err
	}

	// 6. Create Order entry
	var orderID string
	orderQuery := `
		INSERT INTO orders (buyer_id, product_id, seller_id, total_amount, status, delivery_otp, quantity)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING order_id`
	err = tx.QueryRowContext(ctx, orderQuery, buyerID, req.ProductID, sellerID, totalAmount, status, otp, req.Quantity).Scan(&orderID)
	if err != nil {
		return "", 0, 0, err
	}

	// 7. Record Transaction (Only if paid)
	if status == "paid_escrow" {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
			VALUES ($1, $2, $3, 'ESCROW_LOCK')`,
			buyerID, orderID, totalAmount)
		if err != nil {
			return "", 0, 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return "", 0, 0, err
	}

	if status == "pending_payment" {
		return orderID, totalAmount, shippingFee, fmt.Errorf("PAYMENT_REQUIRED: Insufficient balance for order %s", orderID)
	}

	return orderID, totalAmount, shippingFee, nil
}

func SellerRejectOrder(db *sql.DB, orderID, sellerID string) (string, float64, int, string, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", 0, 0, "", err
	}
	defer tx.Rollback()

	// 1. Lock Order and verify
	var buyerID, productID, status string
	var totalAmount float64
	var quantity int
	query := "SELECT buyer_id, product_id, total_amount, status, quantity FROM orders WHERE order_id = $1 AND seller_id = $2 FOR UPDATE"
	err = tx.QueryRowContext(ctx, query, orderID, sellerID).Scan(&buyerID, &productID, &totalAmount, &status, &quantity)
	if err != nil {
		return "", 0, 0, "", err
	}

	if status != "paid_escrow" {
		return "", 0, 0, "", fmt.Errorf("only new orders can be rejected")
	}

	// 2. Update Order Status
	_, err = tx.ExecContext(ctx, "UPDATE orders SET status = 'cancelled' WHERE order_id = $1", orderID)
	if err != nil {
		return "", 0, 0, "", err
	}

	// 3. Return Funds to Buyer
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1, locked_funds = locked_funds - $1 WHERE user_id = $2", totalAmount, buyerID)
	if err != nil {
		return "", 0, 0, "", err
	}

	// 4. Restock the item
	_, err = tx.ExecContext(ctx, "UPDATE products SET stock_count = stock_count + $1 WHERE product_id = $2", quantity, productID)
	if err != nil {
		return "", 0, 0, "", err
	}

	// 5. Record Refund Transaction
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
		VALUES ($1, $2, $3, 'REFUND')`,
		buyerID, orderID, totalAmount)
	if err != nil {
		return "", 0, 0, "", err
	}

	if err := tx.Commit(); err != nil {
		return "", 0, 0, "", err
	}

	return buyerID, totalAmount, quantity, productID, nil
}

func CompleteOrder(db *sql.DB, orderID, riderID, inputOTP string) (float64, float64, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
// ... rest of the file ...
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	// 1. Lock Order and verify
	var buyerID, sellerID, currentRiderID string
	var totalAmount float64
	var status, deliveryOTP string
	query := "SELECT buyer_id, seller_id, rider_id, total_amount, status, delivery_otp FROM orders WHERE order_id = $1 FOR UPDATE"
	err = tx.QueryRowContext(ctx, query, orderID).Scan(&buyerID, &sellerID, &currentRiderID, &totalAmount, &status, &deliveryOTP)
	if err != nil {
		return 0, 0, err
	}

	if status != "picked_up" {
		return 0, 0, fmt.Errorf("order is not in delivery status")
	}

	if currentRiderID != riderID {
		return 0, 0, fmt.Errorf("unauthorized rider")
	}

	if inputOTP != deliveryOTP {
		return 0, 0, fmt.Errorf("invalid delivery OTP")
	}

	// 2. Release Funds (70% Seller, 20% Rider, 10% Vrom)
	sellerShare := totalAmount * 0.70
	riderShare := totalAmount * 0.20

	// Update Seller Wallet
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", sellerShare, sellerID)
	if err != nil { return 0, 0, err }

	// Update Rider Wallet
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2", riderShare, riderID)
	if err != nil { return 0, 0, err }

	// Deduct from Buyer's Locked Funds
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET locked_funds = locked_funds - $1 WHERE user_id = $2", totalAmount, buyerID)
	if err != nil { return 0, 0, err }

	// 3. Update Order Status
	_, err = tx.ExecContext(ctx, "UPDATE orders SET status = 'delivered', otp_verified = true WHERE order_id = $1", orderID)
	if err != nil { return 0, 0, err }

	// 4. Record Transaction
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
		VALUES ($1, $2, $3, 'FUNDS_RELEASE')`, 
		buyerID, orderID, totalAmount)
	if err != nil { return 0, 0, err }

	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}

	return riderShare, sellerShare, nil
}

func AuthorizeOrderPayment(db *sql.DB, orderID string) (string, float64, error) {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", 0, err
	}
	defer tx.Rollback()

	var amount float64
	var buyerID, sellerID string
	err = tx.QueryRowContext(ctx, "SELECT total_amount, buyer_id, seller_id FROM orders WHERE order_id = $1 AND status = 'pending_payment' FOR UPDATE", orderID).Scan(&amount, &buyerID, &sellerID)
	if err != nil {
		return "", 0, fmt.Errorf("order not found or already paid")
	}

	_, err = tx.ExecContext(ctx, "UPDATE wallets SET locked_funds = locked_funds + $1 WHERE user_id = $2", amount, buyerID)
	if err != nil {
		return "", 0, err
	}

	_, err = tx.ExecContext(ctx, "UPDATE orders SET status = 'paid_escrow' WHERE order_id = $1", orderID)
	if err != nil {
		return "", 0, err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO wallet_transactions (wallet_id, order_id, amount, transaction_type)
		VALUES ($1, $2, $3, 'ESCROW_LOCK')`,
		buyerID, orderID, amount)
	if err != nil {
		return "", 0, err
	}

	if err := tx.Commit(); err != nil {
		return "", 0, err
	}

	return sellerID, amount, nil
}
