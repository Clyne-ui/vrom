'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users, Zap, BarChart3, Download, Globe } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS, REGION_LIST } from '@/lib/regions'
import { RegionCode } from '@/lib/types'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

// Colors for charts
const COLORS = ['#FF8C42', '#1A2A4A', '#3B82F6', '#10B981', '#F59E0B', '#EC4899']

// Generate daily order data
const getDailyOrderData = (regionCode: string) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day) => ({
    day,
    orders: Math.floor(Math.random() * 300 + 200),
    revenue: Math.floor(Math.random() * 50000 + 30000),
  }))
}

// Generate hourly data
const getHourlyData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    active: Math.floor(Math.random() * 500 + 300),
  }))
}

// Regional performance data
const getRegionalPerformance = () => {
  return REGION_LIST.map((region) => ({
    name: region.code.toUpperCase(),
    gmv: region.gmv / 1000000, // In millions
    orders: region.activeOrders * 3,
    users: region.drivers + region.riders,
  }))
}

// Order status distribution
const getOrderStatus = () => {
  return [
    { name: 'Completed', value: 65, color: '#10B981' },
    { name: 'Pending', value: 20, color: '#F59E0B' },
    { name: 'In Progress', value: 10, color: '#3B82F6' },
    { name: 'Cancelled', value: 5, color: '#EF4444' },
  ]
}

interface KPIWidget {
  id: string
  title: string
  value: string | number
  trend: number
  icon: any
  color: string
  region?: string
}

export default function AnalyticsPage() {
  const { user, role, region } = useUser()
  const [dateRange, setDateRange] = useState('week')
  const [selectedChart, setSelectedChart] = useState('overview')

  // Get regional data
  const getRegionalData = (regionCode: string) => {
    const regionInfo = REGIONS[regionCode as RegionCode]
    if (!regionInfo) return null

    return {
      orders: Math.round(regionInfo.activeOrders * 3.5),
      users: regionInfo.riders + regionInfo.drivers,
      avgOrderValue: Math.round(regionInfo.gmv / Math.round(regionInfo.activeOrders * 3.5) * 100) / 100,
      conversionRate: (Math.random() * 5 + 2).toFixed(1),
      gmv: regionInfo.gmv,
    }
  }

  // Build KPI widgets based on role
  const getWidgets = (): KPIWidget[] => {
    if (role === 'super_admin' && region === 'global') {
      const globalStats = {
        orders: REGION_LIST.reduce((sum, r) => sum + Math.round(r.activeOrders * 3.5), 0),
        users: REGION_LIST.reduce((sum, r) => sum + r.riders + r.drivers, 0),
        gmv: REGION_LIST.reduce((sum, r) => sum + r.gmv, 0),
      }

      return [
        {
          id: 'w1',
          title: 'Global Orders',
          value: globalStats.orders.toLocaleString(),
          trend: 8.5,
          icon: Zap,
          color: 'text-blue-500',
        },
        {
          id: 'w2',
          title: 'Global Users',
          value: globalStats.users.toLocaleString(),
          trend: 5.2,
          icon: Users,
          color: 'text-green-500',
        },
        {
          id: 'w3',
          title: 'Global GMV',
          value: `$${(globalStats.gmv / 1000000).toFixed(1)}M`,
          trend: 12.3,
          icon: TrendingUp,
          color: 'text-purple-500',
        },
        {
          id: 'w4',
          title: 'Avg Order Value',
          value: `$${(globalStats.gmv / globalStats.orders).toFixed(2)}`,
          trend: -2.1,
          icon: BarChart3,
          color: 'text-orange-500',
        },
      ]
    } else if (role === 'super_admin') {
      const regionData = getRegionalData(region)
      if (!regionData) return []

      return [
        {
          id: 'w1',
          title: `Orders - ${REGIONS[region as RegionCode]?.name}`,
          value: regionData.orders.toLocaleString(),
          trend: 8.5,
          icon: Zap,
          color: 'text-blue-500',
          region,
        },
        {
          id: 'w2',
          title: `Active Users - ${REGIONS[region as RegionCode]?.name}`,
          value: regionData.users.toLocaleString(),
          trend: 5.2,
          icon: Users,
          color: 'text-green-500',
          region,
        },
        {
          id: 'w3',
          title: `GMV - ${REGIONS[region as RegionCode]?.name}`,
          value: `$${(regionData.gmv / 1000).toFixed(0)}K`,
          trend: 12.3,
          icon: TrendingUp,
          color: 'text-purple-500',
          region,
        },
        {
          id: 'w4',
          title: `Avg Order Value - ${REGIONS[region as RegionCode]?.name}`,
          value: `$${regionData.avgOrderValue}`,
          trend: -2.1,
          icon: BarChart3,
          color: 'text-orange-500',
          region,
        },
      ]
    } else {
      const regionData = getRegionalData(region)
      if (!regionData) return []

      return [
        {
          id: 'w1',
          title: 'Total Orders',
          value: regionData.orders.toLocaleString(),
          trend: 8.5,
          icon: Zap,
          color: 'text-blue-500',
        },
        {
          id: 'w2',
          title: 'Active Users',
          value: regionData.users.toLocaleString(),
          trend: 5.2,
          icon: Users,
          color: 'text-green-500',
        },
        {
          id: 'w3',
          title: 'Regional GMV',
          value: `$${(regionData.gmv / 1000).toFixed(0)}K`,
          trend: 12.3,
          icon: TrendingUp,
          color: 'text-purple-500',
        },
        {
          id: 'w4',
          title: 'Conversion Rate',
          value: `${regionData.conversionRate}%`,
          trend: -2.1,
          icon: BarChart3,
          color: 'text-orange-500',
        },
      ]
    }
  }

  const widgets = getWidgets()
  const dailyData = getDailyOrderData(region)
  const hourlyData = getHourlyData()
  const regionalPerf = getRegionalPerformance()
  const orderStatus = getOrderStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'super_admin' && region === 'global'
              ? 'Global platform performance metrics'
              : `${REGIONS[region as RegionCode]?.name} regional analytics`}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">Last Year</option>
          </select>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((widget) => {
          const Icon = widget.icon
          return (
            <Card key={widget.id} className="p-6 glass-dark">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground">{widget.title}</p>
                  <h3 className="text-2xl font-bold text-foreground">
                    {widget.value}
                  </h3>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className={widget.trend > 0 ? 'text-green-500' : 'text-red-500'}>
                      {widget.trend > 0 ? '+' : ''}{widget.trend}% from last period
                    </span>
                  </div>
                </div>
                <Icon className={`h-8 w-8 ${widget.color}`} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Orders & Revenue */}
        <Card className="p-6 glass-dark">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Daily Orders & Revenue ({dateRange === 'week' ? 'This Week' : 'This Month'})
            </h3>
            <ChartContainer
              config={{
                orders: {
                  label: 'Orders',
                  color: '#FF8C42',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#FF8C42"
                    name="Orders"
                    dot={{ fill: '#FF8C42' }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card>

        {/* Hourly Active Users */}
        <Card className="p-6 glass-dark">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Active Users - Today</h3>
            <ChartContainer
              config={{
                active: {
                  label: 'Active Users',
                  color: '#3B82F6',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="active" fill="#3B82F6" name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card>

        {/* Order Status Distribution */}
        <Card className="p-6 glass-dark">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Order Status Distribution</h3>
            <ChartContainer
              config={{
                status: {
                  label: 'Orders',
                  color: '#FF8C42',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </Card>

        {/* Regional Performance */}
        {(role === 'super_admin' || region === 'global') && (
          <Card className="p-6 glass-dark">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Regional Performance Comparison
              </h3>
              <ChartContainer
                config={{
                  gmv: {
                    label: 'GMV ($M)',
                    color: '#FF8C42',
                  },
                  orders: {
                    label: 'Orders',
                    color: '#3B82F6',
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalPerf} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="gmv" fill="#FF8C42" name="GMV ($M)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Revenue Trend */}
      <Card className="p-6 glass-dark">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Revenue Trend</h3>
          <ChartContainer
            config={{
              revenue: {
                label: 'Revenue',
                color: '#10B981',
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  name="Revenue ($)"
                  dot={{ fill: '#10B981' }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </Card>
    </div>
  )
}
