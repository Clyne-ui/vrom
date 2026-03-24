'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, Zap, Eye,
  Users, MapPin, ShoppingBag, Car, DollarSign, BarChart3,
  Clock, AlertCircle, CheckCircle
} from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS } from '@/lib/regions'
import { RegionCode } from '@/lib/types'

// ─── Card definitions ───────────────────────────────────────────
const CARD_META: Record<string, {
  title: string
  description: string
  icon: any
  color: string
  value: (gmv: number) => string
  trend: number
  stats: (gmv: number) => Array<{ label: string; value: string; sub?: string }>
  chartLabel: string
}> = {
  gmv: {
    title: 'Gross Merchandise Value',
    description: 'Total value of all goods and services sold through the Vrom platform in the selected period.',
    icon: Wallet,
    color: 'text-primary',
    value: (g) => `$${(g / 1000).toFixed(1)}K`,
    trend: 8.2,
    stats: (g) => [
      { label: 'Today', value: `$${(g * 0.035).toFixed(0)}`, sub: '+3.5%' },
      { label: 'This Week', value: `$${(g * 0.22).toFixed(0)}`, sub: '+7.1%' },
      { label: 'This Month', value: `$${(g / 1000).toFixed(1)}K`, sub: '+8.2%' },
      { label: 'Highest Day', value: `$${(g * 0.06).toFixed(0)}`, sub: 'Saturday' },
      { label: 'Avg. Order Value', value: `$${(g / 3500).toFixed(2)}`, sub: 'Per transaction' },
      { label: 'Refunds', value: `$${(g * 0.015).toFixed(0)}`, sub: '1.5% of GMV' },
    ],
    chartLabel: 'Daily GMV (Last 30 Days)',
  },
  commission: {
    title: 'Platform Commission',
    description: 'Revenue earned by Vrom from delivery fees, service charges, and percentage cuts on each transaction.',
    icon: DollarSign,
    color: 'text-green-500',
    value: (g) => `$${(g * 0.12 / 1000).toFixed(1)}K`,
    trend: 5.1,
    stats: (g) => [
      { label: 'Delivery Fees', value: `$${(g * 0.06).toFixed(0)}`, sub: '6% of GMV' },
      { label: 'Service Charges', value: `$${(g * 0.04).toFixed(0)}`, sub: '4% of GMV' },
      { label: 'Surge Premium', value: `$${(g * 0.012).toFixed(0)}`, sub: '1.2% of GMV' },
      { label: 'Monthly Total', value: `$${(g * 0.12 / 1000).toFixed(1)}K`, sub: '+5.1%' },
      { label: 'Payout to Riders', value: `$${(g * 0.78).toFixed(0)}`, sub: '78% to partners' },
      { label: 'Net Margin', value: `${(12).toFixed(1)}%`, sub: 'Commission rate' },
    ],
    chartLabel: 'Daily Commission Earned (Last 30 Days)',
  },
  escrow: {
    title: 'Escrow In-Flight',
    description: 'Funds currently held in escrow pending order completion, delivery confirmation, or dispute resolution.',
    icon: Eye,
    color: 'text-yellow-500',
    value: (g) => `$${(g * 0.05 / 1000).toFixed(1)}K`,
    trend: 0.4,
    stats: (g) => [
      { label: 'Pending Orders', value: `$${(g * 0.03).toFixed(0)}`, sub: 'Awaiting delivery' },
      { label: 'In Dispute', value: `$${(g * 0.008).toFixed(0)}`, sub: 'Under review' },
      { label: 'Ready to Release', value: `$${(g * 0.012).toFixed(0)}`, sub: 'Confirmed delivery' },
      { label: 'Avg Hold Time', value: '4.2 hrs', sub: 'Per transaction' },
      { label: 'Release Rate', value: '94.8%', sub: 'Auto-released' },
      { label: 'Dispute Rate', value: '1.8%', sub: 'Of all orders' },
    ],
    chartLabel: 'Escrow Balance Over Time (Last 30 Days)',
  },
  orders: {
    title: 'Active Orders',
    description: 'Real-time count of orders currently in progress — placed, being prepared, or out for delivery.',
    icon: ShoppingBag,
    color: 'text-blue-500',
    value: (g) => `${Math.round(g / 150)}`,
    trend: 3.2,
    stats: (g) => [
      { label: 'In Preparation', value: `${Math.round(g / 600)}`, sub: 'At merchant' },
      { label: 'Out for Delivery', value: `${Math.round(g / 400)}`, sub: 'With rider' },
      { label: 'Placed (Pending)', value: `${Math.round(g / 900)}`, sub: 'Awaiting pickup' },
      { label: 'Completed Today', value: `${Math.round(g / 80)}`, sub: '+5 vs yesterday' },
      { label: 'Cancelled Today', value: `${Math.round(g / 2000)}`, sub: `2.1% rate` },
      { label: 'Avg Fulfilment', value: '28 min', sub: 'Farm to door' },
    ],
    chartLabel: 'Orders Per Hour (Today)',
  },
  drivers: {
    title: 'Active Drivers',
    description: 'Riders and delivery partners currently online and available to accept orders.',
    icon: Car,
    color: 'text-orange-500',
    value: (g) => `${Math.round(g / 600)}`,
    trend: 2.8,
    stats: (g) => [
      { label: 'On a Trip', value: `${Math.round(g / 800)}`, sub: 'Delivering now' },
      { label: 'Available', value: `${Math.round(g / 1200)}`, sub: 'Ready to accept' },
      { label: 'New Today', value: `${Math.round(g / 30000)}`, sub: 'Just came online' },
      { label: 'Total Fleet', value: `${Math.round(g / 110)}`, sub: 'Registered drivers' },
      { label: 'Avg Trips / Day', value: '12.4', sub: 'Per active driver' },
      { label: 'Avg Rating', value: '4.7 ★', sub: 'Platform average' },
    ],
    chartLabel: 'Driver Activity (Last 30 Days)',
  },
  delivery: {
    title: 'Avg. Delivery Time',
    description: 'Average time from order placement to customer delivery across all active regions.',
    icon: Clock,
    color: 'text-purple-500',
    value: () => '24.3m',
    trend: -2.3,
    stats: () => [
      { label: 'Fastest Zone', value: '14 min', sub: 'CBD area' },
      { label: 'Slowest Zone', value: '42 min', sub: 'Outlying suburbs' },
      { label: 'Platform Target', value: '< 30 min', sub: 'SLA' },
      { label: 'On-Time Rate', value: '87.4%', sub: 'Within target' },
      { label: 'Late Deliveries', value: '12.6%', sub: 'Above 30 min' },
      { label: 'Avg Pickup Wait', value: '5.2 min', sub: 'Merchant prep' },
    ],
    chartLabel: 'Avg. Delivery Time Per Hour (Today)',
  },
}

function MiniBarChart({ seed, color }: { seed: number; color: string }) {
  return (
    <div className="h-48 flex items-end gap-1 pt-4">
      {Array.from({ length: 30 }).map((_, i) => {
        const h = 10 + Math.abs(Math.sin((i + seed) * 0.6) * 80) + Math.random() * 15
        return (
          <div key={i} className={`flex-1 rounded-t transition-colors cursor-pointer ${color} hover:opacity-80`}
            style={{ height: `${h}%`, minHeight: '4px' }}
            title={`Day ${i + 1}`}
          />
        )
      })}
    </div>
  )
}

export default function KPIDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { region } = useUser()
  const slug = params?.slug as string

  const meta = CARD_META[slug]
  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-foreground">KPI Not Found</h2>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  const regionInfo = REGIONS[region as RegionCode]
  const baseGMV = region === 'global' ? 2450000 : (regionInfo?.gmv ?? 284000)
  const Icon = meta.icon

  const stats = meta.stats(baseGMV)
  const mainValue = meta.value(baseGMV)
  const isPositive = meta.trend >= 0

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl bg-muted`}>
            <Icon className={`h-7 w-7 ${meta.color}`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{meta.title}</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">{meta.description}</p>
          </div>
        </div>
      </div>

      {/* Hero metric */}
      <Card className="p-6 glass-dark border-primary/20 bg-primary/5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Current Value</p>
            <p className="text-5xl font-bold text-foreground mt-2">{mainValue}</p>
            <div className="flex items-center gap-2 mt-3">
              {isPositive
                ? <TrendingUp className="h-5 w-5 text-green-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />
              }
              <span className={`text-base font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{meta.trend}% from last period
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Region</p>
            <p className="text-lg font-bold text-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              {region === 'global' ? 'Global' : regionInfo?.name}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 glass-dark hover:border-primary/30 transition-all">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="p-6 glass-dark">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">{meta.chartLabel}</h3>
          <div className="flex gap-1">
            {['7D', '30D', '90D'].map(r => (
              <button key={r} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${r === '30D' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <MiniBarChart seed={slug.charCodeAt(0)} color={`${meta.color.replace('text-', 'bg-')}/30`} />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Day 1</span>
          <span>Day 15</span>
          <span>Day 30</span>
        </div>
      </Card>

      {/* Status indicators */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4">Health Indicators</h3>
        <div className="space-y-3">
          {[
            { label: 'Data Feed', status: 'healthy', msg: 'Real-time sync active' },
            { label: 'Backend API', status: 'healthy', msg: 'All endpoints responding' },
            { label: 'Alert Threshold', status: meta.trend < 0 ? 'warning' : 'healthy', msg: meta.trend < 0 ? 'Below target — investigate' : 'Within normal range' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-foreground font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.msg}</span>
                {item.status === 'healthy'
                  ? <CheckCircle className="h-4 w-4 text-green-500" />
                  : <AlertCircle className="h-4 w-4 text-yellow-500" />
                }
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
