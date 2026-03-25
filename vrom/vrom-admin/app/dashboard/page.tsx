'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, Zap, AlertCircle, Eye, MapPin, Wallet, Globe, Car, Clock } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'
import { REGIONS } from '@/lib/regions'
import { useRouter } from 'next/navigation'
import { RegionCode } from '@/lib/types'

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
    getValue: (data) => `$${(data?.financials?.total_gmv || 0).toLocaleString()}`,
    sub: (data) => `${data?.financials?.total_orders || 0} orders this month`,
    trend: 8.2,
    icon: Wallet,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    slug: 'commission',
    title: 'Platform Commission',
    getValue: (data) => `$${(data?.financials?.total_commission || 0).toLocaleString()}`,
    sub: () => '12% avg. commission rate',
    trend: 5.1,
    icon: Zap,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
  },
  {
    slug: 'escrow',
    title: 'Escrow In-Flight',
    getValue: (data) => `$${(data?.financials?.escrow_in_flight || 0).toLocaleString()}`,
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
    icon: Zap,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    slug: 'drivers',
    title: 'Active Drivers',
    getValue: (data) => (data?.financials?.total_drivers || 0).toLocaleString(),
    sub: () => '+12 new drivers today',
    trend: 2.8,
    icon: Car,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
  {
    slug: 'delivery',
    title: 'Avg. Delivery Time',
    getValue: () => '24.3m',
    sub: () => '-2.3% from target — great!',
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
        const token = localStorage.getItem('vrom_session_token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/analytics/financials`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
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

  const recentActivity = [
    { type: 'order', msg: `New order placed in ${regionInfo?.name || 'Nairobi'} — #ORD${Math.floor(Math.random() * 90000 + 10000)}`, time: '2 min ago' },
    { type: 'driver', msg: 'New driver onboarded — License verified ✓', time: '5 min ago' },
    { type: 'payment', msg: `Payment processed — $${(Math.random() * 3000 + 500).toFixed(0)}`, time: '12 min ago' },
    { type: 'alert', msg: `High demand detected in ${regionInfo?.name || 'Downtown'} zone`, time: '18 min ago' },
    { type: 'order', msg: 'Order #ORD45673 — Delivered successfully', time: '24 min ago' },
  ]

  return (
    <div className="space-y-6">
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
                         <p className="text-3xl font-bold text-foreground">
                            {card.getValue(stats)}
                         </p>
                       )}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {isNeg
                        ? <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        : <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      }
                      <span className={`text-xs font-semibold ${isNeg ? 'text-red-500' : 'text-green-500'}`}>
                        {isNeg ? '' : '+'}{card.trend}%
                      </span>
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
                <div className="mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-primary font-medium group-hover:underline">View full details →</span>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Volume Trend */}
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4">Order Volume (Last 24 Hours)</h3>
          <div className="h-40 flex items-end gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 bg-primary/25 hover:bg-primary/50 rounded-t transition-colors cursor-pointer"
                style={{ height: `${20 + Math.abs(Math.sin(i * 0.8) * 75 + Math.random() * 15)}%`, minHeight: '8px' }}
                title={`${i}:00`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>00:00</span><span>12:00</span><span>23:59</span>
          </div>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4">Revenue Breakdown</h3>
          <div className="space-y-3.5">
            {[
              { label: 'Delivery Fees', pct: 45, color: 'bg-primary' },
              { label: 'Service Tax', pct: 30, color: 'bg-blue-500' },
              { label: 'Premium Services', pct: 15, color: 'bg-green-500' },
              { label: 'Other', pct: 10, color: 'bg-yellow-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Region Overview — Super Admin only */}
      {role === 'super_admin' && region === 'global' && (
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Regions Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Nairobi, Kenya', gmv: '284K', flag: '🇰🇪', status: 'active' },
              { label: 'Lagos, Nigeria', gmv: '756K', flag: '🇳🇬', status: 'active' },
              { label: 'Kampala, Uganda', gmv: '89K', flag: '🇺🇬', status: 'active' },
              { label: 'Dar es Salaam', gmv: '156K', flag: '🇹🇿', status: 'active' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-xl">{r.flag}</span>
                <div>
                  <p className="font-medium text-foreground text-xs">{r.label}</p>
                  <p className="text-primary font-bold">${r.gmv}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${item.type === 'alert' ? 'bg-yellow-400' : item.type === 'payment' ? 'bg-green-400' : 'bg-primary'
                }`} />
              <p className="text-sm text-foreground flex-1 truncate">{item.msg}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
