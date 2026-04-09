'use client'

import { useState, useEffect } from 'react'
import { Store, Search, Filter, Eye, Phone, MapPin, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ShopDetailsDrawer } from '@/components/dashboard/shops/shop-details-drawer'

interface AdminShopView {
  shop_id: string
  seller_id: string
  owner_name: string
  owner_email: string
  shop_name: string
  shop_address: string
  lat: number
  lng: number
  product_count: number
}

export default function ShopsPage() {
  const [shops, setShops] = useState<AdminShopView[]>([])
  const [filteredShops, setFilteredShops] = useState<AdminShopView[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)

  const fetchShops = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/shops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch shops')
      const data = await res.json()
      setShops(data || [])
      setFilteredShops(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Error communicating with OCC')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShops()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      setFilteredShops(shops.filter(s => 
        s.shop_name.toLowerCase().includes(lowerSearch) || 
        s.owner_name.toLowerCase().includes(lowerSearch) || 
        s.owner_email.toLowerCase().includes(lowerSearch)
      ))
    } else {
      setFilteredShops(shops)
    }
  }, [searchTerm, shops])

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sidebar-border pb-6 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-sidebar-foreground">Shops Directory</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">Operations Control Center / Live Merchants Module</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by shop/owner name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-sidebar border-sidebar-border focus:border-primary/50 transition-colors rounded-xl font-medium" 
            />
          </div>
          <Button variant="outline" className="h-11 px-4 gap-2 border-sidebar-border bg-sidebar rounded-xl text-primary font-bold uppercase tracking-widest text-[10px]">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button onClick={fetchShops} className="h-11 px-6 gap-2 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all">
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-6 p-8 text-center bg-sidebar-accent/10 border border-sidebar-border rounded-3xl">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-bold tracking-[0.2em] uppercase text-primary">Scanning Merchant Database...</p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-sidebar-border rounded-3xl bg-sidebar/50">
          <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase text-muted-foreground tracking-tighter">No Shops Detected</h3>
          <p className="text-sm text-muted-foreground mt-2">No active merchants matching your query were found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredShops.map(shop => (
            <div key={shop.shop_id} className="group p-6 bg-sidebar border border-sidebar-border rounded-3xl hover:border-primary/50 transition-all hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] relative overflow-hidden flex flex-col justify-between h-auto min-h-[220px]">
              
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                <Store className="h-24 w-24 text-primary -mt-8 -mr-8" />
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-sidebar-foreground line-clamp-1">{shop.shop_name}</h3>
                    <Badge variant="outline" className="mt-2 bg-green-500/10 text-green-500 border-green-500/20 uppercase font-bold text-[10px] tracking-widest">
                      Active Branch
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-black/20 flex flex-shrink-0 items-center justify-center border border-white/5">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Owner / Contact</p>
                      <p className="text-sm font-semibold truncate leading-tight">{shop.owner_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-black/20 flex flex-shrink-0 items-center justify-center border border-white/5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Coordinates</p>
                      <p className="text-xs font-mono truncate leading-tight">Lat: {shop.lat.toFixed(4)}, Lng: {shop.lng.toFixed(4)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
                <div className="flex items-center justify-center gap-2 py-3 bg-black/20 border border-white/5 rounded-xl">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">{shop.product_count} Items</span>
                </div>
                <Button 
                  onClick={() => setSelectedShopId(shop.shop_id)}
                  className="w-full h-full rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white uppercase font-bold tracking-widest text-[10px] transition-all"
                >
                  Inspect
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-out details drawer */}
      <ShopDetailsDrawer 
        shopId={selectedShopId} 
        onClose={() => setSelectedShopId(null)} 
      />
    </div>
  )
}
