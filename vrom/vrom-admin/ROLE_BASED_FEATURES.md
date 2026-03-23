# Role-Based Features Matrix

## Access Control Overview

### Super Admin Capabilities
```
LOGIN & AUTHENTICATION
✓ Can login with any credentials in demo mode
✓ Receives global region assignment
✓ Can switch between all regions via dropdown
✓ Session includes access to all 5 regions

DASHBOARD
✓ Homepage shows global metrics
✓ KPI cards display company-wide data
✓ Real-time updates across all regions
✓ Can see aggregated statistics

SIDEBAR NAVIGATION
✓ Region selector dropdown visible
✓ Shows: Global Operations, Nairobi, Lagos, Kampala, Dar es Salaam
✓ Can switch regions instantly
✓ "Regions" menu item available

REGIONS PAGE (/dashboard/regions)
✓ FULL ACCESS - This page exclusively for super admin
✓ Global statistics dashboard
✓ All region cards visible
✓ Regional comparison table
✓ Can manage region settings
✓ Can view multi-country expansion options

ANALYTICS PAGE
✓ View global analytics by default
✓ Switch to individual region view via dropdown
✓ See regional comparison table
✓ Access system-wide performance metrics
✓ Download global reports

CRM PAGE
✓ See all users across all regions
✓ Filter by region
✓ Manage users in any region
✓ View cross-regional trends

FINANCIALS PAGE
✓ Global financial overview
✓ Per-region financial breakdown
✓ Cross-region payment tracking
✓ View all transactions

SECURITY PAGE
✓ Global audit logs
✓ Per-region security incidents
✓ System maintenance kill switch
✓ Access all fraud detection data

SETTINGS PAGE
✓ "Users" tab shows all admins
✓ Can create new regional admins
✓ Assign regions when creating admins
✓ Can delete user accounts
✓ Access to all configuration settings
```

### Regional Admin Capabilities
```
LOGIN & AUTHENTICATION
✓ Can login with regional credentials
✓ Receives specific region assignment (e.g., Kenya)
✓ Region is NON-CHANGEABLE
✓ Session limited to assigned region only

DASHBOARD
✓ Homepage shows ONLY their region data
✓ KPI cards display region-specific metrics
✓ Shows "Assigned Region" badge with region name
✓ Real-time updates for their region only

SIDEBAR NAVIGATION
✗ NO region selector dropdown
✓ Shows assigned region as badge
  - "Assigned Region: Nairobi, Kenya"
  - Non-interactive display
✗ "Regions" menu item NOT available

REGIONS PAGE (/dashboard/regions)
✗ BLOCKED - Access Denied message
✗ Cannot view any region management
✗ Cannot see other regions' data
✗ Cannot expand to new countries

ANALYTICS PAGE
✓ View ONLY assigned region analytics
✓ Cannot switch to other regions
✓ Cannot see regional comparison
✓ Access only their region's metrics
✓ Download region-specific reports

CRM PAGE
✓ See users ONLY from their region
✗ Cannot see users from other regions
✓ Manage users in their region
✗ Cannot view cross-regional trends

FINANCIALS PAGE
✓ View finances ONLY for their region
✗ Cannot see other regions' finances
✓ Per-region financial details
✗ Cannot view global payment tracking

SECURITY PAGE
✓ View audit logs for their region ONLY
✓ See security incidents in their region
✗ Cannot toggle global maintenance switch
✓ View fraud detection for their region

SETTINGS PAGE
✓ "Users" tab shows team members in region
✗ Cannot create new admins
✗ Cannot delete user accounts
✓ Can manage regional settings
```

## Page-by-Page Feature Matrix

### Login Page
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Demo Account Buttons       ✓              ✓
Quick Login Options        ✓              ✓
Custom Role Selection      ✓              ✓
Region Selection           ✓              ✓
  - Shows 5 options        ✓              ✓
  - Disabled if super      N/A            N/A
```

### Dashboard Home
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✓
View Welcome Message       ✓ (global)     ✓ (regional)
KPI Cards                  ✓              ✓
  - GMV Card               ✓ (global)     ✓ (region only)
  - Commission Card        ✓ (global)     ✓ (region only)
  - Escrow Card            ✓ (global)     ✓ (region only)
  - Active Orders          ✓ (global)     ✓ (region only)
  - Active Drivers         ✓ (global)     ✓ (region only)
  - Delivery Time          ✓ (global)     ✓ (region only)
Region Badge              ✗              ✓
Real-time Updates         ✓ (global)     ✓ (region)
```

### Live Map
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✓
Global Map View            ✓              ✗
Regional Map View          ✓ (if switched) ✓ (always)
Fleet Distribution         ✓              ✓ (region)
Demand Heatmap             ✓              ✓ (region)
Supply Heatmap             ✓              ✓ (region)
Driver Markers             ✓ (all)        ✓ (region only)
Rider Markers              ✓ (all)        ✓ (region only)
```

### CRM - User Management
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✓
View All Users             ✓              ✗
View Region Users Only     ✓ (switchable) ✓ (always)
User Count                 ✓ (global)     ✓ (region)
Search Users               ✓ (all)        ✓ (region)
Filter by Type             ✓ (all)        ✓ (region)
  - Drivers                ✓              ✓
  - Riders                 ✓              ✓
  - Merchants              ✓              ✓
  - Couriers               ✓              ✓
Edit User Details          ✓ (all)        ✓ (region)
Change Region              ✓              ✗
Delete User                ✓ (all)        ✗ (region only)
Export Data                ✓ (all)        ✓ (region)
```

### Financials
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✓
Global Overview            ✓              ✗
Regional Overview          ✓ (switchable) ✓ (always)
Wallet Balance             ✓ (all)        ✓ (region)
Escrow Tracking            ✓ (all)        ✓ (region)
Payout Schedule            ✓ (all)        ✓ (region)
Tax Compliance             ✓ (all)        ✓ (region)
Transaction History        ✓ (all)        ✓ (region)
Export Reports             ✓              ✓
Regional Breakdown         ✓              ✗
```

### Security & Audit Logs
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✓
Kill Switch (Maintenance)  ✓              ✗
Enable Maintenance Mode    ✓              ✗
View Audit Logs            ✓ (all)        ✓ (region)
Fraud Alerts               ✓ (all)        ✓ (region)
Security Incidents         ✓ (all)        ✓ (region)
Admin Actions Log           ✓ (all)        ✓ (region)
View by Date Range         ✓              ✓
Export Logs                ✓              ✓
```

### Analytics Dashboard
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✓
Global Analytics           ✓ (default)    ✗
Regional Analytics         ✓ (switch)     ✓ (always)
KPI Widgets                ✓ (all)        ✓ (region)
Regional Comparison        ✓              ✗
System Performance         ✓              ✗
Date Range Selection       ✓              ✓
Export Analytics           ✓              ✓
Customize Widgets          ✓              ✓
View Trends                ✓              ✓
```

### Settings - Users Management
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Users Tab Access           ✓              ✓
View All Users             ✓              ✗
View Team Members          ✓ (region)     ✓ (region)
Add New Admin              ✓              ✗
Select User Role           ✓              N/A
Assign Region              ✓              N/A
Delete User                ✓              ✗
Edit User Details          ✓              ✗
User Status Toggle         ✓              ✗
User Activity Log          ✓              ✓
```

### Regions Management Page
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
Page Access                ✓              ✗ (DENIED)
View All Regions           ✓              ✗
Global Statistics          ✓              ✗
Region Cards               ✓              ✗
Driver Count Per Region    ✓              ✗
Rider Count Per Region     ✓              ✗
Regional GMV               ✓              ✗
Active Orders Per Region   ✓              ✗
Regional Comparison        ✓              ✗
Manage Region Settings     ✓              ✗
Add New Region             ✓              ✗
Status Indicators          ✓              ✗
```

### Settings - General & Other Tabs
```
FEATURE                    SUPER_ADMIN    REGIONAL_ADMIN
────────────────────────────────────────────────────────
General Settings           ✓              ✓
Notifications Settings     ✓              ✓
Security Settings          ✓              ✓
Integration Settings       ✓              ✓
Edit Platform Name         ✓              ✓
Set Support Email          ✓              ✓
Select Timezone            ✓              ✓
2FA Settings               ✓              ✓
Backend Integration        ✓              ✓
API Configuration          ✓              ✓
```

## Key Differences Summary

| Feature | Super Admin | Regional Admin |
|---------|------------|----------------|
| **Access Scope** | All regions | 1 region only |
| **Region Selection** | Dropdown selector | Badge (fixed) |
| **Page Count** | 8 pages | 7 pages |
| **Regions Page** | Full access | Denied |
| **User Management** | All users | Team only |
| **Create Admins** | Yes | No |
| **Kill Switch** | Yes | No |
| **Analytics View** | Global + Regional | Regional only |
| **Multi-region Reports** | Yes | No |
| **Edit Other Regions** | Yes | No |

## Coming Soon

Regional features planned for expansion:
- Regional team collaboration tools
- Cross-region performance comparisons
- Regional alert customization
- Regional compliance tracking
- Regional billing and accounting
- Automated regional reports
- Regional content moderation
