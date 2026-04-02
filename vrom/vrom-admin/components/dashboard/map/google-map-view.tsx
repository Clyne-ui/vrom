'use client'

import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import { useState, useCallback } from 'react'

const containerStyle = {
    width: '100%',
    height: '100%',
}

const center = {
    lat: -1.2921, // Nairobi
    lng: 36.8219,
}

interface FleetLocation {
    id: string
    rawId?: string
    lat: number
    lng: number
    type: 'driver' | 'order' | 'demand'
    status: 'active' | 'idle' | 'offline'
    vehicleType?: string
    driverName?: string
    driverPhone?: string
    riderName?: string
    riderPhone?: string
    fare?: number
    address?: string
}

interface GoogleMapViewProps {
    fleetData: FleetLocation[]
    mapType: 'fleet' | 'demand' | 'supply'
    onSelect: (id: string) => void
}

const LIBRARIES: ("marker" | "drawing" | "geometry" | "localContext" | "places" | "visualization")[] = ['marker']

export function GoogleMapView({ fleetData, mapType, onSelect }: GoogleMapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '8e0a97af9386fef0'
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES, // Use static constant to prevent re-downloads
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Returns the right icon config based on vehicle type and trip status
  const getMarkerIcon = (item: FleetLocation): google.maps.Icon => {
    const isOrder = item.type === 'order'
    const isCar = item.vehicleType === 'car' || item.vehicleType === 'taxi'
    
    if (isOrder) {
      // Destination pin — blue dot
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#1d4ed8',
        strokeWeight: 2,
      } as any
    }

    if (item.status === 'active') {
      // Active rider on a trip — orange tint vehicle icon
      return {
        url: isCar ? '/car.svg' : '/motorcycle.svg',
        scaledSize: new google.maps.Size(isCar ? 64 : 48, isCar ? 128 : 96),
        anchor: new google.maps.Point(isCar ? 32 : 24, isCar ? 64 : 48),
      }
    }

    // Idle rider — vehicle icon
    return {
      url: isCar ? '/car.svg' : '/motorcycle.svg',
      scaledSize: new google.maps.Size(isCar ? 48 : 36, isCar ? 96 : 72),
      anchor: new google.maps.Point(isCar ? 24 : 18, isCar ? 48 : 36),
    }
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-destructive/10 border-2 border-destructive/30 rounded-xl p-8 text-center">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-destructive mb-2 uppercase tracking-tighter">Google Maps API Key Missing</h3>
          <p className="text-sm text-muted-foreground mb-4">Please add your API key to the .env file as:</p>
          <code className="bg-destructive/20 px-3 py-1.5 rounded text-destructive font-mono text-xs block mb-4">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY</code>
          <p className="text-xs text-muted-foreground">Once added, restart your development server to enable the live fleet tracking system.</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-destructive/10 p-8 text-center">
        <div className="max-w-md">
          <h3 className="text-xl font-bold text-destructive mb-2">Google Maps Error</h3>
          <p className="text-sm text-muted-foreground mb-4">{loadError.message}</p>
          <p className="text-xs text-muted-foreground">Ensure "Maps JavaScript API" is enabled in your Google Cloud Console for this project.</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20 animate-pulse text-muted-foreground uppercase tracking-widest text-sm font-bold">
        Initializing Premium Map System...
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        // styles: mapStyles, // REMOVED: Styles are controlled via Cloud Map ID now
        disableDefaultUI: true,
        zoomControl: true,
        mapId: mapId, // High Performance Advanced Markers
      }}
    >
      {fleetData.map((item) => (
        <MarkerF
          key={item.id}
          position={{ lat: item.lat, lng: item.lng }}
          icon={getMarkerIcon(item)}
          title={item.type === 'driver' ? item.driverName : item.riderName}
          onClick={() => {
            setSelectedId(item.id)
            onSelect(item.id)
          }}
        />
      ))}

            {selectedId && (
                <InfoWindowF
                    position={fleetData.find(f => f.id === selectedId) ? {
                        lat: fleetData.find(f => f.id === selectedId)!.lat,
                        lng: fleetData.find(f => f.id === selectedId)!.lng
                    } : undefined}
                    onCloseClick={() => setSelectedId(null)}
                >
                    <div className="p-2 min-w-[120px]">
                        <p className="font-bold text-black border-b mb-2 pb-1 text-xs uppercase tracking-tighter">Live Fleet Intel</p>
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] text-gray-500 font-mono">{selectedId.slice(0, 18)}...</p>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${fleetData.find(f => f.id === selectedId)?.status === 'active' ? 'bg-orange-500' : 'bg-green-500'}`} />
                                <span className="text-xs font-bold text-black capitalize">{fleetData.find(f => f.id === selectedId)?.status}</span>
                            </div>
                        </div>
                    </div>
                </InfoWindowF>
            )}
        </GoogleMap>
    )
}

const mapStyles = [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
    { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
    { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
    { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
]
