'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Map, Users, DollarSign, AlertTriangle,
  BarChart3, Settings, LogOut, Menu, X, Power, Globe,
  ShieldCheck, Lock, UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS } from '@/lib/regions'
import { RegionCode } from '@/lib/types'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: Map, label: 'Live Map', href: '/dashboard/map', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: Users, label: 'CRM', href: '/dashboard/crm', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: DollarSign, label: 'Financials', href: '/dashboard/financials', roles: ['super_admin', 'regional_admin'] },
  { icon: AlertTriangle, label: 'Security', href: '/dashboard/security', roles: ['super_admin', 'regional_admin'] },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: Globe, label: 'Regional Management', href: '/dashboard/regions', roles: ['super_admin'] },
  { icon: UserCog, label: 'Admin Management', href: '/dashboard/admin-management', roles: ['super_admin'] },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings', roles: ['super_admin', 'regional_admin'] },
]

const REGION_COLORS: Record<RegionCode, string> = {
  kenya: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  nigeria: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  uganda: 'bg-green-500/20 text-green-400 border-green-500/30',
  tanzania: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  global: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, role, region, switchRegion, token } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // ── Fetch dynamic regions ───────────────────────────────
  const [dbRegions, setDbRegions] = useState<any[]>([])
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/occ/regions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDbRegions(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error('Failed to fetch sidebar regions:', err)
      }
    }
    if (token) fetchRegions()
  }, [token])

  const menuItems = NAV_ITEMS.filter(item => item.roles.includes(role))
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const currentDbRegion = dbRegions.find(r => r.id === region)
  const fallbackRegionInfo = REGIONS[region as RegionCode]
  
  const displayName = currentDbRegion ? currentDbRegion.name : fallbackRegionInfo?.name
  const displayCountry = currentDbRegion ? currentDbRegion.country : fallbackRegionInfo?.country
  const regionColorClass = REGION_COLORS[region as RegionCode] ?? REGION_COLORS.global

  const sidebarContent = (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Logo ─────────────────────────── */}
      <div className="px-5 py-4 border-b border-sidebar-border flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vrom%20logo%20transparen-hs31Teidv5LhajHyiL3YSpt6yTesQe.png"
            alt="Vrom" className="h-7 w-auto"
          />
          <div>
            <div className="font-bold text-sidebar-foreground text-sm">VROM</div>
            <div className="text-[10px] text-sidebar-accent-foreground leading-none">OCC</div>
          </div>
        </Link>
      </div>

      {/* ── Super Admin: compact region picker ── */}
      {role === 'super_admin' && (
        <div className="px-3 py-2 border-b border-sidebar-border flex-shrink-0">
          <label className="text-[10px] font-semibold text-sidebar-accent-foreground uppercase flex items-center gap-1 mb-1">
            <Globe className="h-2.5 w-2.5" /> Viewing Region
          </label>
          <select
            value={region}
            onChange={(e) => switchRegion(e.target.value as RegionCode)}
            className="w-full px-2 py-1.5 bg-sidebar-accent text-sidebar-foreground rounded border border-sidebar-border text-xs"
          >
            <option value="global">🌍 Global Operations</option>
            {dbRegions.map(r => (
              <option key={r.id} value={r.id}>
                📍 {r.name}, {r.country}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Regional Admin: compact locked badge ── */}
      {role === 'regional_admin' && (
        <div className="px-3 py-2 border-b border-sidebar-border flex-shrink-0">
          <p className="text-[10px] font-semibold text-sidebar-accent-foreground uppercase flex items-center gap-1 mb-1">
            <Lock className="h-2.5 w-2.5" /> Assigned Region
          </p>
          <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs ${regionColorClass}`}>
            <ShieldCheck className="h-3 w-3 flex-shrink-0" />
            <span className="font-semibold">{displayName}</span>
            <span className="opacity-60">— {displayCountry}</span>
          </div>
        </div>
      )}

      {/* ── Navigation (scrollable) ─────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 min-h-0">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const saOnly = item.roles.length === 1 && item.roles[0] === 'super_admin'
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors text-sm ${active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {saOnly && !active && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold">SA</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Kill Switch (super_admin only) ── */}
      {role === 'super_admin' && (
        <div className="px-3 py-2 border-t border-sidebar-border flex-shrink-0">
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${maintenanceMode
                ? 'bg-destructive/20 text-destructive border border-destructive/40'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
          >
            <Power className="h-4 w-4" />
            <span className="font-medium flex-1 text-left">Kill Switch</span>
            <div className={`h-2 w-2 rounded-full ${maintenanceMode ? 'bg-destructive animate-pulse' : 'bg-green-500'}`} />
          </button>
          {maintenanceMode && (
            <p className="text-[10px] text-destructive px-3 mt-1">⚠️ Maintenance Mode Active</p>
          )}
        </div>
      )}

      {/* ── User + Logout ───────────────── */}
      <div className="px-3 py-3 border-t border-sidebar-border flex-shrink-0">
        {user && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent mb-2">
            <p className="text-[10px] text-sidebar-accent-foreground">Logged in as</p>
            <p className="text-xs font-bold text-sidebar-foreground truncate">{user.name}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${role === 'super_admin' ? 'text-primary' : 'text-green-400'}`}>
              {role === 'super_admin' ? '⭐ Super Admin' : `🗺️ ${displayName || region}`}
            </p>
          </div>
        )}
        <Button
          onClick={() => {
            localStorage.removeItem('vrom_user')
            localStorage.removeItem('vrom_session_token')
            router.push('/login')
          }}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-muted rounded-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 bg-sidebar border-r border-sidebar-border flex-col h-screen">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-50 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
