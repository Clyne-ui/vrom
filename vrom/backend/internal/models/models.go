package models

type User struct {
	FullName    string `json:"full_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
	Role        string `json:"role"`
}

type RiderOnboarding struct {
	UserID         string `json:"user_id"`
	SelfieURL      string `json:"selfie_url"`
	IDFrontURL     string `json:"id_front_url"`
	IDBackURL      string `json:"id_back_url"`
	GoodConductURL string `json:"good_conduct_url"`
	VehicleType    string `json:"vehicle_type"`
	PlateNumber    string `json:"plate_number"`
	VehiclePhotoURL string `json:"vehicle_photo_url"`
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

type SellerProfile struct {
	FullName    string  `json:"full_name"`
	ShopName    string  `json:"shop_name"`
	ShopAddress string  `json:"shop_address"`
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
	BalanceAfter float64 `json:"balance_after"`
	CreatedAt    string  `json:"created_at"`
}

type RideRequestInput struct {
	PickupLat      float64 `json:"pickup_lat"`
	PickupLng      float64 `json:"pickup_lng"`
	PickupAddress  string  `json:"pickup_address"`
	DropoffLat     float64 `json:"dropoff_lat"`
	DropoffLng     float64 `json:"dropoff_lng"`
	DropoffAddress string  `json:"dropoff_address"`
}

type UserProfile struct {
	FullName    string     `json:"full_name"`
	Email       string     `json:"email"`
	PhoneNumber string     `json:"phone_number"`
	Role        string     `json:"role"`
	Balance     float64    `json:"balance"`
	History     []Activity `json:"history"`
}

// ── OCC Models ─────────────────────────────────────────────
type OCCFinancials struct {
	// Money Flow
	GMV                float64 `json:"gmv"`                 // Gross Merchandise Value
	Commission         float64 `json:"commission"`          // Vrom Earnings
	EscrowInFlight     float64 `json:"escrow_in_flight"`    // Currently locked in escrow
	TotalWalletBalance float64 `json:"total_wallet_balance"`// All users' loaded cash combined
	TotalWithdrawn     float64 `json:"total_withdrawn"`     // Money successfully paid out to M-Pesa
	
	// Activity Counts
	TotalOrders    int `json:"total_orders"`
	CompletedSales int `json:"completed_sales"`
	PendingTrips   int `json:"pending_trips"`
	CompletedTrips int `json:"completed_trips"`
}

type RevenueBreakdown struct {
	Daily   float64 `json:"daily"`
	Weekly  float64 `json:"weekly"`
	Monthly float64 `json:"monthly"`
}

type EscrowEntry struct {
	OrderID   string  `json:"order_id"`
	BuyerName string  `json:"buyer_name"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
}

type AdminUserView struct {
	UserID      string  `json:"user_id"`
	FullName    string  `json:"full_name"`
	Email       string  `json:"email"`
	PhoneNumber string  `json:"phone_number"`
	Role        string  `json:"role"`
	IsVerified  bool    `json:"is_verified"`
	CreatedAt   string  `json:"created_at"`
	Balance     float64 `json:"balance"`
	OrdersCount int     `json:"orders_count"`
	TripsCount  int     `json:"trips_count"`
}

type TripSummary struct {
	TripID         string  `json:"trip_id"`
	Status         string  `json:"status"`
	Fare           float64 `json:"fare"`
	CreatedAt      string  `json:"created_at"`
	PickupAddress  string  `json:"pickup_address"`
	DropoffAddress string  `json:"dropoff_address"`
	PLat           float64 `json:"p_lat"`
	PLng           float64 `json:"p_lng"`
	DLat           float64 `json:"d_lat"`
	DLng           float64 `json:"d_lng"`
	DriverName     string  `json:"driver_name,omitempty"`
	DriverPhone    string  `json:"driver_phone,omitempty"`
	RiderName      string  `json:"rider_name,omitempty"`
	RiderPhone     string  `json:"rider_phone,omitempty"`
	CustomerName   string  `json:"customer_name,omitempty"`
	CustomerPhone  string  `json:"customer_phone,omitempty"`
}

type OrderSummary struct {
	OrderID     string  `json:"order_id"`
	Status      string  `json:"status"`
	Amount      float64 `json:"amount"`
	CreatedAt   string  `json:"created_at"`
	ProductName string  `json:"product_name"`
}

type AdminUserHistory struct {
	UserID     string        `json:"user_id"`
	Activities []Activity    `json:"activities"`
	Trips      []TripSummary `json:"trips"`
	Orders     []OrderSummary `json:"orders"`
}

type DisputeEntry struct {
	OrderID    string  `json:"order_id"`
	BuyerName  string  `json:"buyer_name"`
	SellerName string  `json:"seller_name"`
	Amount     float64 `json:"amount"`
	Status     string  `json:"status"`
	CreatedAt  string  `json:"created_at"`
}

type AuditEntry struct {
	LogID      string `json:"log_id"`
	AdminEmail string `json:"admin_email"`
	Action     string `json:"action"`
	TargetID   string `json:"target_id"`
	IPAddress  string `json:"ip_address"`
	CreatedAt  string `json:"created_at"`
}

type FlaggedProduct struct {
	ProductID  string  `json:"product_id"`
	Title      string  `json:"title"`
	ImageURL   string  `json:"image_url"`
	Price      float64 `json:"price"`
	SellerName string  `json:"seller_name"`
	FlaggedAt  string  `json:"flagged_at"`
}

type RiderLeaderboardEntry struct {
	UserID        string  `json:"user_id"`
	FullName      string  `json:"full_name"`
	TripCount     int     `json:"trip_count"`
	TotalEarnings float64 `json:"total_earnings"`
	AvgRating     float64 `json:"avg_rating"`
}

type OCCSecurityAlert struct {
	AlertID    string `json:"alert_id"`
	Type       string `json:"type"`
	Severity   string `json:"severity"`
	Message    string `json:"message"`
	Status     string `json:"status"`
	Region     string `json:"region"`
	CreatedAt  string `json:"created_at"`
	ResolvedAt string `json:"resolved_at,omitempty"`
}

type IdleRider struct {
	RiderID    string  `json:"rider_id"`
	RiderName  string  `json:"rider_name"`
	RiderPhone string  `json:"rider_phone"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	LastSeen   string  `json:"last_seen"`
}

type LiveFleetResponse struct {
	ActiveTrips []TripSummary `json:"active_trips"`
	IdleRiders  []IdleRider   `json:"idle_riders"`
	Hotspots    []interface{} `json:"hotspots"` 
}

// SystemHealthDetail holds advanced metrics for a specific service.
type SystemHealthDetail struct {
	ServiceName string  `json:"service_name"`
	Status      string  `json:"status"` // online, offline, degraded
	LatencyMS   int64   `json:"latency_ms"`
	CPUUsage    float64 `json:"cpu_usage"`
	MemUsage    float64 `json:"mem_usage"`
	Uptime      string  `json:"uptime"`
	LastCheck   string  `json:"last_check"`
	Logs        []string `json:"logs"`
}

// Region represents a dynamic geographical management zone.
type Region struct {
	ID        string  `json:"id" gorm:"primaryKey"`
	Name      string  `json:"name"`
	Country   string  `json:"country"`
	Currency  string  `json:"currency"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Status    string  `json:"status"`
	CreatedAt string  `json:"created_at"`
}

// SystemNotification represents a platform-wide alert.
type SystemNotification struct {
	ID        string `json:"id" gorm:"primaryKey"`
	Type      string `json:"type"` // info, warning, error
	Title     string `json:"title"`
	Message   string `json:"message"`
	Read      bool   `json:"read"`
	CreatedAt string `json:"created_at"`
}
// RiderDocument represents a compliance document for a rider.
type RiderDocument struct {
	DocumentType       string `json:"document_type"`
	ImageURL           string `json:"image_url"`
	VerificationStatus string `json:"verification_status"`
}



// RiderFullDetail represents the complete profile for the admin drill-down.
type RiderFullDetail struct {
	UserID          string          `json:"user_id"`
	FullName        string          `json:"full_name"`
	Email           string          `json:"email"`
	PhoneNumber     string          `json:"phone_number"`
	VehicleType     string          `json:"vehicle_type"`
	PlateNumber     string          `json:"plate_number"`
	VehiclePhotoURL string          `json:"vehicle_photo_url"`
	AssignedRegion  string          `json:"assigned_region"`
	Status          string          `json:"status"`
	IsAvailable     bool            `json:"is_available"`
	LastLat         float64         `json:"last_lat"`
	LastLng         float64         `json:"last_lng"`
	Documents       []RiderDocument `json:"documents"`
	CurrentTrip     *TripSummary    `json:"current_trip,omitempty"`
}
