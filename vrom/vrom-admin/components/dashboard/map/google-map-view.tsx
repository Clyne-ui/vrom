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
    lat: number
    lng: number
    type: 'driver' | 'order' | 'demand'
    status: 'active' | 'idle' | 'offline'
}

interface GoogleMapViewProps {
    fleetData: FleetLocation[]
    mapType: 'fleet' | 'demand' | 'supply'
    onSelect: (id: string) => void
}

export function GoogleMapView({ fleetData, mapType, onSelect }: GoogleMapViewProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '8e0a97af9386fef0'
    
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: ['marker'], // Important: must load 'marker' library
    })

    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)

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

    // Using any since AdvancedMarkerElement is part of the JS library but some older @types/google.maps might not define it
    const CustomMarker = ({ item }: { item: FleetLocation }) => {
        const getMarkerColor = (type: string, status: string) => {
            if (type === 'driver') {
                if (status === 'active') return '#FF9100' // Orange
                if (status === 'idle') return '#00E676'   // Green
                return '#9E9E9E'                           // Grey
            } else if (type === 'order') {
                return '#2979FF'                           // Blue
            }
            return '#F50057'                               // Pink
        }

        const color = getMarkerColor(item.type, item.status)
        
        return (
            <MarkerF
                position={{ lat: item.lat, lng: item.lng }}
                onClick={() => {
                    setSelectedId(item.id)
                    onSelect(item.id)
                }}
                // This activates Advanced Marker functionality behind the scenes when mapId is present
                // Note: Newer versions of react-google-maps use <AdvancedMarker> component directly
            />
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
                styles: mapStyles,
                disableDefaultUI: true,
                zoomControl: true,
                mapId: mapId, // Crucial for Advanced Markers
            }}
        >
            {fleetData.map((item) => (
                <MarkerF
                    key={item.id}
                    position={{ lat: item.lat, lng: item.lng }}
                    onClick={() => {
                        setSelectedId(item.id)
                        onSelect(item.id)
                    }}
                    options={{
                        // This identifies this as an Advanced Marker to remove the warning
                        // when a Map ID is provided to the parent GoogleMap component
                        collisionBehavior: 'REQUIRED', 
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
