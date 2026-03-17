package repository

import (
	"context"
	"database/sql"
	"fmt"
	"vrom-backend/internal/models"
)

func CreateShop(db *sql.DB, s models.Shop) (string, error) {
	query := `
		INSERT INTO shops (seller_id, shop_name, shop_address, shop_location)
		VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
		RETURNING shop_id`

	var newShopID string
	err := db.QueryRow(query, s.SellerID, s.ShopName, s.ShopAddress, s.Lng, s.Lat).Scan(&newShopID)
	return newShopID, err
}

func GetCategories(db *sql.DB) ([]models.Category, error) {
	rows, err := db.Query("SELECT category_id, name, description, icon_url FROM categories ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		var desc, icon sql.NullString
		if err := rows.Scan(&c.CategoryID, &c.Name, &desc, &icon); err != nil {
			continue
		}
		c.Description = desc.String
		c.IconURL = icon.String
		categories = append(categories, c)
	}
	return categories, nil
}

func CreateCategory(db *sql.DB, c models.Category) (string, error) {
	query := `
		INSERT INTO categories (name, description, icon_url)
		VALUES ($1, $2, $3)
		RETURNING category_id`
	
	var newID string
	err := db.QueryRow(query, c.Name, c.Description, c.IconURL).Scan(&newID)
	return newID, err
}

func CreateProduct(db *sql.DB, p models.Product) (string, error) {
    query := `
        INSERT INTO products (seller_id, shop_id, category_id, title, price, image_url, stock_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING product_id`
    
    var newID string
    err := db.QueryRow(query, p.SellerID, p.ShopID, p.CategoryID, p.Title, p.Price, p.ImageURL, p.StockCount).Scan(&newID)
    return newID, err
}

func OrderStock(db *sql.DB, sellerID, productID string, quantity int, costPerUnit float64) error {
	ctx := context.Background()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	totalCost := float64(quantity) * costPerUnit

	// Deduct from seller wallet
	_, err = tx.ExecContext(ctx, "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2", totalCost, sellerID)
	if err != nil {
		return fmt.Errorf("insufficient funds for stock: %v", err)
	}

	// Increase stock
	_, err = tx.ExecContext(ctx, "UPDATE products SET stock_count = stock_count + $1 WHERE product_id = $2 AND seller_id = $3", quantity, productID, sellerID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func GetNearbyProducts(db *sql.DB, input models.DiscoveryInput) ([]models.Product, error) {
	query := `
		SELECT p.product_id, p.title, p.price, p.image_url, p.stock_count, p.shop_id
		FROM products p
		JOIN shops s ON p.shop_id = s.shop_id
		WHERE ST_DWithin(s.shop_location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
	`
	args := []interface{}{input.Lng, input.Lat, input.Radius}

	if input.CategoryID != "" {
		query += " AND p.category_id = $4"
		args = append(args, input.CategoryID)
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ProductID, &p.Title, &p.Price, &p.ImageURL, &p.StockCount, &p.ShopID); err != nil {
			continue
		}
		products = append(products, p)
	}
	return products, nil
}
