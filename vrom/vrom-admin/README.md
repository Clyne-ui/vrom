# Vrom OCC - Operations Command Center

A premium admin dashboard UI for managing global ride-sharing and delivery operations. Built with React, Next.js, Tailwind CSS, and TypeScript.

## Features

### Core Pages
- **Login**: Email/password authentication integrated with Go backend
- **Dashboard**: Real-time KPI cards (GMV, Commission, Escrow) with live data updates
- **Live Map**: Real-time fleet distribution with demand/supply heatmaps
- **CRM**: Unified management of drivers, riders, merchants, and couriers with search and filters
- **Financials**: Wallet, escrow, payouts, and tax compliance tracking
- **Security**: Fraud detection, audit logs, and kill-switch system maintenance toggle
- **Analytics**: Customizable KPI widgets with trend analysis
- **Settings**: User management, integrations, and platform configuration

### Key Features
- **Automatic Theme Switching**: Light mode (6 AM-7 PM) / Dark mode (7 PM-6 AM)
- **Glassmorphism Design**: Modern backdrop-blur effects with Vrom brand colors (Orange #FF8C42 + Navy #1A2A4A)
- **System Status Badges**: Real-time ping indicators for Go Engine, Rust Matcher, and Python AI
- **Responsive Design**: Mobile-first layout with full tablet and desktop support
- **Real-time Updates**: Simulated SSE streams and live data updates
- **Role-Based Access**: Super Admin, Admin, and Analyst roles

## Getting Started

### Prerequisites
- Node.js 16+
- pnpm or npm

### Installation

```bash
# Install dependencies
pnpm install

# Set environment variables
# Create a .env.local file in the project root
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Running the Application

```bash
# Development mode
pnpm dev

# Open http://localhost:3000 in your browser
```

### Login Credentials

For demo purposes, use any credentials. The application will redirect to the dashboard.

```
Email: admin@vrom.io
Password: password123
```

## Project Structure

```
├── app/
│   ├── layout.tsx           # Root layout with theme provider
│   ├── globals.css          # Global styles and CSS variables
│   ├── login/               # Login page
│   └── dashboard/           # Dashboard layout and pages
│       ├── page.tsx         # Dashboard home
│       ├── map/             # Live map page
│       ├── crm/             # CRM management
│       ├── financials/      # Financial monitoring
│       ├── security/        # Security & audit logs
│       ├── analytics/       # Analytics dashboard
│       └── settings/        # Settings & configuration
├── components/
│   ├── dashboard/           # Dashboard-specific components
│   │   ├── sidebar.tsx      # Navigation sidebar
│   │   └── header.tsx       # Top header with status badges
│   ├── providers/
│   │   └── theme-provider.tsx # Theme provider with auto-switching
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── api-client.ts        # Go backend API client
│   └── utils.ts             # Utility functions
└── public/                  # Static assets
```

## API Integration

### Configuring Your Go Backend

Update the API base URL in your environment or the API client:

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
```

### API Endpoints Expected

The dashboard expects the following endpoints from your Go backend:

```
# Authentication
POST /api/auth/login          - User login
POST /api/auth/logout         - User logout
GET  /api/auth/me             - Current user info

# CRM
GET  /api/crm/search?q={query} - Search users by type
GET  /api/crm/users/{id}      - Get user details
PUT  /api/crm/users/{id}      - Update user

# Financials
GET  /api/financials          - Get financial data
POST /api/stream/financials   - SSE stream for real-time updates

# Map & Fleet
GET  /api/map/fleet           - Get fleet locations

# Security
GET  /api/security/audit-log  - Get audit logs
POST /api/admin/maintenance   - Toggle maintenance mode

# Analytics
GET  /api/analytics?range={range} - Get analytics data
```

## Theme System

The dashboard automatically switches themes based on time:

- **Light Mode**: 6 AM - 7 PM
- **Dark Mode**: 7 PM - 6 AM

You can also manually toggle themes using the sun/moon button in the header.

### Color Palette

**Light Mode:**
- Background: #FFFFFF
- Primary: #FF8C42 (Orange)
- Text: #1A2A4A (Navy)

**Dark Mode:**
- Background: #0F1419
- Primary: #FF8C42 (Orange)
- Text: #E5E7EB

## Development

### Adding New Pages

1. Create a new folder under `app/dashboard/`
2. Create `page.tsx` with your page component
3. The layout will automatically apply the sidebar and header
4. Update the sidebar navigation in `components/dashboard/sidebar.tsx`

### Customizing Colors

Edit the CSS variables in `app/globals.css`:

```css
:root {
  --orange-primary: #FF8C42;
  --navy-accent: #1A2A4A;
  /* Update color values here */
}
```

### Adding New API Endpoints

Update `lib/api-client.ts` with new methods following the existing pattern.

## Deployment

### Deploy to Vercel

```bash
# Push to GitHub
git push origin main

# Deploy via Vercel CLI
vercel deploy

# Or connect your GitHub repo to Vercel for auto-deployment
```

### Environment Variables Required

```
NEXT_PUBLIC_API_URL=https://your-backend.com
```

## Security Considerations

1. **Authentication**: Currently uses demo auth. Implement proper session management with your Go backend
2. **CORS**: Configure CORS on your Go backend to accept requests from your domain
3. **API Keys**: Use environment variables for sensitive data
4. **HTTPS**: Always use HTTPS in production
5. **2FA**: Consider implementing two-factor authentication

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimization

- Uses React Server Components where possible
- Implements SWR for data fetching and caching
- Lazy loads pages and components
- Optimized images and assets

## Troubleshooting

### "Cannot connect to backend"
- Verify `NEXT_PUBLIC_API_URL` is correctly set
- Ensure Go backend is running on the configured port
- Check CORS headers from backend

### Theme not switching automatically
- Check browser console for errors
- Verify time is correct on system
- Clear browser cache and restart

### Map not displaying
- The map uses SVG visualization. If you want Leaflet integration, install:
  ```bash
  pnpm add leaflet react-leaflet
  ```

## Future Enhancements

- [ ] Leaflet map integration with real geographic coordinates
- [ ] WebSocket integration for real-time data (instead of SSE)
- [ ] Advanced filtering and segmentation for CRM
- [ ] Custom report builder
- [ ] Mobile app
- [ ] ML-based demand prediction
- [ ] Advanced fraud detection engine

## License

Proprietary - Vrom Operations

## Support

For questions or support, contact: support@vrom.io
