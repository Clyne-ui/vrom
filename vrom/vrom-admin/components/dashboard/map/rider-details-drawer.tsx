'use client'

import { useEffect, useState } from 'react'
import { X, User, Phone, Mail, Bike, FileText, CheckCircle, Clock, MapPin, Navigation, ShieldCheck, Globe, Eye, MoreHorizontal, ChevronDown, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  customer_name?: string
  customer_phone?: string
  created_at: string
}

interface RiderFullDetail {
  user_id: string
  full_name: string
  email: string
  phone_number: string
  vehicle_type: string
  plate_number: string
  vehicle_photo_url: string
  assigned_region: string
  status: string
  is_available: boolean
  last_lat: number
  last_lng: number
  documents: RiderDocument[]
  current_trip?: TripSummary
}

interface Region {
  id: string
  name: string
}

interface RiderDetailsDrawerProps {
  riderId: string | null
  onClose: () => void
}

export function RiderDetailsDrawer({ riderId, onClose }: RiderDetailsDrawerProps) {
  const [rider, setRider] = useState<RiderFullDetail | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const token = localStorage.getItem('vrom_session_token')
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/regions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setRegions(data)
        }
      } catch (err) {}
    }
    fetchRegions()
  }, [])

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
        if (data.assigned_region) {
          setSelectedRegion(data.assigned_region)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [riderId])

  const handleApprove = async () => {
    if (!rider) return
    if (!selectedRegion) {
        toast.error("MISSION CRITICAL: Region assignment is required for approval.")
        return
    }

    setApproving(true)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/riders/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            user_id: rider.user_id,
            region: selectedRegion
        })
      })

      if (!res.ok) throw new Error('Approval failed')
      
      toast.success(`Rider ${rider.full_name} Authorized and Assigned to ${selectedRegion}!`)
      // Refresh data
      const updatedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/fleet/rider?id=${riderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const updatedData = await updatedRes.json()
      setRider(updatedData)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setApproving(false)
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] gap-6 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <div className="text-center">
            <p className="text-lg font-bold uppercase tracking-[0.2em] text-primary">Establishing Secure Link...</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">Accessing encrypted rider repository</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] gap-6 p-8 text-center bg-destructive/5">
          <div className="h-20 w-20 rounded-3xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-inner mx-auto mb-4">
            <ShieldCheck className="h-10 w-10 text-destructive rotate-180" />
          </div>
          <div className="max-w-md mx-auto">
            <p className="text-xl font-black uppercase tracking-[0.2em] text-destructive">Signal Lost / Access Denied</p>
            <p className="text-sm text-muted-foreground mt-3 font-medium bg-black/20 p-4 rounded-xl border border-destructive/10">{error}</p>
            <Button 
                variant="outline" 
                className="mt-8 border-sidebar-border hover:bg-primary/10 transition-all rounded-xl h-12 px-8 uppercase font-bold tracking-widest text-xs"
                onClick={() => window.location.reload()}
            >
                Re-establish Secure Uplink
            </Button>
          </div>
        </div>
      )
    }

    if (!rider) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] gap-6 p-8 text-center opacity-60">
          <div className="h-20 w-20 rounded-3xl bg-sidebar-accent/50 flex items-center justify-center border border-sidebar-border shadow-inner mx-auto">
            <Eye className="h-10 w-10 text-muted-foreground opacity-20" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold uppercase tracking-[0.2em] text-muted-foreground">Entity Not Found in Current Sector</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono">The requested UUID does not resolve to an active or pending unit.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Mission History & Location */}
        <div className="lg:col-span-4 space-y-8">
          {/* Identity Card */}
          <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Operational Status</h4>
              <Badge variant={rider.status === 'online' ? 'default' : 'secondary'} className={rider.status === 'online' ? 'bg-green-500/20 text-green-400 border-green-500/30 font-black' : 'font-black uppercase'}>
                {rider.status.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Full Name</span>
                <p className="text-xl font-bold tracking-tight">{rider.full_name}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{rider.phone_number}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium truncate">{rider.email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Region: <span className="text-primary uppercase font-bold">{rider.assigned_region || 'Unassigned'}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Mission */}
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground ml-2">Live Mission Log</h4>
            {rider.current_trip ? (
              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold px-3 py-1">MISSION: {rider.current_trip.status}</Badge>
                  <span className="text-lg font-black text-primary font-mono tracking-tighter">KES {rider.current_trip.fare}</span>
                </div>
                
                {/* Customer Info */}
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Target Customer</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                          <p className="text-sm font-bold">{rider.current_trip.customer_name || 'Anonymous'}</p>
                          <p className="text-[10px] text-muted-foreground">{rider.current_trip.customer_phone || 'Private'}</p>
                      </div>
                    </div>
                </div>

                <div className="space-y-6 relative pl-6 border-l-2 border-dotted border-primary/30">
                  <div>
                    <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold opacity-60">Source Vector</p>
                    <p className="text-xs font-semibold leading-relaxed line-clamp-1">{rider.current_trip.pickup_address}</p>
                  </div>
                  <div>
                    <div className="absolute -left-[5px] bottom-0 h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold opacity-60">Destination Vector</p>
                    <p className="text-xs font-semibold leading-relaxed line-clamp-1">{rider.current_trip.dropoff_address}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center border-2 border-dashed border-sidebar-border rounded-3xl bg-black/10">
                <Clock className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Awaiting Mission Deployment</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Onboarding & Documents */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Logistics Intelligence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Fleet Category</p>
                <h5 className="text-xl font-black uppercase italic tracking-tighter text-primary">{rider.vehicle_type}</h5>
              </div>
              <Bike className="h-10 w-10 text-primary opacity-20" />
            </div>
            <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Plate Registry</p>
                <h5 className="text-xl font-black uppercase tracking-widest text-primary">{rider.plate_number}</h5>
              </div>
              <FileText className="h-10 w-10 text-primary opacity-20" />
            </div>
          </div>

          {/* Region Assignment Section */}
          <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Admin Authority: Region Allocation</h4>
                {rider.assigned_region && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Assigned</Badge>}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full h-12 flex items-center justify-between px-4 bg-black/20 border-sidebar-border rounded-xl group transition-all hover:border-primary/50">
                      <div className="flex items-center gap-3">
                          <Map className="h-4 w-4 text-primary" />
                          <span className={selectedRegion ? "font-bold text-foreground" : "text-muted-foreground"}>
                            {selectedRegion || "Select Deployment Region..."}
                          </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] bg-sidebar border-sidebar-border rounded-xl shadow-2xl">
                    {regions.map((region) => (
                      <DropdownMenuItem 
                        key={region.id} 
                        onClick={() => setSelectedRegion(region.name)}
                        className="h-10 cursor-pointer focus:bg-primary/10"
                      >
                          {region.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-[10px] text-muted-foreground italic pl-1">Assigning a region allows the rider to receive trip requests within that specific geographical zone.</p>
          </div>

          {/* Evidence / Onboarding Photos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-2">
              <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Verification Dossier (Onboarding Intelligence)</h4>
              <span className="text-[10px] text-primary font-mono">{rider.documents.length + (rider.vehicle_photo_url ? 1 : 0)} Evidence Found</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Vehicle Photo (Special Handling) */}
              {rider.vehicle_photo_url && (
                <div className="group relative aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black/40">
                  <img src={rider.vehicle_photo_url} alt="Vehicle Evidence" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                      <Badge className="w-fit mb-2 bg-primary">Vehicle Photo</Badge>
                      <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Primary Logistics Asset</p>
                  </div>
                </div>
              )}

              {rider.documents.map((doc, i) => (
                <div key={i} className="group relative aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black/40">
                    {doc.image_url ? (
                      <img src={doc.image_url} alt={doc.document_type} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                      <div className="flex items-center justify-between">
                          <Badge variant={doc.verification_status === 'approved' ? 'default' : 'secondary'} className="mb-2 uppercase text-[10px]">
                            {doc.document_type}
                          </Badge>
                          {doc.verification_status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500 mb-2" />}
                      </div>
                      <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">
                          Status: <span className={doc.verification_status === 'approved' ? 'text-green-400' : 'text-orange-400'}>{doc.verification_status.toUpperCase()}</span>
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-md rounded-xl">
                      <Eye className="h-4 w-4" />
                    </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Final Authorization Actions */}
          <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {rider.status === 'pending' || !rider.is_available ? (
              <Button 
                onClick={handleApprove}
                disabled={approving}
                className="h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(var(--primary),0.3)] transition-all active:scale-95 flex items-center gap-3"
              >
                {approving ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
                Authorize Rider Profile
              </Button>
            ) : (
              <Button variant="outline" className="h-16 rounded-2xl border-primary/20 text-primary uppercase font-bold tracking-widest cursor-default hover:bg-transparent flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6" />
                  Rider Profile Verified
              </Button>
            )}
            <Button variant="outline" className="h-16 rounded-2xl border-sidebar-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-sm font-bold uppercase tracking-widest opacity-60 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 opacity-40 rotate-180" />
              Execute Suspension Protocol
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!riderId) return null

  return (
    <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-sidebar border border-sidebar-border shadow-2xl rounded-3xl w-full max-w-5xl h-full flex flex-col overflow-hidden relative border-primary/20">
        
        {/* Header - Industrial Style */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between bg-sidebar-accent/30">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-sidebar-foreground tracking-tighter uppercase italic">Rider Profile Intelligence</h2>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px] tracking-widest font-bold">
                  Classified
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono opacity-60">UUID: {riderId}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-12 w-12 hover:bg-destructive/10 hover:text-destructive transition-all border border-transparent hover:border-destructive/20 text-muted-foreground hover:text-destructive">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {renderContent()}
        </ScrollArea>
      </div>
    </div>
  )
}
