# Vrom OCC Dashboard - Page Structure Guide

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header (System Status Badges | Theme Toggle | Notifications│
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   Sidebar    │           Page Content Area                 │
│  Navigation  │         (Responsive Grid Layout)            │
│              │                                              │
│  • Dashboard │   Cards    Charts    Tables                 │
│  • Map       │                                              │
│  • CRM       │   Real-time Updates                         │
│  • Finance   │   Interactive Elements                      │
│  • Security  │                                              │
│  • Analytics │                                              │
│  • Settings  │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## Each Page Breakdown

### 1. Login Page
**Route**: `/login`
**Structure**:
```
┌──────────────────────────────┐
│                              │
│    Logo + Title              │
│                              │
│  ┌────────────────────────┐  │
│  │ Email Input            │  │
│  │ Password Input         │  │
│  │ Sign In Button         │  │
│  │ Error Messages         │  │
│  │                        │  │
│  │ Demo Credentials       │  │
│  └────────────────────────┘  │
│                              │
│ © Footer                     │
└──────────────────────────────┘
```
**Components**: Input fields, Button, Card, Error Alert

---

### 2. Dashboard Home
**Route**: `/dashboard`
**Structure**:
```
┌──────────────────────────────────────┐
│ Dashboard Title                      │
├──────────────────────────────────────┤
│
│ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ │   GMV   │ │Commis.  │ │ Escrow  │
│ │$2.45M   │ │ $342K   │ │ $125K   │
│ └─────────┘ └─────────┘ └─────────┘
│
│ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ │ Orders  │ │ Drivers │ │  ETA    │
│ │ 1,842   │ │  523    │ │  24m    │
│ └─────────┘ └─────────┘ └─────────┘
│
│ ┌──────────────────────┐ ┌──────────────┐
│ │ Order Trend (24h)    │ │ Revenue      │
│ │                      │ │ Breakdown    │
│ │ [Chart Bars]         │ │ [Progress]   │
│ └──────────────────────┘ └──────────────┘
│
│ ┌──────────────────────────────────────┐
│ │ Recent Activity                      │
│ │ • Order placed in Mumbai             │
│ │ • Driver onboarded                   │
│ │ • Payment processed                  │
│ │ • High demand in Bangalore           │
│ └──────────────────────────────────────┘
```
**Key Features**: Real-time KPI updates, Live charts, Activity feed

---

### 3. Live Map
**Route**: `/dashboard/map`
**Structure**:
```
┌──────────────────────────────────────┐
│ Stats Row                            │
│ ┌────────┐ ┌────────┐ ┌────────────┐│
│ │Drivers │ │ Orders │ │ Demand     ││
│ │  523   │ │  128   │ │ Hotspots   ││
│ └────────┘ └────────┘ └────────────┘│
├──────────────────────────────────────┤
│                                      │
│  ┌─────────────────────────────────┐ │
│  │                                 │ │
│  │  [Map SVG Visualization]        │ │
│  │  • Fleet markers (orange dots)  │ │
│  │  • Orders (blue squares)        │ │
│  │  • Demand zones (pink triangles)│ │
│  │  • Heatmap overlay              │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
│
│ ┌──────────────┐ ┌──────────────────┐
│ │ Selected     │ │ Legend           │
│ │ Region Info  │ │ • Active Drivers │
│ │ • Distance   │ │ • Orders         │
│ │ • ETA        │ │ • Demand Zones   │
│ └──────────────┘ └──────────────────┘
```
**Key Features**: Interactive markers, 3 visualization modes, Real-time updates

---

### 4. CRM (User Management)
**Route**: `/dashboard/crm`
**Structure**:
```
┌──────────────────────────────────────┐
│ CRM Title                            │
├──────────────────────────────────────┤
│ Stats: Total | Drivers | Merchants │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │ 89 │ │ 42 │ │ 28 │ │ 56 │        │
│ └────┘ └────┘ └────┘ └────┘        │
├──────────────────────────────────────┤
│ [Search Box] [Filter Type] [Filter   │
│ Status] [Sort By] [Export]           │
├──────────────────────────────────────┤
│ Table Header: User | Type | Orders...│
│
│ ┌──────────────────────────────────┐ │
│ │ Rajesh Kumar      │ Driver │ 245 │ │
│ │ rajesh@d.com      │        │     │ │
│ ├──────────────────────────────────┤ │
│ │ Priya Singh       │ Rider  │ 89  │ │
│ │ priya@r.com       │        │     │ │
│ ├──────────────────────────────────┤ │
│ │ Sharma Foods      │Merchant│523  │ │
│ │ contact@sf.com    │        │     │ │
│ └──────────────────────────────────┘ │
│
│ Pagination: [Prev] [1] [2] [Next]  │
```
**Key Features**: Searchable, Filterable, Sortable table with 250+ rows

---

### 5. Financials
**Route**: `/dashboard/financials`
**Structure**:
```
┌──────────────────────────────────────┐
│ Financials Title                     │
├──────────────────────────────────────┤
│
│ ┌──────────┐ ┌──────────┐ ┌────────┐
│ │   GMV    │ │Commission│ │ Escrow │
│ │ $2.45M   │ │  $342K   │ │ $125K  │
│ │  +12.5%  │ │  +8.3%   │ │ Locked │
│ └──────────┘ └──────────┘ └────────┘
│
│ ┌─────────┐ ┌─────────┐ ┌──────────┐
│ │ Payouts │ │ Refunds │ │ Tax Due  │
│ │ $287K   │ │ $18.5K  │ │ $45.6K   │
│ └─────────┘ └─────────┘ └──────────┘
│
├──────────────────────────────────────┤
│ Period: [Today] [Week] [Month]...   │
│
│ ┌────────────────┐ ┌────────────────┐
│ │ Monthly        │ │ Revenue        │
│ │ Summary        │ │ Breakdown      │
│ │ Revenue: $342K │ │ • Fees: 45%    │
│ │ Costs: $45K    │ │ • Tax: 30%     │
│ │ Profit: $297K  │ │ • Premium: 15% │
│ └────────────────┘ └────────────────┘
│
├──────────────────────────────────────┤
│ Recent Transactions                  │
│
│ ID    │ Type      │ Amount │ Status  │
│ TRX01 │ Commission│ $12.4K │ Done    │
│ TRX02 │ Payout    │ $50K   │ Done    │
│ TRX03 │ Refund    │ -$2.5K │ Pending │
│
│ [Load More]
```
**Key Features**: Multi-KPI view, Period selection, Transaction history

---

### 6. Security & Audit
**Route**: `/dashboard/security`
**Structure**:
```
┌──────────────────────────────────────┐
│ Security Title                       │
├──────────────────────────────────────┤
│
│ ╔════════════════════════════════╗   │
│ ║ ⚠️ System Maintenance          ║   │
│ ║ Enable/Disable Kill Switch     ║   │
│ ║ [ENABLE Button]                ║   │
│ ╚════════════════════════════════╝   │
│
│ Stats: [4 Active Alerts] [3 Logins]│
│
├──────────────────────────────────────┤
│ Security Alerts                      │
│
│ 🔴 CRITICAL: Fraud detected         │
│    Multiple failed transactions      │
│    [Review Button]                   │
│
│ 🟠 HIGH: Unusual access pattern     │
│    New location access              │
│
├──────────────────────────────────────┤
│ Audit Log (Real-time)                │
│
│ Time      │ Action │ Actor │ Result  │
│ 15:45:22  │ Login  │ admin │ SUCCESS │
│ 15:40:10  │ Verify │ sys   │ SUCCESS │
│ 15:35:45  │ Payout │ admin │ SUCCESS │
│ 15:20:30  │ Login  │ bad   │ FAILED  │
│
│ [Load More]
```
**Key Features**: Kill switch, Alert dashboard, Audit log, RBA info

---

### 7. Analytics Dashboard
**Route**: `/dashboard/analytics`
**Structure**:
```
┌──────────────────────────────────────┐
│ Analytics Title                      │
│ [Day] [Week] [Month] [Quarter] [Year]│
├──────────────────────────────────────┤
│
│ ┌────────┐ ┌────────┐ ┌────────┐
│ │Orders  │ │Users   │ │AOV     │
│ │12,543  │ │ 8,234  │ │ $45.23 │
│ │ +8.5%  │ │ +5.2%  │ │+12.3%  │
│ └────────┘ └────────┘ └────────┘
│
│ ┌────────────────────┐ ┌────────────┐
│ │ Order Volume (30d) │ │Top         │
│ │                    │ │Merchants   │
│ │ [Chart Bars]       │ │• Sharma    │
│ │                    │ │• Quick     │
│ └────────────────────┘ └────────────┘
│
│ ┌────────────────────┐ ┌────────────┐
│ │ Revenue by        │ │ Orders by  │
│ │ Category          │ │ Region     │
│ │ • Food: 42%       │ │ • Delhi    │
│ │ • Grocery: 35%    │ │ • Mumbai   │
│ │ • Pharmacy: 17%   │ │ • Blore    │
│ └────────────────────┘ └────────────┘
│
├──────────────────────────────────────┤
│ Detailed Metrics Table               │
│ Metric │ Value │ vs Period │ Target  │
│ GMV    │$2.45M│   +12.5% │ $2.2M   │
│ Ret.   │ 76.5%│   -2.1%  │  80%    │
```
**Key Features**: Custom widgets, Multiple visualizations, Detailed metrics

---

### 8. Settings
**Route**: `/dashboard/settings`
**Structure**:
```
┌──────────────────────────────────────┐
│ Settings Title                       │
├──────────────────────────────────────┤
│ [General] [Users] [Notifications]   │
│ [Security] [Integrations]            │
├──────────────────────────────────────┤
│
│ GENERAL TAB                          │
│
│ Platform Name: [Input Field]         │
│ Support Email: [Input Field]         │
│ API Base URL: [Input Field]          │
│ Timezone: [Dropdown]                 │
│
│ Feature Flags:                       │
│ ☑ Real-time Map Updates             │
│ ☑ AI Demand Prediction              │
│ ☑ Advanced Analytics                │
│ ☐ Beta Features                     │
│
│ [Save Changes]
│
├──────────────────────────────────────┤
│ USERS TAB                            │
│
│ Team Members [+ Add User]            │
│
│ Name │ Email │ Role │ Status │ Action│
│ Admin│admin..│Super│ Active │ Edit │
│ Ops  │ops... │Admin│ Active │ Edit │
│
├──────────────────────────────────────┤
│ SECURITY TAB                         │
│
│ Session Timeout: [30] minutes        │
│ [Enable 2FA]                         │
│
│ DANGER ZONE:                         │
│ [Reset All Settings] (Red Button)    │
│
├──────────────────────────────────────┤
│ INTEGRATIONS TAB                     │
│
│ Backend API: [URL Input]             │
│ [Test Connection]                    │
│
│ Webhooks: [URL Input]                │
│ [Add Webhook] [Test Webhook]         │
```
**Key Features**: Multi-tab interface, User management, Integration config

---

## Responsive Grid System

### Desktop (1024px+)
```
3-column grid for cards
2-column grid for charts
Full-width tables
```

### Tablet (640-1024px)
```
2-column grid for cards
Stacked charts
Scrollable tables
```

### Mobile (<640px)
```
1-column grid for cards
Single chart per row
Horizontal table scroll
Collapsed sidebar
```

## Component Hierarchy

```
RootLayout
├── ThemeProvider
│   └── HTML dark class toggle
│
DashboardLayout
├── Sidebar
│   ├── Logo
│   ├── Navigation Links
│   ├── Kill Switch
│   └── Logout Button
│
├── Header
│   ├── Title
│   ├── System Status Badges
│   ├── Theme Toggle
│   ├── Notifications
│   └── Settings Link
│
└── Main Content
    ├── Page Title & Description
    ├── Stats Cards (Grid)
    ├── Charts & Tables (Grid)
    ├── Modal/Dialog (as needed)
    └── Pagination (as needed)
```

## Styling Approach

### Color Usage
- **Orange (#FF8C42)**: Highlights, active states, CTAs
- **Navy (#1A2A4A)**: Text, primary backgrounds
- **Accent Colors**: Blue, Green, Red for data viz
- **Neutrals**: Grays for secondary text, borders

### Spacing
- Cards: `p-6` (24px padding)
- Grid gaps: `gap-4` (16px)
- Section margins: `space-y-6` (24px between sections)

### Typography
- H1: 30px, bold, primary color
- H2: 24px, semibold, foreground
- H3: 18px, semibold, foreground
- Body: 14px, muted-foreground
- Small: 12px, muted-foreground

---

This structure provides a scalable, maintainable foundation for your operations platform!
