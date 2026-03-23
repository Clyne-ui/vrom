'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, MapPin, TrendingUp, Navigation, Activity } from 'lucide-react'

interface FleetLocation {
  id: string
  lat: number
  lng: number
  type: 'driver' | 'order' | 'demand'
  status: 'active' | 'idle' | 'offline'
}

export default function MapPage() {
  const [fleetData, setFleetData] = useState<FleetLocation[]>([
    { id: 'd1', lat: 28.7041, lng: 77.1025, type: 'driver', status: 'active' },
    { id: 'd2', lat: 28.6139, lng: 77.2090, type: 'driver', status: 'active' },
    { id: 'd3', lat: 28.5355, lng: 77.3910, type: 'driver', status: 'idle' },
    { id: 'o1', lat: 28.6200, lng: 77.2400, type: 'order', status: 'active' },
    { id: 'o2', lat: 28.5500, lng: 77.1800, type: 'order', status: 'active' },
    { id: 'h1', lat: 28.7200, lng: 77.0800, type: 'demand', status: 'active' },
    { id: 'h2', lat: 28.5200, lng: 77.2900, type: 'demand', status: 'active' },
  ])

  const [mapType, setMapType] = useState<'fleet' | 'demand' | 'supply'>('fleet')
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  // Simulate real-time location updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFleetData(prev =>
        prev.map(item => {
          if (item.type === 'driver' && item.status === 'active') {
            return {
              ...item,
              lat: item.lat + (Math.random() - 0.5) * 0.01,
              lng: item.lng + (Math.random() - 0.5) * 0.01,
            }
          }
          return item
        })
      )
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    activeDrivers: fleetData.filter(d => d.type === 'driver' && d.status === 'active').length,
    pendingOrders: fleetData.filter(d => d.type === 'order').length,
    demandHotspots: fleetData.filter(d => d.type === 'demand').length,
    avgResponse: 3.2,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Live Map</h1>
        <p className="text-muted-foreground mt-1">
          Real-time fleet distribution, demand heatmaps, and supply analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Drivers</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.activeDrivers}
              </p>
            </div>
            <Navigation className="h-5 w-5 text-primary" />
          </div>
        </Card>

        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.pendingOrders}
              </p>
            </div>
            <MapPin className="h-5 w-5 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Demand Hotspots</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.demandHotspots}
              </p>
            </div>
            <Activity className="h-5 w-5 text-red-500" />
          </div>
        </Card>

        <Card className="p-4 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stats.avgResponse.toFixed(1)}m
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Main Map Area */}
      <Card className="p-6 glass-dark min-h-screen relative">
        <div className="absolute top-6 left-6 right-6 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="h-5 w-5 text-primary" />
            <Button
              variant={mapType === 'fleet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapType('fleet')}
            >
              Fleet View
            </Button>
            <Button
              variant={mapType === 'demand' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapType('demand')}
            >
              Demand Heatmap
            </Button>
            <Button
              variant={mapType === 'supply' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMapType('supply')}
            >
              Supply Analysis
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-screen max-h-screen rounded-lg bg-gradient-to-b from-primary/5 to-background border border-border overflow-hidden relative">
          {/* SVG Map Visualization */}
          <svg className="w-full h-full" viewBox="0 0 1000 600">
            {/* Grid Background */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
              </pattern>

              {/* Heatmap Gradient */}
              <radialGradient id="heatmap1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF8C42" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#FF8C42" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF8C42" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="heatmap2">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background */}
            <rect width="1000" height="600" fill="currentColor" opacity="0.02" />
            <rect width="1000" height="600" fill="url(#grid)" />

            {/* Heatmap Overlays */}
            {mapType === 'demand' && (
              <>
                <circle cx="280" cy="210" r="150" fill="url(#heatmap1)" />
                <circle cx="700" cy="350" r="120" fill="url(#heatmap1)" />
                <circle cx="450" cy="450" r="100" fill="url(#heatmap2)" />
              </>
            )}

            {/* Fleet Markers */}
            {fleetData.map((location) => {
              const scale = 150
              const x = 100 + (location.lng - 77) * scale
              const y = 100 + (location.lat - 28) * scale * 1.2

              if (location.type === 'driver') {
                return (
                  <g key={location.id} opacity="0.8">
                    {location.status === 'active' && (
                      <circle
                        cx={x}
                        cy={y}
                        r="20"
                        fill="#FF8C42"
                        opacity="0.2"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={location.status === 'active' ? '#FF8C42' : '#6B7280'}
                      onClick={() => setSelectedRegion(location.id)}
                      className="cursor-pointer hover:r-10 transition-all"
                    />
                    <text
                      x={x}
                      y={y - 15}
                      fontSize="10"
                      fill="currentColor"
                      textAnchor="middle"
                      className="text-muted-foreground opacity-60"
                    >
                      {location.id}
                    </text>
                  </g>
                )
              } else if (location.type === 'order') {
                return (
                  <g key={location.id}>
                    <rect
                      x={x - 6}
                      y={y - 6}
                      width="12"
                      height="12"
                      fill="#3B82F6"
                      rx="2"
                      onClick={() => setSelectedRegion(location.id)}
                      className="cursor-pointer hover:opacity-80"
                    />
                  </g>
                )
              } else {
                return (
                  <g key={location.id}>
                    <polygon
                      points={`${x},${y - 8} ${x + 8},${y + 8} ${x - 8},${y + 8}`}
                      fill="#EC4899"
                      opacity="0.6"
                    />
                  </g>
                )
              }
            })}
          </svg>

          {/* Info Panel */}
          <div className="absolute bottom-6 left-6 right-6 flex gap-4">
            <Card className="p-4 glass-dark flex-1 max-w-sm">
              <p className="text-xs text-muted-foreground mb-2">Selected Region</p>
              <p className="font-semibold text-foreground">
                {selectedRegion ? `${selectedRegion}` : 'Click on a marker'}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-semibold text-foreground">2.4 km</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ETA</p>
                  <p className="font-semibold text-foreground">8 mins</p>
                </div>
              </div>
            </Card>

            {/* Legend */}
            <Card className="p-4 glass-dark">
              <p className="text-xs text-muted-foreground mb-3 font-semibold">Legend</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-foreground">Active Drivers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-blue-500" />
                  <span className="text-foreground">Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-pink-500" />
                  <span className="text-foreground">Demand Zones</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  )
}
