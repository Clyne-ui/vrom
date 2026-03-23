'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp, TrendingDown, Users, Zap, BarChart3, Download,
  Globe, MapPin, ShoppingBag, Car, DollarSign
} from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS, REGION_LIST } from '@/lib/regions'
import { RegionCode } from '@/lib/types'

const REGION_TAB_FLAGS: Record<RegionCode, string> = {
  global: '🌍',
  kenya: '🇰🇪',
  nigeria: '🇳🇬',
  uganda: '🇺🇬',
  tanzania: '🇹🇿',
}

const REGION_TAB_COLORS: Record<string, string> = {
  global: 'border-primary text-primary',
  kenya: 'border-blue-500 text-blue-500',
  nigeria: 'border-purple-500 text-purple-500',
  uganda: 'border-green-500 text-green-500',
  tanzania: 'border-orange-500 text-orange-500',
}

function getRegionalStats(regionCode: string) {
  if (regionCode === 'global') {
    const orders = REGION_LIST.reduce((s, r) => s + Math.round(r.activeOrders * 3.5), 0)
    const users = REGION_LIST.reduce((s, r) => s + r.riders + r.drivers, 0)
    const merchants = REGION_LIST.reduce((s, r) => s + r.merchants, 0)
    const gmv = REGION_LIST.reduce((s, r) => s + r.gmv, 0)
    return {
      orders, users, merchants, gmv,
      avgOrderValue: Math.round((gmv / orders) * 100) / 100,
      conversionRate: '4.8',
      drivers: REGION_LIST.reduce((s, r) => s + r.drivers, 0),
      riders: REGION_LIST.reduce((s, r) => s + r.riders, 0),
    }
  }
  const r = REGIONS[regionCode as RegionCode]
  if (!r) return null
  const orders = Math.round(r.activeOrders * 3.5)
  return {
    orders,
    users: r.riders + r.drivers,
    merchants: r.merchants,
    gmv: r.gmv,
    avgOrderValue: Math.round((r.gmv / orders) * 100) / 100,
    conversionRate: (Math.random() * 5 + 2).toFixed(1),
    drivers: r.drivers,
    riders: r.riders,
  }
}

function KPICard({
  title, value, trend, icon: Icon, iconColor, unit
}: {
  title: string, value: string | number, trend?: number, icon: any, iconColor: string, unit?: string
}) {
  return (
    <Card className="p-5 glass-dark hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {value}{unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              }
              <span className={`text-xs font-semibold ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${iconColor} bg-opacity-10`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}

function RegionStatsPanel({ regionCode }: { regionCode: string }) {
  const stats = getRegionalStats(regionCode)
  const regionInfo = REGIONS[regionCode as RegionCode]
  if (!stats) return <p className="text-muted-foreground">No data for this region.</p>

  const isGlobal = regionCode === 'global'
  const gmvDisplay = isGlobal
    ? `$${(stats.gmv / 1000000).toFixed(2)}M`
    : `$${stats.gmv.toLocaleString()}`

  return (
    <div className="space-y-6">
      {/* Region info banner */}
      {!isGlobal && regionInfo && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{regionInfo.name}, {regionInfo.country}</p>
            <p className="text-xs text-muted-foreground">Currency: {regionInfo.currency} · Timezone: {regionInfo.timezone}</p>
          </div>
          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500 font-semibold">
            {regionInfo.status === 'active' ? '● Active' : '○ Inactive'}
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KPICard title="Gross Merchandise Value" value={gmvDisplay} trend={8.2} icon={DollarSign} iconColor="text-primary" />
        <KPICard title="Total Orders" value={stats.orders.toLocaleString()} trend={5.4} icon={ShoppingBag} iconColor="text-blue-500" />
        <KPICard title="Active Users" value={stats.users.toLocaleString()} trend={3.1} icon={Users} iconColor="text-green-500" />
        <KPICard title="Merchants" value={stats.merchants.toLocaleString()} trend={12.7} icon={BarChart3} iconColor="text-orange-500" />
        <KPICard title="Active Drivers" value={stats.drivers.toLocaleString()} trend={1.9} icon={Car} iconColor="text-violet-500" />
        <KPICard title="Active Riders" value={stats.riders.toLocaleString()} trend={4.2} icon={Zap} iconColor="text-cyan-500" />
        <KPICard title="Avg Order Value" value={`$${stats.avgOrderValue}`} trend={-2.1} icon={TrendingUp} iconColor="text-pink-500" />
        <KPICard title="Conversion Rate" value={`${stats.conversionRate}%`} trend={0.8} icon={BarChart3} iconColor="text-yellow-500" />
      </div>

      {/* Revenue bar chart mock */}
      <Card className="p-6 glass-dark">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Order Volume (Last 30 Days)</h3>
          <span className="text-xs text-muted-foreground">Updated live</span>
        </div>
        <div className="h-36 flex items-end gap-1">
          {Array.from({ length: 30 }).map((_, i) => {
            const height = 20 + Math.abs(Math.sin(i * 0.7) * 70) + Math.random() * 20
            return (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/30 hover:bg-primary/60 transition-colors cursor-pointer"
                style={{ height: `${height}%`, minHeight: '4px' }}
                title={`Day ${i + 1}`}
              />
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Day 1 → Day 30</p>
      </Card>

      {/* Revenue breakdown */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4">Revenue Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Delivery Fees', pct: 42, color: 'bg-primary' },
            { label: 'Service Commission', pct: 28, color: 'bg-blue-500' },
            { label: 'Premium Services', pct: 18, color: 'bg-green-500' },
            { label: 'Tax & Compliance', pct: 12, color: 'bg-orange-400' },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-foreground">{item.pct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function AnalyticsPage() {
  const { role, region } = useUser()

  // Super admin can switch between All Regions tab + each region
  // Regional admin is locked to their assigned region
  const availableTabs: RegionCode[] = role === 'super_admin'
    ? ['global', 'kenya', 'nigeria', 'uganda', 'tanzania']
    : [region as RegionCode]

  const [activeTab, setActiveTab] = useState<RegionCode>(
    role === 'super_admin' ? 'global' : (region as RegionCode)
  )
  const [dateRange, setDateRange] = useState('month')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'super_admin'
              ? 'Global performance overview with per-region breakdown.'
              : `Regional analytics — ${REGIONS[region as RegionCode]?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['today', 'week', 'month', 'quarter', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  dateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* ─── SUPER ADMIN: Region Tab Switcher ─── */}
      {role === 'super_admin' && (
        <div className="flex gap-2 flex-wrap border-b border-border pb-0">
          {availableTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? REGION_TAB_COLORS[tab] + ' border-b-2'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{REGION_TAB_FLAGS[tab]}</span>
              {tab === 'global' ? 'All Regions' : REGIONS[tab]?.name}
            </button>
          ))}
        </div>
      )}

      {/* Data panel */}
      <RegionStatsPanel regionCode={activeTab} />

      {/* ─── SUPER ADMIN ONLY: Cross-Region Comparison ─── */}
      {role === 'super_admin' && activeTab === 'global' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Region-by-Region Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {REGION_LIST.map(regionData => {
              const stats = getRegionalStats(regionData.code)
              if (!stats) return null
              const tabColor = REGION_TAB_COLORS[regionData.code] || ''
              return (
                <Card
                  key={regionData.code}
                  className="p-5 glass-dark hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setActiveTab(regionData.code as RegionCode)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{REGION_TAB_FLAGS[regionData.code as RegionCode]}</span>
                      <h3 className="font-bold text-foreground text-sm">{regionData.name}</h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">Active</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GMV</span>
                      <span className="font-semibold text-foreground">${regionData.gmv.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-semibold text-foreground">{stats.orders.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Users</span>
                      <span className="font-semibold text-foreground">{stats.users.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Merchants</span>
                      <span className="font-semibold text-foreground">{regionData.merchants.toLocaleString()}</span>
                    </div>
                  </div>
                  <button className={`mt-3 w-full text-xs font-medium py-1.5 rounded border ${tabColor} border-current opacity-70 hover:opacity-100 transition-opacity`}>
                    View Details →
                  </button>
                </Card>
              )
            })}
          </div>

          {/* Company-wide summary */}
          <Card className="p-6 glass-dark border-primary/30 bg-primary/5">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Vrom Company-Wide Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Regions</p>
                <p className="text-2xl font-bold text-foreground">{REGION_LIST.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Platform Uptime</p>
                <p className="text-2xl font-bold text-green-500">99.8%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Regional Admins</p>
                <p className="text-2xl font-bold text-foreground">{REGION_LIST.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">YoY Growth</p>
                <p className="text-2xl font-bold text-primary">+24%</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
