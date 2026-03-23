'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Map,
  Users,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Power,
  Globe,
  ShieldCheck,
  Lock,
  UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS } from '@/lib/regions'
import { RegionCode } from '@/lib/types'

// Nav items with role restrictions
const baseMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: Map, label: 'Live Map', href: '/dashboard/map', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: Users, label: 'CRM', href: '/dashboard/crm', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: DollarSign, label: 'Financials', href: '/dashboard/financials', roles: ['super_admin', 'regional_admin'] },
  { icon: AlertTriangle, label: 'Security', href: '/dashboard/security', roles: ['super_admin', 'regional_admin'] },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', roles: ['super_admin', 'regional_admin', 'operator'] },
  { icon: Globe, label: 'Regions', href: '/dashboard/regions', roles: ['super_admin'] },
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
  const router = useRouter()
  const { user, role, region, switchRegion } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // Filter nav items to only those allowed for the current role
  const menuItems = baseMenuItems.filter(item => item.roles.includes(role))

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const regionInfo = REGIONS[region as RegionCode]
  const regionColorClass = REGION_COLORS[region as RegionCode] || REGION_COLORS.global

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vrom%20logo%20transparen-hs31Teidv5LhajHyiL3YSpt6yTesQe.png"
            alt="Vrom"
            className="h-8 w-auto"
          />
          <div>
            <div className="font-bold text-sidebar-foreground">VROM</div>
            <div className="text-xs text-sidebar-accent-foreground">OCC</div>
          </div>
        </Link>
      </div>

      {/* ─── SUPER ADMIN: Region Switcher ─── */}
      {role === 'super_admin' && (
        <div className="p-4 border-b border-sidebar-border space-y-2">
          <label className="text-xs font-semibold text-sidebar-accent-foreground uppercase flex items-center gap-1">
            <Globe className="h-3 w-3" /> Viewing Region
          </label>
          <select
            value={region}
            onChange={(e) => switchRegion(e.target.value as RegionCode)}
            className="w-full px-3 py-2 bg-sidebar-accent text-sidebar-foreground rounded-lg border border-sidebar-border text-sm"
          >
            <option value="global">🌍 Global Operations</option>
            <option value="kenya">🇰🇪 Nairobi, Kenya</option>
            <option value="nigeria">🇳🇬 Lagos, Nigeria</option>
            <option value="uganda">🇺🇬 Kampala, Uganda</option>
            <option value="tanzania">🇹🇿 Dar es Salaam, Tanzania</option>
          </select>
        </div>
      )}

      {/* ─── REGIONAL ADMIN: Locked Region Badge ─── */}
      {role === 'regional_admin' && (
        <div className="p-4 border-b border-sidebar-border">
          <p className="text-xs font-semibold text-sidebar-accent-foreground uppercase mb-2 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Assigned Region
          </p>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${regionColorClass}`}>
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">{regionInfo?.name}</p>
              <p className="text-xs opacity-70">{regionInfo?.country}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Access limited to {regionInfo?.name} only.
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          const isSuperAdminOnly = item.roles.length === 1 && item.roles[0] === 'super_admin'

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium flex-1">{item.label}</span>
              {isSuperAdminOnly && !active && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">SA</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ─── Kill Switch — Super Admin ONLY ─── */}
      {role === 'super_admin' && (
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              maintenanceMode
                ? 'bg-destructive/20 text-destructive border border-destructive/40'
                : 'text-sidebar-foreground hover:bg-sidebar-accent border border-transparent'
            }`}
          >
            <Power className="h-5 w-5" />
            <span className="font-medium flex-1 text-left">Kill Switch</span>
            <div className={`h-2.5 w-2.5 rounded-full transition-colors ${maintenanceMode ? 'bg-destructive animate-pulse' : 'bg-green-500'}`} />
          </button>
          {maintenanceMode && (
            <p className="text-xs text-destructive px-4 mt-1 font-medium">
              ⚠️ Maintenance Mode Active — Users are blocked
            </p>
          )}
        </div>
      )}

      {/* User card & Logout */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {user && (
          <div className="px-4 py-3 rounded-lg bg-sidebar-accent mb-2 space-y-1">
            <p className="text-xs text-sidebar-accent-foreground">Logged in as</p>
            <p className="text-sm font-bold text-sidebar-foreground">{user.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                role === 'super_admin'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {role === 'super_admin' ? '⭐ Super Admin' : `🗺️ ${regionInfo?.name}`}
              </span>
            </div>
          </div>
        )}
        <Button
          onClick={() => {
            localStorage.removeItem('vrom_user')
            localStorage.removeItem('vrom_session_token')
            router.push('/login')
          }}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
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
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-col">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
