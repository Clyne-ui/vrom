'use client'

import { useState, useMemo } from 'react'
import { useUser } from '@/lib/contexts/user-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, TrendingUp, Users, ShoppingBag, Zap, Globe, Lock } from 'lucide-react'
import { REGIONS, REGION_LIST } from '@/lib/regions'
import { RegionCode } from '@/lib/types'

export default function RegionsPage() {
  const { user, role } = useUser()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  // Only super admins can access this page
  if (role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Lock className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">Only Super Admins can manage regions</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const filteredRegions = REGION_LIST.filter(region =>
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    totalRegions: REGION_LIST.length,
    activeRegions: REGION_LIST.filter(r => r.status === 'active').length,
    totalDrivers: REGION_LIST.reduce((sum, r) => sum + r.drivers, 0),
    totalRiders: REGION_LIST.reduce((sum, r) => sum + r.riders, 0),
    totalGMV: REGION_LIST.reduce((sum, r) => sum + r.gmv, 0),
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Regional Management</h1>
        <p className="text-muted-foreground">Manage all regions and monitor multi-country operations</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Regions</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalRegions}</p>
              <p className="text-xs text-primary mt-2">{stats.activeRegions} Active</p>
            </div>
            <Globe className="h-10 w-10 text-primary/20" />
          </div>
        </Card>

        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Drivers</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalDrivers.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-2">+12% from last month</p>
            </div>
            <Users className="h-10 w-10 text-green-500/20" />
          </div>
        </Card>

        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Riders</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalRiders.toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-2">+18% from last month</p>
            </div>
            <Users className="h-10 w-10 text-blue-500/20" />
          </div>
        </Card>

        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Merchants</p>
              <p className="text-3xl font-bold text-foreground">
                {REGION_LIST.reduce((sum, r) => sum + r.merchants, 0).toLocaleString()}
              </p>
              <p className="text-xs text-purple-500 mt-2">+8% from last month</p>
            </div>
            <ShoppingBag className="h-10 w-10 text-purple-500/20" />
          </div>
        </Card>

        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Global GMV</p>
              <p className="text-3xl font-bold text-foreground">${(stats.totalGMV / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-orange-500 mt-2">+24% YoY</p>
            </div>
            <TrendingUp className="h-10 w-10 text-orange-500/20" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search regions by name or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button className="bg-primary hover:bg-primary/90">
          <Zap className="h-4 w-4 mr-2" />
          Add New Region
        </Button>
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegions.map((region) => (
          <Card key={region.code} className="p-6 glass-dark hover:bg-card/50 transition-colors cursor-pointer group">
            <div className="space-y-4">
              {/* Region Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{region.name}</h3>
                    <p className="text-xs text-muted-foreground">{region.country}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  region.status === 'active'
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {region.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Drivers</p>
                  <p className="text-lg font-bold text-foreground">{region.drivers.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Riders</p>
                  <p className="text-lg font-bold text-foreground">{region.riders.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Merchants</p>
                  <p className="text-lg font-bold text-foreground">{region.merchants}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Orders</p>
                  <p className="text-lg font-bold text-foreground">{region.activeOrders.toLocaleString()}</p>
                </div>
              </div>

              {/* Region Info */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GMV</span>
                  <span className="font-semibold text-foreground">${region.gmv.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-semibold text-foreground">{region.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-semibold text-foreground">{region.timezone}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" className="flex-1">
                  Manage
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Analytics
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Multi-Country Expansion Section */}
      <Card className="p-6 glass-dark border-primary/30 bg-primary/5">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Ready to Expand to New Countries?
          </h2>
          <p className="text-sm text-muted-foreground">
            Add new regions to scale Vrom's operations globally. Configure regional settings, assign admins, and monitor performance in real-time.
          </p>
          <Button className="bg-primary hover:bg-primary/90">
            Request New Region Setup
          </Button>
        </div>
      </Card>
    </div>
  )
}
