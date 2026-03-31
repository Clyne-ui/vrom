'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, MapPin, TrendingUp, Navigation, Activity, X, User, Phone, MapPin as MapPinIcon } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'
import { GoogleMapView } from '@/components/dashboard/map/google-map-view'
import { RiderDetailsDrawer } from '@/components/dashboard/map/rider-details-drawer'

interface FleetLocation {
  id: string
  rawId?: string // Original database UUID
  lat: number
  lng: number
  type: 'driver' | 'order' | 'demand'
  status: 'active' | 'idle' | 'offline'
  driverName?: string
  driverPhone?: string
  riderName?: string
  riderPhone?: string
  fare?: number
  address?: string
}

export default function MapPage() {
  const [fleetData, setFleetData] = useState<FleetLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapType, setMapType] = useState<'fleet' | 'demand' | 'supply'>('fleet')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRiderFullId, setSelectedRiderFullId] = useState<string | null>(null)
  
  // New state for displaying the right-side metric drill-down drawer
  const [selectedMetric, setSelectedMetric] = useState<'driver' | 'order' | 'demand' | null>(null)

  const mapBackendToFleet = (data: { active_trips?: any[], idle_riders?: any[] }): FleetLocation[] => {
    const trips = data.active_trips || []
    const idle = data.idle_riders || []

    const mappedTrips = trips.flatMap((t: any) => [
      { 
        id: `ACT-DRV-${t.trip_id?.slice(0, 4) || Math.random().toString().slice(2, 6)}`, 
        rawId: t.rider_id, // Store for drill-down
        lat: t.p_lat || -1.2863, 
        lng: t.p_lng || 36.8172, 
        type: 'driver' as const, 
        status: 'active' as const,
        driverName: t.driver_name || 'Assigning...',
        driverPhone: t.driver_phone || 'N/A',
        riderName: t.rider_name || 'Unknown Rider',
        riderPhone: t.rider_phone || 'N/A',
        fare: t.fare || 0,
        address: t.pickup_address || 'Current Location'
      },
      { 
        id: `ORD-${t.trip_id?.slice(0, 4) || Math.random().toString().slice(2, 6)}`, 
        lat: t.d_lat || -1.2954, 
        lng: t.d_lng || 36.8225, 
        type: 'order' as const, 
        status: 'active' as const,
        driverName: t.driver_name || 'Assigning...',
        driverPhone: t.driver_phone || 'N/A',
        riderName: t.rider_name || 'Unknown Rider',
        riderPhone: t.rider_phone || 'N/A',
        fare: t.fare || 0,
        address: t.dropoff_address || 'Destination'
      }
    ])

    const mappedIdle = idle.map((r: any) => ({
      id: `IDL-DRV-${r.rider_id?.slice(0, 4) || Math.random().toString().slice(2, 6)}`,
      rawId: r.rider_id, // Store for drill-down
      lat: r.lat,
      lng: r.lng,
      type: 'driver' as const,
      status: 'idle' as const,
      driverName: r.rider_name,
      driverPhone: r.rider_phone,
      address: 'Waiting for orders'
    }))

    return [...mappedTrips, ...mappedIdle]
  }

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const token = localStorage.getItem('vrom_session_token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/fleet/live`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setFleetData(mapBackendToFleet(data))
        }
      } catch (err) {
        console.error('Failed to fetch fleet:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFleet()
  }, [])

  // 🔌 Real-time WebSocket Data
  const { data: wsData } = useOCCWebSocket('fleet')

  useEffect(() => {
    if (wsData && typeof wsData === 'object') {
      setFleetData(mapBackendToFleet(wsData as any))
    }
  }, [wsData])

  const stats = {
    activeDrivers: fleetData.filter(d => d.type === 'driver' && d.status === 'active').length,
    idleDrivers: fleetData.filter(d => d.type === 'driver' && d.status === 'idle').length,
    pendingOrders: fleetData.filter(d => d.type === 'order').length,
    demandHotspots: fleetData.filter(d => d.type === 'demand').length,
    avgResponse: 4.8,
  }

  const handleMetricClick = (type: 'driver' | 'order' | 'demand') => {
    if (selectedMetric === type) {
      setSelectedMetric(null)
    } else {
      setSelectedMetric(type)
      setMapType(type === 'driver' ? 'fleet' : type === 'order' ? 'supply' : 'demand')
      setSelectedId(null) // Clear individual map selection
      setSelectedRiderFullId(null)
    }
  }

  return (
    <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Live Operations Map</h1>
        <p className="text-muted-foreground mt-1">Real-time driver tracking, order distribution, and hotspot analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        <Card 
          className={`p-4 glass-dark cursor-pointer transition-all hover:-translate-y-1 ${selectedMetric === 'driver' ? 'border-primary ring-1 ring-primary/50' : 'hover:bg-primary/5'}`}
          onClick={() => handleMetricClick('driver')}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Fleet Status</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-foreground">{stats.activeDrivers + stats.idleDrivers}</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                  {stats.activeDrivers} Active / {stats.idleDrivers} Idle
                </p>
              </div>
            </div>
            <Navigation className="h-5 w-5 text-primary" />
          </div>
        </Card>

        <Card 
          className={`p-4 glass-dark cursor-pointer transition-all hover:-translate-y-1 ${selectedMetric === 'order' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'hover:bg-blue-500/5'}`}
          onClick={() => handleMetricClick('order')}
        >
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-bold">Pending Orders</p><p className="text-2xl font-bold text-foreground mt-1">{stats.pendingOrders}</p></div>
            <MapPin className="h-5 w-5 text-blue-500" />
          </div>
        </Card>

        <Card 
          className={`p-4 glass-dark cursor-pointer transition-all hover:-translate-y-1 ${selectedMetric === 'demand' ? 'border-red-500 ring-1 ring-red-500/50' : 'hover:bg-red-500/5'}`}
          onClick={() => handleMetricClick('demand')}
        >
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-bold">Hotspots</p><p className="text-2xl font-bold text-foreground mt-1">{stats.demandHotspots}</p></div>
            <Activity className="h-5 w-5 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-bold">Avg ETA</p><p className="text-2xl font-bold text-foreground mt-1">{stats.avgResponse}m</p></div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
        </Card>
      </div>

      <div className="flex-1 flex gap-6 min-h-[500px] relative overflow-hidden">
        {/* Main Map Container */}
        <Card className={`flex-1 glass-dark border-border relative overflow-hidden transition-all duration-300 ${selectedMetric ? 'mr-80 md:mr-96' : ''}`}>
          {/* Layer Controls Overlaid on Map */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap">
            <div className="bg-background/80 backdrop-blur-md p-2 rounded-lg border border-border flex items-center gap-2 shadow-2xl">
              <Layers className="h-4 w-4 text-primary" />
              <Button variant={mapType === 'fleet' ? 'default' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setMapType('fleet')}>Fleet</Button>
              <Button variant={mapType === 'demand' ? 'default' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setMapType('demand')}>Demand</Button>
              <Button variant={mapType === 'supply' ? 'default' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setMapType('supply')}>Supply</Button>
            </div>
          </div>

          {/* Real Google Map Component */}
          <div className="w-full h-full relative">
            <GoogleMapView
              fleetData={fleetData}
              mapType={mapType}
              onSelect={(id) => {
                setSelectedId(id)
                const raw = fleetData.find(f => f.id === id)?.rawId
                if (raw) setSelectedRiderFullId(raw)
              }}
            />
          </div>

          {/* Legend / Info Panel Overlay */}
          <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
            <Card className="p-4 glass-dark pointer-events-auto border-primary/20 bg-background/60 backdrop-blur-xl">
              <p className="text-xs text-muted-foreground mb-3 font-bold uppercase tracking-tighter">Live Legend</p>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                  <span className="text-foreground font-medium">Active Trips</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  <span className="text-foreground font-medium">Available Riders</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                  <span className="text-foreground font-medium">Customer Orders</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]" />
                  <span className="text-foreground font-medium">High Demand Clusters</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Info Overlay for Selected Map Item (Marker click) */}
          {selectedId && !selectedMetric && (
            <div className="absolute top-4 right-4 z-10 w-72 animate-in slide-in-from-right-4 transition-all shadow-2xl">
              <Card className="p-5 glass-dark border-primary bg-primary/10 backdrop-blur-3xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Live Selection</p>
                    <h4 className="text-lg font-bold text-foreground">{selectedId}</h4>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => setSelectedId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {(() => {
                  const f = fleetData.find(f => f.id === selectedId)
                  if (!f) return null
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${f.type === 'driver' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {f.type}
                        </span>
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-green-500/20 text-green-400">
                          {f.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2 border-t border-border pt-3">
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-foreground font-medium">{f.type === 'driver' ? f.driverName : f.riderName}</p>
                            <p className="text-xs text-muted-foreground">{f.type === 'driver' ? 'Assigned Driver' : 'Customer'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-muted-foreground">{f.type === 'driver' ? f.driverPhone : f.riderPhone}</p>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5 scale-90" />
                          <p className="text-muted-foreground text-xs leading-tight">{f.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs border-t border-border pt-3">
                        <div><p className="text-muted-foreground uppercase text-[10px] mb-0.5">Latitude</p><p className="font-mono text-foreground">{f.lat.toFixed(4)}</p></div>
                        <div><p className="text-muted-foreground uppercase text-[10px] mb-0.5">Longitude</p><p className="font-mono text-foreground">{f.lng.toFixed(4)}</p></div>
                      </div>
                    </div>
                  )
                })()}

                <Button 
                  size="sm" 
                  className="w-full mt-5 bg-primary text-xs h-9"
                  onClick={() => {
                    const f = fleetData.find(f => f.id === selectedId)
                    if (f?.rawId) setSelectedRiderFullId(f.rawId)
                  }}
                >
                  View Full Profile
                </Button>
              </Card>
            </div>
          )}
        </Card>

        {/* --- Dynamic Metric Side Drawer --- */}
        {selectedMetric && (
          <div className="absolute top-0 right-0 w-80 md:w-96 h-full bg-background/95 backdrop-blur-2xl border-l border-border shadow-2xl animate-in slide-in-from-right-full transition-transform z-20 flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {selectedMetric === 'driver' && <><Navigation className="h-5 w-5 text-primary" /> Active Drivers Data</>}
                  {selectedMetric === 'order' && <><MapPin className="h-5 w-5 text-blue-500" /> Pending Orders Data</>}
                  {selectedMetric === 'demand' && <><Activity className="h-5 w-5 text-red-500" /> Hotspot Data</>}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Real-time breakdown</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMetric(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {fleetData.filter(d => d.type === selectedMetric).map((item, idx) => (
                <Card 
                  key={idx} 
                  className="p-4 glass-dark border-border/50 hover:border-primary/30 transition-colors cursor-pointer" 
                  onClick={() => {
                    setSelectedId(item.id)
                    if (item.rawId) setSelectedRiderFullId(item.rawId)
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono font-bold text-primary">{item.id}</span>
                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 rounded-full uppercase tracking-wider font-bold">Live</span>
                  </div>
                  
                  {selectedMetric === 'driver' && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground">{item.driverName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" /> {item.driverPhone}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-2"><MapPinIcon className="h-3 w-3" /> {item.address}</p>
                    </div>
                  )}

                  {selectedMetric === 'order' && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground">{item.riderName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" /> {item.riderPhone}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-2"><MapPinIcon className="h-3 w-3" /> {item.address}</p>
                      <p className="text-xs font-bold text-primary mt-1">KES {item.fare}</p>
                    </div>
                  )}

                  {selectedMetric === 'demand' && (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">High Traffic Sector</p>
                      <p className="text-xs text-muted-foreground">Pos: {item.lat.toFixed(4)}, {item.lng.toFixed(4)}</p>
                    </div>
                  )}
                </Card>
              ))}

              {fleetData.filter(d => d.type === selectedMetric).length === 0 && (
                <div className="text-center p-8 mt-10 border border-dashed border-border rounded-xl">
                  <p className="text-muted-foreground text-sm">No active data available directly matching this metric at this second.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Full Profile Drill-Down Drawer --- */}
      <RiderDetailsDrawer 
        riderId={selectedRiderFullId} 
        onClose={() => setSelectedRiderFullId(null)} 
      />

    </div>
  )
}

