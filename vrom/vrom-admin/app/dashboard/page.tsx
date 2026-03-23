'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Users, Zap, AlertCircle, Eye, MapPin, Wallet, Globe } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS } from '@/lib/regions'

interface KPIData {
  gmv: number
  commission: number
  escrow: number
  activeOrders: number
  activeDrivers: number
  avgDeliveryTime: number
}

export default function DashboardPage() {
  const { user, role, region } = useUser()
  const regionInfo = REGIONS[region as any]
  
  const [kpiData, setKpiData] = useState<KPIData>({
    gmv: region === 'global' ? 2450000 : regionInfo?.gmv || 284000,
    commission: region === 'global' ? 342000 : Math.round((regionInfo?.gmv || 284000) * 0.12),
    escrow: region === 'global' ? 125000 : Math.round((regionInfo?.gmv || 284000) * 0.05),
    activeOrders: region === 'global' ? 1842 : (regionInfo?.activeOrders || 345) * 3,
    activeDrivers: region === 'global' ? 523 : regionInfo?.drivers || 234,
    avgDeliveryTime: 24,
  })

  const [isLoading, setIsLoading] = useState(false)

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setKpiData(prev => ({
        ...prev,
        gmv: prev.gmv + Math.floor(Math.random() * 10000),
        commission: prev.commission + Math.floor(Math.random() * 1000),
        escrow: prev.escrow + Math.floor(Math.random() * 500),
        activeOrders: prev.activeOrders + Math.floor(Math.random() * 5 - 2),
        activeDrivers: prev.activeDrivers + Math.floor(Math.random() * 3 - 1),
        avgDeliveryTime: Math.max(20, prev.avgDeliveryTime + Math.random() - 0.5),
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'super_admin' && region === 'global'
              ? 'Welcome back! Here\'s your global platform overview.'
              : `Welcome to ${regionInfo?.name}! Here's your regional overview.`}
          </p>
        </div>
        {role !== 'super_admin' && (
          <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-muted-foreground">Assigned Region</p>
            <p className="text-lg font-bold text-foreground">{regionInfo?.name}</p>
            <p className="text-xs text-primary">{regionInfo?.country}</p>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Gross Merchandise Value */}
        <Card className="p-6 glass-dark border-primary/20 hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Gross Merchandise Value
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(kpiData.gmv)}
              </p>
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                +8.2% from yesterday
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Platform Commission */}
        <Card className="p-6 glass-dark border-primary/20 hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Platform Commission
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(kpiData.commission)}
              </p>
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                +5.1% from yesterday
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Escrow In-Flight */}
        <Card className="p-6 glass-dark border-primary/20 hover:border-primary/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Escrow In-Flight
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(kpiData.escrow)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                12 pending disbursements
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Eye className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Active Orders */}
        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Active Orders
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpiData.activeOrders.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Real-time tracking enabled
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Zap className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>

        {/* Active Drivers */}
        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Active Drivers
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpiData.activeDrivers}
              </p>
              <p className="text-xs text-green-500 mt-2">
                +12 new drivers today
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Users className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>

        {/* Average Delivery Time */}
        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Avg. Delivery Time
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {kpiData.avgDeliveryTime.toFixed(1)}m
              </p>
              <p className="text-xs text-green-500 mt-2">
                -2.3% from target
              </p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <MapPin className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Order Trends */}
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4">Order Volume Trend</h3>
          <div className="h-48 flex items-end justify-center gap-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors"
                style={{
                  height: `${Math.random() * 100}%`,
                  minHeight: '8px',
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">Last 24 hours</p>
        </Card>

        {/* Revenue Breakdown */}
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'Delivery Fees', value: 45, color: 'bg-primary' },
              { label: 'Service Tax', value: 30, color: 'bg-blue-500' },
              { label: 'Premium Services', value: 15, color: 'bg-green-500' },
              { label: 'Other', value: 10, color: 'bg-yellow-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-foreground font-medium">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {item.value}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { type: 'order', msg: 'New order placed in Mumbai - Order #12345', time: '2 min ago' },
            { type: 'driver', msg: 'New driver onboarded - License verified', time: '5 min ago' },
            { type: 'payment', msg: 'Payment processed - Amount: $2,450', time: '12 min ago' },
            { type: 'alert', msg: 'High demand detected in Bangalore region', time: '18 min ago' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.msg}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
