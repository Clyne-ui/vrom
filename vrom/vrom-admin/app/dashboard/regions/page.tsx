'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/contexts/user-context'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, TrendingUp, Users, ShoppingBag, Globe, Lock } from 'lucide-react'
import { useLoadScript, Autocomplete } from '@react-google-maps/api'
import { RegionCard, ExtendedRegion } from '@/components/dashboard/regions/region-card'
import { ManagementHubDrawer, RegionUser } from '@/components/dashboard/regions/management-hub-drawer'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'

interface DBRegion {
  id: string
  name: string
  country: string
  currency: string
  lat: number
  lng: number
  status: string
  created_at: string
}

const libraries: "places"[] = ["places"]

export default function RegionsPage() {
  const { role, token } = useUser()
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  // Google Maps Load
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries,
  })

  const [regions, setRegions] = useState<ExtendedRegion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Autocomplete instance & state
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const [newRegion, setNewRegion] = useState({ name: '', country: '', currency: 'USD', lat: 0, lng: 0 })

  const [managingRegion, setManagingRegion] = useState<string | null>(null)
  const [regionUsers, setRegionUsers] = useState<Record<string, RegionUser[]>>({})
  const [liveStats, setLiveStats] = useState<any>(null)

  const { data: wsData } = useOCCWebSocket('analytics')

  useEffect(() => {
    if (wsData) setLiveStats(wsData)
  }, [wsData])

  const fetchRegions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/occ/regions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data: DBRegion[] = await res.json()
        setRegions(data.map(r => ({
          code: r.id,
          name: r.name,
          country: r.country,
          currency: r.currency,
          timezone: 'UTC', // Simplified
          status: (r.status || 'active') as 'active' | 'blocked',
          hasIssue: false,
          drivers: 0, riders: 0, merchants: 0, activeOrders: 0, gmv: 0
        })))
      }
    } catch (err) {
      console.error('Failed to fetch regions', err)
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => { fetchRegions() }, [fetchRegions])

  // --- Global Stats ---
  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        const response = await fetch(`${API_URL}/occ/analytics/financials`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setLiveStats(data.financials)
        }
      } catch (err) {}
    }
    fetchGlobal()
  }, [token, API_URL])

  // --- Admin/User Fetch for Drawer ---
  useEffect(() => {
    if (!managingRegion) return
    const fetchRegionUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/occ/crm/search?q=&role=`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          const dataArray = Array.isArray(data) ? data : []
          setRegionUsers(prev => ({
            ...prev,
            [managingRegion]: dataArray
              .filter((u: any) => u.assigned_region === managingRegion || managingRegion === u.assigned_region)
              .map((u: any) => ({
                id: u.user_id,
                name: u.full_name,
                role: u.role,
                status: u.is_verified ? 'active' : 'blocked'
              }))
          }))
        }
      } catch (err) {}
    }
    fetchRegionUsers()
  }, [managingRegion, API_URL, token])

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

  // --- Places Autocomplete Handlers ---
  const onLoad = (autocompleteObj: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteObj)
  }

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace()
      if (!place.geometry) return

      let city = place.name || ''
      let country = ''
      
      place.address_components?.forEach(comp => {
        if (comp.types.includes('country')) {
          country = comp.long_name
        }
      })

      setNewRegion(prev => ({
        ...prev,
        name: city,
        country: country || city,
        lat: place.geometry?.location?.lat() || 0,
        lng: place.geometry?.location?.lng() || 0
      }))
    }
  }

  const handleCreateRegion = async () => {
    if (!newRegion.name || !newRegion.country) return
    
    try {
      const res = await fetch(`${API_URL}/occ/regions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRegion)
      })

      if (res.ok) {
        await fetchRegions()
        setShowAddForm(false)
        setNewRegion({ name: '', country: '', currency: 'USD', lat: 0, lng: 0 })
      }
    } catch (err) {
      console.error('Failed to create region', err)
    }
  }

  const handleBlockRegion = (code: string) => {
    setRegions(prev => prev.map(r => r.code === code ? { ...r, status: r.status === 'blocked' ? 'active' : 'blocked' } : r))
  }

  const handleDeleteRegion = (code: string) => {
    setRegions(prev => prev.filter(r => r.code !== code))
    if (managingRegion === code) setManagingRegion(null)
  }

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    totalRegions: regions.length,
    activeRegions: regions.filter(r => r.status === 'active').length,
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
          
          {isLoaded ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground">Search City / Region</label>
                <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} options={{ types: ['(cities)'] }}>
                  <Input 
                    placeholder="Start typing a city name..." 
                    className="mt-1"
                    value={newRegion.name}
                    onChange={(e) => setNewRegion(prev => ({ ...prev, name: e.target.value }))}
                  />
                </Autocomplete>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Country</label>
                <Input placeholder="e.g. Kenya" value={newRegion.country} onChange={e => setNewRegion({ ...newRegion, country: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Currency</label>
                <Input placeholder="e.g. GHS" value={newRegion.currency} onChange={e => setNewRegion({ ...newRegion, currency: e.target.value })} className="mt-1" />
              </div>
            </div>
          ) : (
             <div className="p-4 bg-muted animate-pulse rounded-md mb-4">Loading Google Maps Places API...</div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleCreateRegion} className="bg-primary" disabled={!newRegion.name || !newRegion.country}>Launch Region</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── Optional search field ── */}
      <div className="relative max-w-md">
        <Input placeholder="Search regions by name or country..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      ) : (
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
          {filteredRegions.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground border-dashed border-2 rounded-xl">
              No regions found. Create one to get started.
            </div>
          )}
        </div>
      )}

      <ManagementHubDrawer
        regionCode={managingRegion}
        regionName={regions.find(r => r.code === managingRegion)?.name}
        hasIssue={regions.find(r => r.code === managingRegion)?.hasIssue}
        users={regionUsers[managingRegion || ''] || []}
        onClose={() => setManagingRegion(null)}
        onResolveIssue={(code) => setRegions(prev => prev.map(r => r.code === code ? { ...r, hasIssue: false } : r))}
        onUserAction={() => {}}
      />
    </div>
  )
}
