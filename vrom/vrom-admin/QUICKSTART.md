# Vrom OCC - Quick Start Guide

## What You Get

A fully functional Premium Admin Dashboard with:
- 7 Main Pages (Dashboard, Map, CRM, Financials, Security, Analytics, Settings)
- Real-time data visualization
- Responsive mobile-first design
- Automatic light/dark theme switching
- Integration-ready API client for your Go backend

## 5-Minute Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Backend URL
Create `.env.local` in the project root:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Replace `http://localhost:8080` with your Go backend URL.

### 3. Start Development Server
```bash
pnpm dev
```

### 4. Open in Browser
Visit `http://localhost:3000`

You'll see the **Login Page**. Any credentials will work for demo.

## What Each Page Does

### 📊 Dashboard
- Real-time KPI cards: GMV, Commission, Escrow
- Order and driver activity overview
- Recent activity feed
- Revenue breakdown charts

**API Integration:** Expects `/api/stream/financials` SSE endpoint

### 🗺️ Live Map
- Fleet distribution visualization
- Demand/supply heatmaps
- Real-time location updates
- Interactive markers with details

**API Integration:** Expects `/api/map/fleet` endpoint

### 👥 CRM (Unified Management)
- Search drivers, riders, merchants, couriers
- Filter by type and status
- Sort by orders, revenue
- View user details and history

**API Integration:** Expects `/api/crm/search?q={query}` endpoint

### 💰 Financials
- Wallet and escrow monitoring
- Transaction history
- Revenue analytics
- Tax compliance tracking

**API Integration:** Expects `/api/financials` endpoint

### 🛡️ Security
- Kill switch for maintenance mode
- Fraud detection alerts
- Real-time audit logs
- Access control management

**API Integration:** Expects `/api/admin/maintenance` and `/api/security/audit-log`

### 📈 Analytics
- Customizable KPI widgets
- Trend analysis
- Revenue by category
- Geographic distribution

**API Integration:** Expects `/api/analytics?range={range}` endpoint

### ⚙️ Settings
- User management
- Platform configuration
- Notification preferences
- Backend integration setup

## Theme System

The dashboard automatically switches:
- **Light Mode**: 6 AM - 7 PM (Crisp white with orange accents)
- **Dark Mode**: 7 PM - 6 AM (Deep navy with orange highlights)

Manual toggle available in header via sun/moon icon.

## Integration Checklist

Before deploying, ensure your Go backend has these endpoints:

### Authentication
- [ ] `POST /api/auth/login` - Handle email/password login
- [ ] `POST /api/auth/logout` - Clear session
- [ ] `GET /api/auth/me` - Return current user

### CRM
- [ ] `GET /api/crm/search?q={query}&type={type}` - Return matching users
- [ ] `GET /api/crm/users/{id}` - Return user details
- [ ] `PUT /api/crm/users/{id}` - Update user

### Financials
- [ ] `GET /api/financials` - Return financial data
- [ ] `GET /api/stream/financials` - SSE stream for live updates

### Map
- [ ] `GET /api/map/fleet` - Return fleet locations with lat/lng

### Security
- [ ] `GET /api/security/audit-log?limit={n}` - Return audit entries
- [ ] `POST /api/admin/maintenance` - Toggle maintenance mode

### Analytics
- [ ] `GET /api/analytics?range={range}` - Return analytics data

## API Response Format Examples

### Login Response
```json
{
  "id": "admin-001",
  "email": "admin@vrom.io",
  "name": "Admin User",
  "role": "super_admin"
}
```

### CRM Search Response
```json
{
  "users": [
    {
      "id": "DRV001",
      "name": "Rajesh Kumar",
      "email": "rajesh@driver.com",
      "type": "driver",
      "status": "active",
      "rating": 4.8,
      "orders": 245
    }
  ]
}
```

### Financials Response
```json
{
  "gmv": 2450000,
  "commission": 342000,
  "escrow": 125000,
  "payouts": 287000,
  "refunds": 18500
}
```

### Fleet Response
```json
{
  "locations": [
    {
      "id": "driver-1",
      "lat": 28.7041,
      "lng": 77.1025,
      "type": "driver",
      "status": "active"
    }
  ]
}
```

## Customization

### Change Brand Colors
Edit `app/globals.css`:
```css
:root {
  --orange-primary: #YOUR_COLOR;
  --navy-accent: #YOUR_COLOR;
}
```

### Add New Menu Items
Edit `components/dashboard/sidebar.tsx`:
```typescript
const menuItems = [
  // ... existing items
  { icon: MyIcon, label: 'My Page', href: '/dashboard/my-page' },
]
```

### Add New Dashboard Widgets
Create new file in `app/dashboard/my-page/page.tsx` and it will automatically integrate.

## Common Issues

### "API Connection Failed"
- Verify `NEXT_PUBLIC_API_URL` matches your backend
- Check CORS headers are set on your Go backend
- Ensure backend is running

### Theme Not Switching
- Clear browser cache
- Check system time is correct
- Verify `ThemeProvider` is in layout

### Mobile Layout Issues
- Check viewport meta tag in layout
- Verify Tailwind responsive classes (md:, lg:)
- Test in Chrome DevTools mobile mode

## Deployment

### To Vercel
```bash
vercel deploy
```

### To your server
```bash
npm run build
npm run start
```

## What's Next?

1. **Implement Backend APIs** - Create the endpoints this dashboard expects
2. **Set up Authentication** - Connect to your auth system
3. **Configure Real-time** - Replace simulated data with real SSE/WebSocket
4. **Add Your Branding** - Update colors, logo, company name
5. **Deploy** - Push to production

## Support & Documentation

- **Full README**: Check `README.md`
- **Backend Integration**: See `lib/api-client.ts`
- **API Endpoints**: Listed in `README.md`

## Need Help?

Visit: `https://github.com/your-org/vrom-occ`

Email: `support@vrom.io`

---

**Happy Building! 🚀**
