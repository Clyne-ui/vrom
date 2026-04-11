'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, Zap, AlertCircle, Eye, MapPin, Wallet, Globe, Car, Clock, Package } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'
import { REGIONS } from '@/lib/regions'
import { useRouter } from 'next/navigation'
import { RegionCode } from '@/lib/types'
import { apiClient } from '@/lib/api-client'

interface KPICard {
  slug: string
  title: string
  getValue: (data: any) => string
  sub: (data: any) => string
  trend: number
  icon: any
  iconBg: string
  iconColor: string
}

const KPI_CARDS: KPICard[] = [
  {
    slug: 'gmv',
    title: 'Gross Merchandise Value',
    getValue: (data) => `KES ${(data?.financials?.gmv || 0).toLocaleString()}`,
    sub: (data) => `${data?.financials?.total_orders || 0} orders overall`,
    trend: 8.2,
    icon: Wallet,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    slug: 'commission',
    title: 'Platform Commission',
    getValue: (data) => `KES ${(data?.financials?.commission || 0).toLocaleString()}`,
    sub: () => 'Avg. active commission rate',
    trend: 5.1,
    icon: Zap,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
  },
  {
    slug: 'escrow',
    title: 'Escrow In-Flight',
    getValue: (data) => `KES ${(data?.financials?.escrow_in_flight || 0).toLocaleString()}`,
    sub: () => 'Pending disbursements',
    trend: 0.4,
    icon: Eye,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500',
  },
  {
    slug: 'orders',
    title: 'Active Orders',
    getValue: (data) => (data?.financials?.total_orders || 0).toLocaleString(),
    sub: () => 'Real-time tracking enabled',
    trend: 3.2,
    icon: Package,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    slug: 'drivers',
    title: 'Registered Drivers',
    getValue: (data) => (data?.financials?.total_drivers || 0).toLocaleString(),
    sub: () => 'Active network supply',
    trend: 2.8,
    icon: Car,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
  {
    slug: 'delivery',
    title: 'Pending Trips View',
    getValue: (data) => (data?.financials?.pending_trips || 0).toLocaleString(),
    sub: (data) => `${data?.financials?.completed_trips || 0} Trips Completed`,
    trend: -2.3,
    icon: Clock,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
]

export default function DashboardPage() {
  const { user, role, region } = useUser()
  const router = useRouter()
  const regionInfo = REGIONS[region as RegionCode]

  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.getFinancials()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  // 🔌 Real-time WebSocket Data
  const { data: wsData } = useOCCWebSocket('analytics')

  useEffect(() => {
    if (wsData) {
      console.log('WS: Received analytics update:', wsData)
      setStats((prev: any) => ({
        ...prev,
        financials: wsData
      }))
    }
  }, [wsData])

  const Package = Zap // Reusing icon temporarily mapping.

  // Safe Fallbacks in case stats isn't loaded or fully formed yet
  const orderVolume = stats?.order_volume || []
  const maxVolume = orderVolume.length > 0 ? Math.max(...orderVolume.map((v: any) => v.volume)) : 1

  const revenuePct = stats?.revenue_pct || []
  const regionsGMV = stats?.regions || []
  const recentActivity = stats?.recent_activity || []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'super_admin' && region === 'global'
              ? "Welcome back! Here's your global platform overview."
              : `Welcome, ${user?.name?.split(' ')[0]}! Here's what's happening in ${regionInfo?.name}.`}
          </p>
        </div>
        {role !== 'super_admin' && regionInfo && (
          <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Assigned Region</p>
            <p className="text-lg font-bold text-foreground">{regionInfo.name}</p>
            <p className="text-xs text-primary">{regionInfo.country}</p>
          </div>
        )}
      </div>

      {/* ── KPI Cards — all clickable ── */}
      <div>
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Click any card to see detailed breakdown
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {KPI_CARDS.map(card => {
            const Icon = card.icon
            const isNeg = card.trend < 0
            return (
              <Card
                key={card.slug}
                onClick={() => router.push(`/dashboard/kpi/${card.slug}`)}
                className={`p-6 glass-dark border-border hover:border-primary/50 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer group ${isLoading ? 'animate-pulse opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                      {card.title}
                    </p>
                    <div className="h-9 mt-2">
                      {isLoading ? (
                        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                      ) : (
                        <p className="text-3xl font-bold text-foreground truncate">
                          {card.getValue(stats)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary opacity-50" />
                      <span className="text-xs text-muted-foreground">vs last period</span>
                    </div>
                    <div className="h-4 mt-2">
                      {isLoading ? (
                        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                      ) : (
                        <p className="text-xs text-muted-foreground">{card.sub(stats)}</p>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${card.iconBg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Volume Trend */}
        <Card className="p-6 glass-dark flex flex-col justify-between">
          <h3 className="font-semibold text-foreground mb-4">Order Volume (Last 24 Hours)</h3>
          {isLoading ? (
            <div className="h-40 flex items-end gap-1 animate-pulse opacity-50">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: '30%' }} />
              ))}
            </div>
          ) : orderVolume.length > 0 ? (
            <>
              <div className="h-40 flex items-end gap-1">
                {orderVolume.map((dataPt: any, i: number) => {
                  const pct = maxVolume > 0 ? (dataPt.volume / maxVolume) * 100 : 0
                  return (
                    <div key={i} className="flex-1 bg-primary/25 hover:bg-primary/50 rounded-t transition-colors cursor-pointer relative group"
                      style={{ height: `${Math.max(pct, 5)}%` }} // minimum 5% height so it's visible
                    >
                      {/* Tooltip */}
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10 font-mono">
                        {dataPt.hour}: {dataPt.volume} Orders
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground mt-3 tracking-widest px-1 border-t border-border pt-2">
                <span>24H Ago</span><span>Live</span>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
              No order volume recorded in the last 24h
            </div>
          )}
        </Card>

        {/* Revenue Breakdown */}
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4">Revenue Generation Blueprint</h3>
          {isLoading ? (
            <div className="space-y-4 animate-pulse opacity-50">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {revenuePct.map((item: any) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-foreground font-mono">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Region Overview — Super Admin only */}
      {role === 'super_admin' && region === 'global' && (
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Regions Overview
          </h3>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse opacity-50">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted rounded-xl" />)}
            </div>
          ) : regionsGMV.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {regionsGMV.map((r: any) => (
                <div key={r.label} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50">
                  <span className="text-2xl">{r.flag}</span>
                  <div>
                    <p className="font-bold text-foreground text-xs uppercase tracking-widest">{r.label}</p>
                    <p className="text-primary font-black mt-1">KES {r.gmv.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 text-xs text-muted-foreground border border-dashed border-border rounded-xl">No active regional logic found</div>
          )}
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" /> System Intelligence Feed
        </h3>
        {isLoading ? (
          <div className="space-y-3 animate-pulse opacity-50">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-xl" />)}
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((item: any, i: number) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-white/5">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 shadow-[0_0_10px_currentColor] ${item.type === 'alert' ? 'text-yellow-400 bg-yellow-400'
                    : item.type === 'payment' ? 'text-green-400 bg-green-400'
                      : item.type === 'driver' ? 'text-orange-400 bg-orange-400'
                        : 'text-primary bg-primary'
                    }`} />
                  <p className="text-sm text-foreground font-medium flex-1">{item.msg}</p>
                </div>
                <span className="text-xs text-muted-foreground font-mono bg-black/20 px-2 py-1 rounded w-fit">{item.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl flex flex-col items-center">
            <Clock className="h-8 w-8 mb-2 opacity-20" />
            Awaiting System Events...
          </div>
        )}
      </Card>
    </div>
  )
}
