# Regional Management System - Complete Guide

## Overview

The Vrom OCC now features a comprehensive regional management system that allows Super Admins to manage multiple regions and regional admins to view only their assigned region's data.

## Architecture

### User Roles

1. **Super Admin** - Can manage all regions and access global analytics
2. **Regional Admin** - Limited to a single assigned region
3. **Operator** - Basic user role (support for future expansion)

### Region Structure

Currently supported regions:
- Kenya (Nairobi)
- Nigeria (Lagos)
- Uganda (Kampala)
- Tanzania (Dar es Salaam)
- Global (Super Admin view of all regions)

## Key Features

### 1. Role-Based Access Control

The system is built on a context-based approach using React Context:

```typescript
// User role and region are stored and managed via UserProvider
const { user, role, region, switchRegion, canAccessRegions } = useUser()

// Super Admin can access all regions
if (role === 'super_admin') {
  // Can view all regions, manage settings, create admins
}

// Regional Admin can only see assigned region
if (role === 'regional_admin') {
  // Limited to user.region only
}
```

### 2. Login & Account Creation

The login page now supports quick access to demo accounts:

**Demo Accounts:**
- admin@vrom.io (Super Admin) - Global access
- nairobi@vrom.io (Regional Admin) - Kenya only
- lagos@vrom.io (Regional Admin) - Nigeria only
- kampala@vrom.io (Regional Admin) - Uganda only

Or create custom accounts with role and region assignment.

### 3. Sidebar Navigation

**Super Admin sees:**
- Dashboard
- Live Map
- CRM
- Financials
- Security
- Analytics
- **Regions** (Super Admin exclusive)
- Settings
- Region selector dropdown to switch between regions

**Regional Admin sees:**
- Dashboard
- Live Map
- CRM
- Financials
- Security
- Analytics
- Settings
- Assigned region badge (not selectable)

### 4. Regional Management Page

**URL:** `/dashboard/regions` (Super Admin only)

Features:
- Overview of all regions with key metrics
- Region cards showing drivers, riders, merchants, active orders, and GMV
- Search and filter capabilities
- Regional comparison view
- Global performance metrics
- Expandable for new country setup

### 5. Analytics Dashboard

**Super Admin views:**
- Global analytics (all regions combined)
- Can switch to individual region view
- Regional comparison table
- System-wide performance metrics

**Regional Admin views:**
- Region-specific analytics only
- Cannot access other regions' data
- Customizable widgets

### 6. User Management (Settings)

**Super Admin can:**
- Add new regional admins
- Assign regions to new admins
- View all admins across all regions
- Delete users
- Manage global settings

**Regional Admin can:**
- View team members in their region
- Cannot create or delete users
- Can manage regional settings

### 7. Dashboard Home

- Shows region-specific KPI cards
- Displays assigned region information for regional admins
- Real-time data updates for assigned region
- Global metrics for super admins

## Data Filtering

All pages implement region-based data filtering:

```typescript
// Example: Filter data by region
const filteredData = filterDataByRegion(data, region, 'region_field')

// Super Admin with region='global' sees all data
// Regional Admin sees only their region's data
```

## File Structure

```
app/
├── login/page.tsx (Updated with role/region selection)
├── dashboard/
│   ├── page.tsx (Region-aware dashboard)
│   ├── regions/page.tsx (NEW - Super Admin only)
│   ├── analytics/page.tsx (Updated with regional views)
│   ├── settings/page.tsx (Updated with user management)
│   ├── crm/page.tsx (Region-filtered)
│   ├── financials/page.tsx (Region-filtered)
│   ├── security/page.tsx (Region-filtered)
│   └── map/page.tsx (Region-filtered)
│
components/
├── dashboard/
│   ├── sidebar.tsx (Updated with region selector)
│   └── header.tsx
│
lib/
├── contexts/user-context.tsx (NEW - Region management)
├── types.ts (NEW - Region types)
├── regions.ts (NEW - Region definitions)
└── api-client.ts
```

## Usage Examples

### Getting Current User Context

```typescript
import { useUser } from '@/lib/contexts/user-context'

export function MyComponent() {
  const { user, role, region, switchRegion, canAccessRegions } = useUser()
  
  // Show region name
  console.log(getRegionName(region)) // "Nairobi"
  
  // Switch regions (Super Admin only)
  if (role === 'super_admin') {
    switchRegion('nigeria')
  }
}
```

### Checking Region Access

```typescript
// Can the user manage this region?
if (canManageRegion('kenya')) {
  // Show management UI
}

// What regions can this user access?
const accessibleRegions = canAccessRegions()
// Returns: ['kenya'] for regional admin
// Returns: ['global', 'kenya', 'nigeria', 'uganda', 'tanzania'] for super admin
```

### Filtering Regional Data

```typescript
import { filterDataByRegion } from '@/lib/regions'

// Filter orders by region
const regionalOrders = filterDataByRegion(allOrders, userRegion, 'region')
```

## Multi-Country Expansion

To add a new country/region:

1. **Update `lib/regions.ts`:**
   ```typescript
   export const REGIONS: Record<RegionCode, Region> = {
     // Add new region
     southafrica: {
       code: 'southafrica',
       name: 'Johannesburg',
       country: 'South Africa',
       status: 'active',
       currency: 'ZAR',
       timezone: 'SAST',
       // ... metrics
     }
   }
   ```

2. **Update `lib/types.ts`:**
   ```typescript
   export type RegionCode = 'kenya' | 'nigeria' | 'uganda' | 'tanzania' | 'southafrica' | 'global'
   ```

3. **Update login page** with new region option

4. **Populate regional data** from your Go backend

## Theme Support

The entire regional system respects the automatic light/dark mode switching:
- Light mode: 6 AM - 7 PM
- Dark mode: 7 PM - 6 AM
- Manual toggle available in header

Colors adapt to Vrom's brand:
- Primary: Orange (#FF8C42)
- Dark mode navy: #1A2A4A
- Light mode backgrounds: White/light gray

## Backend Integration

Connect your Go backend by updating API endpoints:

```typescript
// lib/api-client.ts
export const apiClient = {
  // Regional endpoints
  getRegionalUsers: async (region: RegionCode) => {
    return fetch(`${API_URL}/occ/regions/${region}/users`)
  },
  
  getRegionalMetrics: async (region: RegionCode) => {
    return fetch(`${API_URL}/occ/regions/${region}/metrics`)
  },
  
  // ... other endpoints
}
```

## Security Considerations

1. **Role-based rendering** - Pages check user role before rendering content
2. **Data filtering** - All API calls filtered by assigned region
3. **Access control** - Super Admin functions blocked for regional admins
4. **Session management** - User role and region stored in localStorage (for demo)
5. **Future**: Implement JWT tokens and secure session storage

## Testing the System

### Test as Super Admin
1. Go to login page
2. Click "Super Admin" demo button
3. Access all regions via sidebar dropdown
4. Visit `/dashboard/regions` to manage regions

### Test as Regional Admin
1. Go to login page
2. Click a regional admin button (e.g., "Nairobi Admin")
3. Sidebar shows only assigned region (non-selectable)
4. Analytics show only regional data
5. Cannot access regions page

## Performance

- Region context updates trigger minimal re-renders
- Data filtering happens client-side for demo
- Backend can optimize with regional database partitioning
- Sidebar selector uses optimized select component

## Future Enhancements

1. Multi-region dashboard widget customization
2. Regional team collaboration features
3. Cross-region reporting tools
4. Regional billing and accounting
5. Automated regional reports
6. Regional alert customization
7. Regional compliance tracking
