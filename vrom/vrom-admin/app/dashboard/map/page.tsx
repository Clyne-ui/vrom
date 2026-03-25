'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, MapPin, TrendingUp, Navigation, Activity } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'
import { GoogleMapView } from '@/components/dashboard/map/google-map-view'

interface FleetLocation {
  id: string
  lat: number
  lng: number
  type: 'driver' | 'order' | 'demand'
  status: 'active' | 'idle' | 'offline'
}

export default function MapPage() {
  const [fleetData, setFleetData] = useState<FleetLocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapType, setMapType] = useState<'fleet' | 'demand' | 'supply'>('fleet')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const fetchFleet = async () => {
      try {
        const token = localStorage.getItem('vrom_session_token')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/fleet/live`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          const mapped: FleetLocation[] = data.active_trips.flatMap((t: any) => [
            { 
              id: `TRP-${t.trip_id.slice(0, 4)}`, 
              lat: t.p_lat || -1.2863, 
              lng: t.p_lng || 36.8172, 
              type: 'driver' as const, 
              status: 'active' as const 
            },
            { 
              id: `ORD-${t.trip_id.slice(0, 4)}`, 
              lat: t.d_lat || -1.2954, 
              lng: t.d_lng || 36.8225, 
              type: 'order' as const, 
              status: 'active' as const 
            }
          ])
          setFleetData(mapped)
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
    if (wsData && Array.isArray(wsData)) {
      console.log('WS: Received fleet update:', wsData)
      const mapped: FleetLocation[] = wsData.flatMap((t: any) => [
        { 
          id: `TRP-${t.trip_id.slice(0, 4)}`, 
          lat: t.p_lat || -1.2863, 
          lng: t.p_lng || 36.8172, 
          type: 'driver' as const, 
          status: 'active' as const 
        },
        { 
          id: `ORD-${t.trip_id.slice(0, 4)}`, 
          lat: t.d_lat || -1.2954, 
          lng: t.d_lng || 36.8225, 
          type: 'order' as const, 
          status: 'active' as const 
        }
      ])
      setFleetData(mapped)
    }
  }, [wsData])

  const stats = {
    activeDrivers: fleetData.filter(d => d.type === 'driver' && d.status === 'active').length,
    pendingOrders: fleetData.filter(d => d.type === 'order').length,
    demandHotspots: fleetData.filter(d => d.type === 'demand').length,
    avgResponse: 4.8,
  }

  return (
    <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Live Operations Map</h1>
        <p className="text-muted-foreground mt-1">Real-time driver tracking, order distribution, and hotspot analytics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-bold">Active Drivers</p><p className="text-2xl font-bold text-foreground mt-1">{stats.activeDrivers}</p></div>
            <Navigation className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground uppercase font-bold">Pending Orders</p><p className="text-2xl font-bold text-foreground mt-1">{stats.pendingOrders}</p></div>
            <MapPin className="h-5 w-5 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4 glass-dark">
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

      {/* Main Map Container */}
      <Card className="flex-1 min-h-[500px] glass-dark border-border relative overflow-hidden">
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
            onSelect={setSelectedId}
          />
        </div>

        {/* Legend / Info Panel Overlay */}
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
          <Card className="p-4 glass-dark pointer-events-auto border-primary/20 bg-background/60 backdrop-blur-xl">
            <p className="text-xs text-muted-foreground mb-3 font-bold uppercase tracking-tighter">Live Legend</p>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                <span className="text-foreground font-medium">Active Drivers</span>
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

        {/* Detailed Info Overlay for Selected Item */}
        {selectedId && (
          <div className="absolute top-4 right-4 z-10 w-64 animate-in slide-in-from-right-4 transition-all">
            <Card className="p-4 glass-dark border-primary bg-primary/5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-muted-foreground font-bold uppercase">Selection Details</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}>×</Button>
              </div>
              <h4 className="text-lg font-bold text-foreground">{selectedId}</h4>
              <p className="text-xs text-primary font-bold uppercase tracking-widest">{fleetData.find(f => f.id === selectedId)?.type}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-border pt-3">
                <div><p className="text-muted-foreground uppercase text-[10px]">Lat</p><p className="font-mono">{fleetData.find(f => f.id === selectedId)?.lat.toFixed(4)}</p></div>
                <div><p className="text-muted-foreground uppercase text-[10px]">Lng</p><p className="font-mono">{fleetData.find(f => f.id === selectedId)?.lng.toFixed(4)}</p></div>
              </div>

              <Button size="sm" className="w-full mt-4 bg-primary text-xs h-8">View Detailed Profile</Button>
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}
