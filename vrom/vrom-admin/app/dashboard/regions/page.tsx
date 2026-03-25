'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/contexts/user-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, TrendingUp, Users, ShoppingBag, Globe, Lock, Zap } from 'lucide-react'
import { REGION_LIST } from '@/lib/regions'
import { RegionCard, ExtendedRegion } from '@/components/dashboard/regions/region-card'
import { ManagementHubDrawer, RegionUser } from '@/components/dashboard/regions/management-hub-drawer'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'

const DEMO_REGION_USERS: Record<string, RegionUser[]> = {
  kenya: [
    { id: 'ADM01', name: 'Clyne Mwangi', role: 'admin', status: 'active' },
    { id: 'RDR01', name: 'James Kamau', role: 'rider', status: 'pending_approval', documents: [{ type: 'Driver License', url: '#', approved: null }, { type: 'Vehicle Insurance', url: '#', approved: null }] },
    { id: 'USR01', name: 'Alice Wanjiku', role: 'customer', status: 'active' },
  ],
  nigeria: [
    { id: 'ADM02', name: 'Emeka Okafor', role: 'admin', status: 'active' },
    { id: 'RDR02', name: 'Chinedu Eze', role: 'rider', status: 'active' },
  ],
  uganda: [
    { id: 'ADM03', name: 'Sarah Nakato', role: 'admin', status: 'active' },
  ]
}

export default function RegionsPage() {
  const { role } = useUser()
  const router = useRouter()

  const [regions, setRegions] = useState<ExtendedRegion[]>(
    REGION_LIST.map(r => ({ ...r, status: 'active', hasIssue: r.code === 'nigeria' }))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRegion, setNewRegion] = useState({ name: '', country: '', currency: '', timezone: '' })

  const [managingRegion, setManagingRegion] = useState<string | null>(null)
  const [regionUsers, setRegionUsers] = useState<Record<string, RegionUser[]>>({})
  const [isFetchingUsers, setIsFetchingUsers] = useState(false)
  const [liveStats, setLiveStats] = useState<any>(null)

  // 🔌 Real-time WebSocket Data
  const { data: wsData } = useOCCWebSocket('analytics')

  useEffect(() => {
    if (wsData) {
      setLiveStats(wsData)
    }
  }, [wsData])

  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        const token = localStorage.getItem('vrom_session_token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/analytics/financials`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setLiveStats(data.financials)
        }
      } catch (err) {
        console.error('Failed to fetch global stats:', err)
      }
    }
    fetchGlobal()
  }, [])

  // Fetch users for the managing region
  useEffect(() => {
    if (!managingRegion) return

    const fetchRegionUsers = async () => {
      setIsFetchingUsers(true)
      try {
        const token = localStorage.getItem('vrom_session_token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/crm/search?q=&role=`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          const dataArray = Array.isArray(data) ? data : []
          // Since backend doesn't filter by region yet, we'll map all users here for demo/dev
          setRegionUsers(prev => ({
            ...prev,
            [managingRegion]: dataArray.map((u: any) => ({
              id: u.user_id,
              name: u.full_name,
              role: u.role,
              status: u.is_verified ? 'active' : 'blocked'
            }))
          }))
        }
      } catch (err) {
        console.error('Failed to fetch region users:', err)
      } finally {
        setIsFetchingUsers(false)
      }
    }

    fetchRegionUsers()
  }, [managingRegion])

  if (role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Lock className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h1>
        <p className="text-muted-foreground mb-6">Only Super Admins can manage regions</p>
        <Button onClick={() => router.push('/dashboard')}>Go Back</Button>
      </div>
    )
  }

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateRegion = () => {
    if (!newRegion.name || !newRegion.country) return
    const code = newRegion.name.toLowerCase().replace(/\s+/g, '-')
    const created: ExtendedRegion = {
      code,
      name: newRegion.name,
      country: newRegion.country,
      currency: newRegion.currency || 'USD',
      timezone: newRegion.timezone || 'UTC',
      status: 'active',
      drivers: 0, riders: 0, merchants: 0, activeOrders: 0, gmv: 0,
      hasIssue: false
    }
    setRegions([...regions, created])
    setRegionUsers({ ...regionUsers, [code]: [] })
    setNewRegion({ name: '', country: '', currency: '', timezone: '' })
    setShowAddForm(false)
  }

  const handleBlockRegion = (code: string) => {
    setRegions(prev => prev.map(r => r.code === code ? { ...r, status: r.status === 'blocked' ? 'active' : 'blocked' } : r))
  }

  const handleDeleteRegion = (code: string) => {
    setRegions(prev => prev.filter(r => r.code !== code))
    if (managingRegion === code) setManagingRegion(null)
  }

  const handleUserAction = async (regionCode: string, userId: string, action: 'block' | 'delete' | 'approve_doc' | 'decline_doc') => {
    try {
      const token = localStorage.getItem('vrom_session_token')
      
      if (action === 'block') {
        const isBlocked = regionUsers[regionCode]?.find(u => u.id === userId)?.status === 'blocked'
        const endpoint = isBlocked ? 'unsuspend' : 'suspend'
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/admin/${endpoint}`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: userId })
        })

        if (res.ok) {
          setRegionUsers(prev => ({
            ...prev,
            [regionCode]: prev[regionCode].map(u => 
              u.id === userId ? { ...u, status: isBlocked ? 'active' : 'blocked' } as RegionUser : u
            )
          }))
        }
      }
      // Handle other actions (delete, approve_doc) if backend has endpoints
    } catch (err) {
      console.error('Action failed:', err)
    }
  }

  const stats = {
    totalRegions: regions.length,
    activeRegions: regions.filter(r => r.status === 'active').length,
    totalDrivers: regions.reduce((sum, r) => sum + r.drivers, 0),
    totalRiders: regions.reduce((sum, r) => sum + r.riders, 0),
    totalGMV: regions.reduce((sum, r) => sum + r.gmv, 0),
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Regional Management</h1>
          <p className="text-muted-foreground">Manage all regions and monitor multi-country operations</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2 bg-primary">
          <Globe className="h-4 w-4" /> Add New Region
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Regions', val: stats.totalRegions, sub: `${stats.activeRegions} Active`, icon: Globe, iconColor: 'text-primary' },
          { label: 'Platform Drivers', val: (liveStats?.total_drivers || 0).toLocaleString(), sub: 'Across all regions', icon: Users, iconColor: 'text-green-500' },
          { label: 'Platform Riders', val: (liveStats?.total_riders || 0).toLocaleString(), sub: 'Across all regions', icon: Users, iconColor: 'text-blue-500' },
          { label: 'Total Sales', val: (liveStats?.completed_sales || 0).toLocaleString(), sub: 'Lifetime volume', icon: ShoppingBag, iconColor: 'text-purple-500' },
          { label: 'Global GMV', val: `$${(liveStats?.gmv || 0).toLocaleString()}`, sub: 'Real-time platform value', icon: TrendingUp, iconColor: 'text-orange-500' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i} className="p-6 glass-dark">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground">{s.val}</p>
                  <p className={`text-xs mt-2 ${s.iconColor}`}>{s.sub}</p>
                </div>
                <Icon className={`h-10 w-10 ${s.iconColor} opacity-20`} />
              </div>
            </Card>
          )
        })}
      </div>

      {showAddForm && (
        <Card className="p-6 glass-dark bg-primary/5 border border-primary/30 animate-in fade-in slide-in-from-top-4">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Setup New Region</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><label className="text-sm font-medium text-foreground">City / Region Name</label><Input placeholder="e.g. Accra" value={newRegion.name} onChange={e => setNewRegion({ ...newRegion, name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-foreground">Country</label><Input placeholder="e.g. Ghana" value={newRegion.country} onChange={e => setNewRegion({ ...newRegion, country: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-foreground">Currency</label><Input placeholder="e.g. GHS" value={newRegion.currency} onChange={e => setNewRegion({ ...newRegion, currency: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-foreground">Timezone</label><Input placeholder="e.g. GMT" value={newRegion.timezone} onChange={e => setNewRegion({ ...newRegion, timezone: e.target.value })} className="mt-1" /></div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateRegion} className="bg-primary">Launch Region</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="relative max-w-md">
        <Input placeholder="Search regions by name or country..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegions.map((region) => (
          <RegionCard
            key={region.code}
            region={region}
            onManage={setManagingRegion}
            onBlock={handleBlockRegion}
            onDelete={handleDeleteRegion}
          />
        ))}
      </div>

      <Card className="p-6 glass-dark border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => setShowAddForm(true)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Ready to Expand to New Countries?
          </h2>
          <p className="text-sm text-muted-foreground">
            Add new regions to scale Vrom's operations globally. Configure regional settings, assign admins, and monitor performance in real-time.
          </p>
        </div>
      </Card>

      <ManagementHubDrawer
        regionCode={managingRegion}
        regionName={regions.find(r => r.code === managingRegion)?.name}
        hasIssue={regions.find(r => r.code === managingRegion)?.hasIssue}
        users={regionUsers[managingRegion || ''] || []}
        onClose={() => setManagingRegion(null)}
        onResolveIssue={(code) => setRegions(prev => prev.map(r => r.code === code ? { ...r, hasIssue: false } : r))}
        onUserAction={handleUserAction}
      />
    </div>
  )
}
