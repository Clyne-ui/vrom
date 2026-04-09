'use client'

import { useEffect, useState } from 'react'
import { X, Store, Mail, MapPin, Package, Eye, ShieldCheck, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

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

interface Product {
  product_id: string
  title: string
  price: number
  currency: string
  image_url: string
  stock_count: number
  category_id: string
}

interface AdminShopDetailView {
  shop: AdminShopView
  products: Product[]
}

interface ShopDetailsDrawerProps {
  shopId: string | null
  onClose: () => void
}

export function ShopDetailsDrawer({ shopId, onClose }: ShopDetailsDrawerProps) {
  const [detail, setDetail] = useState<AdminShopDetailView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    if (!shopId) {
      setDetail(null)
      return
    }

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('vrom_session_token')
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/shops/details?id=${shopId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error('Failed to fetch shop details')
        const data = await res.json()
        setDetail(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [shopId])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] gap-6 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <div className="text-center">
            <p className="text-lg font-bold uppercase tracking-[0.2em] text-primary">Accessing Shop Database...</p>
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
          </div>
        </div>
      )
    }

    if (!detail) {
      return (
        <div className="flex flex-col items-center justify-center h-[600px] gap-6 p-8 text-center opacity-60">
          <div className="h-20 w-20 rounded-3xl bg-sidebar-accent/50 flex items-center justify-center border border-sidebar-border shadow-inner mx-auto">
            <Eye className="h-10 w-10 text-muted-foreground opacity-20" />
          </div>
          <p className="text-lg font-bold uppercase tracking-[0.2em] text-muted-foreground">Shop Not Found</p>
        </div>
      )
    }

    const { shop, products } = detail

    return (
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Shop & Owner Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Merchant Identity</h4>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Owner Name</span>
                <p className="text-xl font-bold tracking-tight text-white">{shop.owner_name}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{shop.owner_email}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium line-clamp-2">{shop.shop_address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border text-center flex flex-col items-center justify-center">
              <Package className="h-8 w-8 text-primary mb-2 opacity-50" />
              <p className="text-3xl font-black">{shop.product_count}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Active Products</p>
            </div>
            <div className="p-6 bg-sidebar-accent/20 rounded-3xl border border-sidebar-border text-center flex flex-col items-center justify-center">
              <Store className="h-8 w-8 text-green-500 mb-2 opacity-50" />
              <p className="text-3xl font-black text-green-500">Live</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Shop Status</p>
            </div>
          </div>
        </div>

        {/* Right Column: Product Catalog */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between ml-2">
            <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground">Product Catalog Dashboard</h4>
            <span className="text-[10px] text-primary font-mono">{products.length} Items Loaded</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.product_id} className="group relative rounded-3xl overflow-hidden border border-white/5 bg-black/40 flex flex-col">
                <div className="aspect-square w-full overflow-hidden cursor-pointer" onClick={() => setSelectedImage(product.image_url)}>
                  <img 
                    src={product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop'} 
                    alt={product.title} 
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-black/60 backdrop-blur-md text-white border-white/10 uppercase text-[10px]">
                      {product.currency} {product.price}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2 relative bg-sidebar z-10 border-t border-white/5">
                  <p className="text-sm font-bold truncate text-white">{product.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    <span className="flex items-center gap-1"><Box className="h-3 w-3" /> Stock: {product.stock_count}</span>
                    <span className="text-primary font-mono">{product.category_id}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {products.length === 0 && (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-sidebar-border rounded-3xl bg-black/10 flex flex-col items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">No products uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!shopId) return null

  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
        <div className="bg-sidebar border border-sidebar-border shadow-2xl rounded-3xl w-full max-w-5xl h-full flex flex-col overflow-hidden relative border-primary/20">
        
        {/* Header - Industrial Style */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between bg-sidebar-accent/30">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <Store className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-sidebar-foreground tracking-tighter uppercase italic">{detail?.shop?.shop_name || 'Loading Shop...'}</h2>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px] tracking-widest font-bold">
                  Merchant Log
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono opacity-60">ID: {detail?.shop?.shop_id || shopId || 'Unknown'}</p>
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
    
    <Dialog open={!!selectedImage} onOpenChange={(o) => !o && setSelectedImage(null)}>
      <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 flex justify-center [&>button]:text-white [&>button]:bg-black/50 [&>button]:hover:bg-black/70 [&>button]:p-2 [&>button]:rounded-full">
        <DialogTitle className="sr-only">Product Image</DialogTitle>
        {selectedImage && (
          <img 
            src={selectedImage} 
            alt="Product detail" 
            className="max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20" 
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
