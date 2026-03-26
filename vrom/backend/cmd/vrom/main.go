package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
	vrom_http "vrom-backend/internal/api/http"
	"vrom-backend/internal/api/middleware"
	"vrom-backend/internal/api/websocket"
	"vrom-backend/internal/events"
	"vrom-backend/internal/repository"
	"vrom-backend/internal/services"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: No .env file found. Using default/environment variables.")
	}

	// Database connection string for port 3000
	connStr := "postgres://postgres:37877975123@127.0.0.1:3000/Vromdatabase?sslmode=disable"
	fmt.Printf("📂 CONNECTING TO DATABASE: %s\n", connStr)
	db, err := repository.ConnectDB(connStr)
	if err != nil {
		log.Fatalf("❌ CRITICAL: Could not connect to Database: %v", err)
	}
	defer db.Close()

	fmt.Println("✅ DATABASE CONNECTED")

	// Run Auto-Migrations for missing tables
	repository.InitDatabase(db)

	// Initialize Kafka Producer
	events.InitKafkaWriter("localhost:9092", "vrom.transactions.fraud_check")
	defer events.Writer.Close()
	fmt.Println("📡 KAFKA PRODUCER INITIALIZED")

	// Initialize Firebase Admin SDK
	// IMPORTANT: Update this path to your actual service account JSON file!
	err = services.InitFirebase("vrom-firebase-adminsdk.json")
	if err != nil {
		log.Printf("⚠️ Firebase Warning: %v (Push notifications will be disabled)", err)
	}

	mux := http.NewServeMux()
	rustAddr := "localhost:50051"

	// Background cleanup of unverified users
	go func() {
		for {
			repository.CleanupUnverifiedUsers(db)
			time.Sleep(10 * time.Minute)
		}
	}()

	// Initialize WebSocket Hub
	wsHub := websocket.NewHub("localhost:6379")
	go wsHub.Run()
	fmt.Println("🔌 WEBSOCKET HUB INITIALIZED")

	// Initialize Auth Service with Redis (for token revocation)
	services.InitAuthService(wsHub.RedisClient)

	// Initialize Spatial Service with Redis (for dynamic surge pricing)
	vrom_http.InitSpatialService(wsHub.RedisClient)

	// --- 0. WEBSOCKET ROUTE ---
	mux.HandleFunc("/ws/rider", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(wsHub, w, r)
	})
	mux.HandleFunc("/ws/occ", middleware.AdminOnly(db, func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(wsHub, w, r)
	}))

	// --- 1. AUTH & USER HANDLERS ---
	mux.HandleFunc("/register", vrom_http.HandleRegister(db))
	mux.HandleFunc("/login", vrom_http.HandleLogin(db))
	mux.HandleFunc("/ride/login", vrom_http.HandleLogin(db))
	mux.HandleFunc("/logout", vrom_http.HandleLogout)
	mux.HandleFunc("/ride/logout", vrom_http.HandleLogout)
	mux.HandleFunc("/verify-otp", vrom_http.HandleVerifyOTP(db))
	mux.HandleFunc("/request-password-reset", vrom_http.HandleRequestPasswordReset(db))
	mux.HandleFunc("/reset-password", vrom_http.HandleResetPassword(db))
	mux.HandleFunc("/auth/refresh", vrom_http.HandleRefreshToken(db))
	mux.HandleFunc("/profile", middleware.RequireRole(db, []string{"customer", "seller", "rider", "admin"}, vrom_http.HandleProfile(db)))
	mux.HandleFunc("/profile/update", middleware.RequireRole(db, []string{"customer", "seller", "rider", "admin"}, vrom_http.HandleUpdateProfile(db)))
	mux.HandleFunc("/profile/statement", middleware.RequireRole(db, []string{"customer", "seller", "rider", "admin"}, vrom_http.HandleGetStatement(db)))

	mux.HandleFunc("/delete-account", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleDeleteAccount(db)))
	mux.HandleFunc("/ride/delete-account", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleDeleteAccount(db)))
	mux.HandleFunc("/fcm/token", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleUpdateFCMToken(db)))

	// --- 2. WALLET HANDLERS ---
	mux.HandleFunc("/wallet/balance", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleGetBalance(db)))
	mux.HandleFunc("/ride/wallet/balance", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleGetBalance(db)))
	mux.HandleFunc("/wallet/deposit", middleware.RequireRole(db, []string{"customer"}, vrom_http.HandleDeposit(db)))
	mux.HandleFunc("/ride/wallet/deposit", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleDeposit(db)))
	mux.HandleFunc("/wallet/verify", middleware.RequireRole(db, []string{"customer"}, vrom_http.HandleVerifyPayment(db)))
	mux.HandleFunc("/paystack-webhook", vrom_http.HandlePaystackWebhook(db)) // No Auth: verify via HMAC
	mux.HandleFunc("/wallet/paystack/webhook", vrom_http.HandlePaystackWebhook(db)) // No Auth: verify via HMAC
	mux.HandleFunc("/wallet/withdraw", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleWithdrawToMpesa(db)))
	mux.HandleFunc("/user/profile/update", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleUpdateProfile(db)))
	mux.HandleFunc("/user/account/delete", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleDeleteAccount(db)))
	mux.HandleFunc("/user/statement", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleGetDetailedStatement(db)))
	mux.HandleFunc("/user/history/trips", middleware.RequireRole(db, []string{"customer", "rider"}, vrom_http.HandleGetTripHistory(db)))
	mux.HandleFunc("/user/history/orders", middleware.RequireRole(db, []string{"customer", "seller"}, vrom_http.HandleGetOrderHistory(db)))

	mux.HandleFunc("/media/upload", vrom_http.HandleUploadImage(db))

	// --- 3. COMMERCE HANDLERS ---
	mux.HandleFunc("/categories", vrom_http.HandleGetCategories(db))
	mux.HandleFunc("/ride/categories", vrom_http.HandleGetCategories(db))
	mux.HandleFunc("/products/nearby", vrom_http.HandleGetNearbyProducts(db))
	mux.HandleFunc("/seller/shop/create", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleCreateShop(db)))
	mux.HandleFunc("/ride/seller/shop/create", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleCreateShop(db)))
	mux.HandleFunc("/seller/product/upload", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleUploadProduct(db)))
	mux.HandleFunc("/ride/seller/product/upload", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleUploadProduct(db)))
	mux.HandleFunc("/seller/product/edit", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleEditProduct(db)))
	mux.HandleFunc("/seller/product/delete", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleDeleteProduct(db)))
	mux.HandleFunc("/seller/stock/order", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleOrderStock(db)))
	mux.HandleFunc("/order/create", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleCreateOrder(db)))
	mux.HandleFunc("/ride/order/create", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleCreateOrder(db)))
	mux.HandleFunc("/order/complete", middleware.RequireRole(db, []string{"rider"}, vrom_http.HandleCompleteOrder(db)))
	mux.HandleFunc("/ride/order/complete", middleware.RequireRole(db, []string{"rider"}, vrom_http.HandleCompleteOrder(db)))
	mux.HandleFunc("/seller/order/approve", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleSellerApproveOrder(db)))
	mux.HandleFunc("/seller/order/reject", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleSellerRejectOrder(db)))
	mux.HandleFunc("/ride/seller/order/reject", middleware.RequireRole(db, []string{"seller"}, vrom_http.HandleSellerRejectOrder(db)))

	// --- 4. RIDE-SHARING & SPATIAL HANDLERS ---
	mux.HandleFunc("/onboard/rider", vrom_http.HandleOnboardRider(db))
	mux.HandleFunc("/ride/onboard/rider", vrom_http.HandleOnboardRider(db))
	mux.HandleFunc("/onboard/seller", vrom_http.HandleOnboardSeller(db))
	mux.HandleFunc("/ride/onboard/seller", vrom_http.HandleOnboardSeller(db))
	
	mux.HandleFunc("/rider/status", middleware.RequireRole(db, []string{"rider"}, vrom_http.HandleToggleStatus(db)))
	mux.HandleFunc("/rider/decision", middleware.RequireRole(db, []string{"rider"}, vrom_http.HandleRiderDecision(db)))
	mux.HandleFunc("/rider/start", middleware.RequireRole(db, []string{"rider"}, vrom_http.HandleStartTrip(db)))
	mux.HandleFunc("/rider/complete", middleware.RequireRole(db, []string{"rider"}, vrom_http.HandleCompleteTrip(db)))
	
	mux.HandleFunc("/nearby", vrom_http.HandleGetNearby(rustAddr))
	mux.HandleFunc("/ride/request", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleRequestRide(db, rustAddr)))
	mux.HandleFunc("/ride/cancel", middleware.RequireRole(db, []string{"customer", "seller", "rider"}, vrom_http.HandleCancelRide(db)))
	mux.HandleFunc("/trip/active", vrom_http.HandleGetActiveTrip(db))

	// --- 5. ADMIN HANDLERS ---
	mux.HandleFunc("/admin/riders/pending", middleware.AdminOnly(db, vrom_http.HandleGetPendingRiders(db)))
	mux.HandleFunc("/admin/riders/approve", middleware.AdminOnly(db, vrom_http.HandleApproveRider(db)))
	mux.HandleFunc("/admin/riders/reject", middleware.AdminOnly(db, vrom_http.HandleRejectRider(db)))

	// --- 6. AI & ANALYTICS HANDLERS ---
	aiAddr := "127.0.0.1:50052"
	mux.HandleFunc("/ai/support", vrom_http.HandleSupportChat(aiAddr))
	mux.HandleFunc("/ai/eta", vrom_http.HandlePredictETA(aiAddr))

	// --- 7. OPERATIONS CONTROL CENTER (OCC) ---
	// SSE Streams (Cannot be wrapped in standard middleware if it buffers, but our AdminOnly is fine)
	mux.HandleFunc("/occ/stream/financials", middleware.AdminOnly(db, vrom_http.HandleOCCFinancialStream(db)))
	mux.HandleFunc("/occ/stream/health", middleware.AdminOnly(db, vrom_http.HandleOCCHealthStream()))
	// Analytics
	mux.HandleFunc("/occ/health/", middleware.AdminOnly(db, vrom_http.HandleGetServiceHealth(db)))
	mux.HandleFunc("/occ/notifications", middleware.AdminOnly(db, vrom_http.HandleGetNotifications(db)))
	mux.HandleFunc("/occ/notifications/read-all", middleware.AdminOnly(db, vrom_http.HandleMarkAllRead(db)))
	mux.HandleFunc("/occ/notifications/clear", middleware.AdminOnly(db, vrom_http.HandleClearNotifications(db)))
	mux.HandleFunc("/occ/notifications/", middleware.AdminOnly(db, func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			vrom_http.HandleMarkNotificationRead(db)(w, r)
		case http.MethodDelete:
			vrom_http.HandleDeleteNotification(db)(w, r)
		default:
			http.NotFound(w, r)
		}
	}))
	// Analytics
	mux.HandleFunc("/occ/analytics/financials", middleware.AdminOnly(db, vrom_http.HandleOCCGetFinancials(db)))
	mux.HandleFunc("/occ/analytics/escrow", middleware.AdminOnly(db, vrom_http.HandleOCCGetEscrow(db)))
	
	// Regions & Admin Management
	mux.HandleFunc("/occ/regions", middleware.AdminOnly(db, func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			vrom_http.HandleGetRegions(db)(w, r)
		case http.MethodPost:
			vrom_http.HandleCreateRegion(db)(w, r)
		default:
			http.NotFound(w, r)
		}
	}))
	mux.HandleFunc("/occ/admins", middleware.AdminOnly(db, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			vrom_http.HandleCreateAdmin(db)(w, r)
		} else {
			http.NotFound(w, r)
		}
	}))

	// CRM
	mux.HandleFunc("/occ/crm/search", middleware.AdminOnly(db, vrom_http.HandleOCCSearchUsers(db)))
	mux.HandleFunc("/occ/crm/history", middleware.AdminOnly(db, vrom_http.HandleOCCGetUserHistory(db)))
	// Kill Switch
	mux.HandleFunc("/occ/admin/suspend", middleware.AdminOnly(db, vrom_http.HandleOCCSuspendUser(db)))
	mux.HandleFunc("/occ/admin/unsuspend", middleware.AdminOnly(db, vrom_http.HandleOCCUnsuspendUser(db)))
	mux.HandleFunc("/occ/admin/maintenance", middleware.AdminOnly(db, vrom_http.HandleOCCToggleMaintenance(db)))
	mux.HandleFunc("/occ/admin/maintenance/status", middleware.AdminOnly(db, vrom_http.HandleOCCGetMaintenanceStatus()))
	// Security Alerts
	mux.HandleFunc("/occ/security/alerts", middleware.AdminOnly(db, vrom_http.HandleOCCGetSecurityAlerts(db)))
	mux.HandleFunc("/occ/security/resolve", middleware.AdminOnly(db, vrom_http.HandleOCCResolveAlert(db)))
	mux.HandleFunc("/occ/fleet/live", middleware.AdminOnly(db, vrom_http.HandleOCCGetLiveFleet(db)))
	// Disputes
	mux.HandleFunc("/occ/disputes", middleware.AdminOnly(db, vrom_http.HandleOCCGetDisputes(db)))
	mux.HandleFunc("/occ/disputes/resolve", middleware.AdminOnly(db, vrom_http.HandleOCCResolveDispute(db)))
	// Audit & Leaderboard
	mux.HandleFunc("/occ/audit/log", middleware.AdminOnly(db, vrom_http.HandleOCCGetAuditLog(db)))
	mux.HandleFunc("/occ/leaderboard", middleware.AdminOnly(db, vrom_http.HandleOCCRiderLeaderboard(db)))
	// Content Queue
	mux.HandleFunc("/occ/content/queue", middleware.AdminOnly(db, vrom_http.HandleOCCGetContentQueue(db)))
	mux.HandleFunc("/occ/content/approve", middleware.AdminOnly(db, vrom_http.HandleOCCApproveContent(db)))
	mux.HandleFunc("/occ/content/reject", middleware.AdminOnly(db, vrom_http.HandleOCCRejectContent(db)))

	// --- 8. STATIC DASHBOARD ---
	fs := http.FileServer(http.Dir("./public"))
	mux.Handle("/dashboard/", http.StripPrefix("/dashboard/", fs))

	// CORS Middleware
	corsMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3001")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Origin, Accept")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// Senior Logger Middleware
	loggingMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			fmt.Printf("🌐 [%s] %s from %s\n", r.Method, r.URL.Path, r.RemoteAddr)
			next.ServeHTTP(w, r)
		})
	}

	fmt.Println("🚀 Vrom Modular Engine running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", loggingMiddleware(corsMiddleware(mux))))
}
