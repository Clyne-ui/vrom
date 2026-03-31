'use client'

import { useEffect, useState } from 'react'
import { X, User, Phone, Mail, Bike, FileText, CheckCircle, Clock, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface RiderDocument {
  document_type: string
  image_url: string
  verification_status: string
}

interface TripSummary {
  trip_id: string
  status: string
  fare: number
  pickup_address: string
  dropoff_address: string
  created_at: string
}

interface RiderFullDetail {
  user_id: string
  full_name: string
  email: string
  phone_number: string
  vehicle_type: string
  plate_number: string
  status: string
  is_available: boolean
  last_lat: number
  last_lng: number
  documents: RiderDocument[]
  current_trip?: TripSummary
}

interface RiderDetailsDrawerProps {
  riderId: string | null
  onClose: () => void
}

export function RiderDetailsDrawer({ riderId, onClose }: RiderDetailsDrawerProps) {
  const [rider, setRider] = useState<RiderFullDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!riderId) {
      setRider(null)
      return
    }

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('vrom_session_token')
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/fleet/rider?id=${riderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error('Failed to fetch rider details')
        const data = await res.json()
        setRider(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [riderId])

  if (!riderId) return null

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-sidebar border-l border-sidebar-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${riderId ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between bg-sidebar-accent/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sidebar-foreground">Rider Dossier</h3>
              <p className="text-[10px] text-sidebar-accent-foreground font-mono">ID: {riderId.slice(0, 18)}...</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center space-y-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest animate-pulse">Decrypting Rider Data...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-destructive/5 m-4 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : rider ? (
            <div className="p-6 space-y-8">
              {/* Profile Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Identity</h4>
                  <Badge variant={rider.status === 'online' ? 'default' : 'secondary'} className={rider.status === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}>
                    {rider.status}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{rider.full_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{rider.phone_number}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{rider.email}</span>
                  </div>
                </div>
              </section>

              <Separator className="opacity-20" />

              {/* Vehicle Section */}
              <section className="space-y-4">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Logistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-sidebar-accent/30 rounded-lg border border-sidebar-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Bike className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Vehicle</span>
                    </div>
                    <p className="text-sm font-bold uppercase">{rider.vehicle_type}</p>
                  </div>
                  <div className="p-3 bg-sidebar-accent/30 rounded-lg border border-sidebar-border">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground">Plate No.</span>
                    </div>
                    <p className="text-sm font-bold uppercase">{rider.plate_number}</p>
                  </div>
                </div>
              </section>

              <Separator className="opacity-20" />

              {/* Mission History Section */}
              <section className="space-y-4">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Latest Mission</h4>
                {rider.current_trip ? (
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary text-primary-foreground text-[10px] uppercase">{rider.current_trip.status}</Badge>
                      <span className="text-xs font-bold text-primary font-mono">KES {rider.current_trip.fare}</span>
                    </div>
                    <div className="space-y-4 relative pl-4 border-l-2 border-dotted border-primary/30">
                      <div>
                        <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary" />
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-tighter">Pickup</p>
                        <p className="text-xs font-medium line-clamp-1">{rider.current_trip.pickup_address}</p>
                      </div>
                      <div>
                        <div className="absolute -left-[5px] bottom-0 h-2 w-2 rounded-full bg-orange-500" />
                        <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-tighter">Dropoff</p>
                        <p className="text-xs font-medium line-clamp-1">{rider.current_trip.dropoff_address}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed border-sidebar-border rounded-xl">
                    <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">No Active Mission</p>
                  </div>
                )}
              </section>

              <Separator className="opacity-20" />

              {/* Documents Section */}
              <section className="space-y-4">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Verification Dossier</h4>
                <div className="space-y-2">
                  {rider.documents?.length > 0 ? (
                    rider.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-sidebar-accent transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-black/20 rounded flex items-center justify-center cursor-pointer hover:bg-black/40 overflow-hidden">
                            {doc.image_url ? (
                              <img src={doc.image_url} alt={doc.document_type} className="h-full w-full object-cover" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs">{doc.document_type}</span>
                        </div>
                        {doc.verification_status === 'verified' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-orange-400" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No documentation uploaded.</p>
                  )}
                </div>
              </section>

              {/* Action Section */}
              <section className="pt-4 space-y-2">
                <Button className="w-full h-10 uppercase tracking-widest text-xs font-bold" variant="default">
                  Contact Rider
                </Button>
                <Button className="w-full h-10 uppercase tracking-widest text-xs font-bold" variant="outline">
                  Suspension Protocol
                </Button>
              </section>
            </div>
          ) : null}
        </ScrollArea>
      </div>
    </div>
  )
}
