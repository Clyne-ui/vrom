'use client'

import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, DirectionsService, DirectionsRenderer } from '@react-google-maps/api'
import { useState, useCallback, useEffect, useRef } from 'react'

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
    tripId?: string
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

const LIBRARIES: ("marker" | "drawing" | "geometry" | "localContext" | "places" | "visualization")[] = ['marker', 'geometry']

/**
 * Animated Marker Component
 * Handles smooth interpolation of marker movement
 */
function AnimatedMarker({ item, onClick }: { item: FleetLocation, onClick: () => void }) {
    const [currentPos, setCurrentPos] = useState({ lat: item.lat, lng: item.lng })
    const prevPosRef = useRef({ lat: item.lat, lng: item.lng })
    const animationRef = useRef<number | null>(null)

    useEffect(() => {
        const startPos = prevPosRef.current
        const targetPos = { lat: item.lat, lng: item.lng }
        
        // Only animate if position actually changed
        if (startPos.lat === targetPos.lat && startPos.lng === targetPos.lng) return

        let start: number | null = null
        const duration = 1500 // 1.5 seconds smooth glide

        const animate = (timestamp: number) => {
            if (!start) start = timestamp
            const progress = Math.min((timestamp - start) / duration, 1)
            
            const lat = startPos.lat + (targetPos.lat - startPos.lat) * progress
            const lng = startPos.lng + (targetPos.lng - startPos.lng) * progress
            
            setCurrentPos({ lat, lng })

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                prevPosRef.current = targetPos
            }
        }

        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [item.lat, item.lng])

    // Returns the right icon config based on vehicle type and trip status
    const getMarkerIcon = (): google.maps.Icon => {
        const isOrder = item.type === 'order'
        const isCar = item.vehicleType === 'car' || item.vehicleType === 'taxi'
        
        if (isOrder) {
            return {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            } as any
        }

        // Active rider on a trip — premium car icon
        const iconSize = item.status === 'active' ? 42 : 32
        return {
            url: isCar ? '/car.svg' : '/motorcycle.svg',
            scaledSize: new google.maps.Size(iconSize, iconSize),
            anchor: new google.maps.Point(iconSize / 2, iconSize / 2),
        }
    }

    return (
        <MarkerF
            position={currentPos}
            icon={getMarkerIcon()}
            title={item.type === 'driver' ? item.driverName : item.riderName}
            onClick={onClick}
        />
    )
}

export function GoogleMapView({ fleetData, mapType, onSelect }: GoogleMapViewProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '8e0a97af9386fef0'
    
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: LIBRARIES,
    })

    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)

    // Handle Route Calculation for selected active trip
    useEffect(() => {
        if (!isLoaded || !selectedId) {
            setDirections(null)
            return
        }

        const selectedItem = fleetData.find(f => f.id === selectedId)
        if (!selectedItem || !selectedItem.tripId) {
            setDirections(null)
            return
        }

        // Find the pair (Driver <-> Order)
        const pair = fleetData.find(f => f.tripId === selectedItem.tripId && f.id !== selectedId)
        if (!pair) return

        const origin = selectedItem.type === 'driver' ? selectedItem : pair
        const destination = selectedItem.type === 'order' ? selectedItem : pair

        const directionsService = new google.maps.DirectionsService()
        directionsService.route(
            {
                origin: { lat: origin.lat, lng: origin.lng },
                destination: { lat: destination.lat, lng: destination.lng },
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    setDirections(result)
                } else {
                    console.error(`Directions request failed due to ${status}`)
                }
            }
        )
    }, [selectedId, fleetData, isLoaded])

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
                    <p className="text-sm text-muted-foreground mb-4">Please add your API key to the .env file.</p>
                </div>
            </div>
        )
    }

    if (loadError) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-destructive/10 p-8 text-center">
                <h3 className="text-xl font-bold text-destructive">Google Maps Error</h3>
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
            zoom={13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
                mapId: mapId,
                styles: premiumDarkStyles, // Fallback if Map ID fails
            }}
        >
            {/* Render Directions Line */}
            {directions && (
                <DirectionsRenderer
                    directions={directions}
                    options={{
                        suppressMarkers: true, // We use our own animated markers
                        polylineOptions: {
                            strokeColor: '#FF8C42', // Vrom Orange
                            strokeWeight: 5,
                            strokeOpacity: 0.8,
                        }
                    }}
                />
            )}

            {/* Render Animated Fleet Markers */}
            {fleetData.map((item) => (
                <AnimatedMarker
                    key={item.id}
                    item={item}
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
                    onCloseClick={() => {
                        setSelectedId(null)
                        setDirections(null)
                    }}
                >
                    <div className="p-2 min-w-[140px]">
                        <p className="font-bold text-black border-b mb-2 pb-1 text-[10px] uppercase tracking-tighter">Live Fleet Intel</p>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${fleetData.find(f => f.id === selectedId)?.status === 'active' ? 'bg-orange-500' : 'bg-green-500'}`} />
                                <span className="text-xs font-bold text-black capitalize">{fleetData.find(f => f.id === selectedId)?.status}</span>
                            </div>
                            <p className="text-[9px] text-gray-500 font-mono mt-1">ID: {selectedId}</p>
                        </div>
                    </div>
                </InfoWindowF>
            )}
        </GoogleMap>
    )
}

// High-End "Uber-style" Dark Theme
const premiumDarkStyles = [
    { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
    { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
    { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
    { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{ "color": "#334e87" }] },
    { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#023e58" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#6f9ba5" }] },
    { "featureType": "poi", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
    { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#2c6675" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#255761" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#b0d5ce" }] },
    { "featureType": "road.highway", "elementType": "labels.text.stroke", "stylers": [{ "color": "#023e58" }] },
    { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
    { "featureType": "transit", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1d2c4d" }] },
    { "featureType": "transit.line", "elementType": "geometry.fill", "stylers": [{ "color": "#283d6a" }] },
    { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#3a4762" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#4e6d70" }] }
]

