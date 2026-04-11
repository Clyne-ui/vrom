'use client'

import { useState, useEffect } from 'react'
import { Shield, Check, X, AlertTriangle, Eye, ShieldAlert, PackageX, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RiderVerificationTable } from '@/components/dashboard/moderation/rider-verification-table'

interface FlaggedProduct {
  product_id: string
  title: string
  image_url: string
  price: number
  seller_name: string
  flagged_at: string
}

export default function ModerationPage() {
  const [queue, setQueue] = useState<FlaggedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/content/queue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch queue')
      const data = await res.json()
      setQueue(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Error connecting to OCC')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleAction = async (productId: string, action: 'approve' | 'reject') => {
    setProcessing(productId)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/content/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: productId })
      })

      if (!res.ok) throw new Error(`Failed to ${action} item`)

      toast.success(`Item ${action === 'approve' ? 'Approved & Restored' : 'Rejected & Deactivated'}`)
      setQueue(queue.filter(q => q.product_id !== productId))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sidebar-border pb-6 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-sidebar-foreground">AI Moderation Queue</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">Operations Control Center / Trust & Safety</p>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline" className="h-11 px-4 border-orange-500/20 bg-orange-500/10 text-orange-500 text-[10px] uppercase font-black tracking-[0.2em]">
            <AlertTriangle className="h-3.5 w-3.5 mr-2" />
            {queue.length} Flags Pending
          </Badge>
          <Button onClick={fetchQueue} className="h-11 px-6 gap-2 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all">
            Refresh Queue
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="bg-sidebar border border-sidebar-border p-1 gap-1 mb-8 rounded-2xl h-14 w-full md:w-auto">
          <TabsTrigger value="content" className="px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase text-[10px] tracking-widest h-full">
            <PackageX className="h-4 w-4 mr-2" />
            AI Content Flags
          </TabsTrigger>
          <TabsTrigger value="riders" className="px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase text-[10px] tracking-widest h-full">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Rider Onboarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-0 space-y-8 outline-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-6 p-8 text-center bg-sidebar-accent/10 border border-sidebar-border rounded-3xl">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-bold tracking-[0.2em] uppercase text-primary">Fetching AI Telemetry...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-sidebar-border rounded-3xl bg-sidebar/50">
              <Shield className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-xl font-black uppercase text-muted-foreground tracking-tighter">Queue is Clear</h3>
              <p className="text-sm text-muted-foreground mt-2">No active violations detected by the Vrom AI Engine.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {queue.map(item => (
                <div key={item.product_id} className="group flex flex-col bg-sidebar border border-sidebar-border rounded-3xl overflow-hidden hover:border-orange-500/50 transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                  <div className="relative aspect-square w-full cursor-pointer overflow-hidden" onClick={() => setSelectedImage(item.image_url)}>
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop'}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-between">
                      <div className="flex justify-end">
                        <Badge className="bg-orange-500 text-white border-none uppercase text-[9px] font-black tracking-widest shadow-[0_0_15px_rgba(249,115,22,0.5)]">AI Flagged</Badge>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/70 font-mono mb-1">{new Date(item.flagged_at).toLocaleString()}</p>
                        <h3 className="text-lg font-black text-white leading-tight line-clamp-2">{item.title}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between border-t border-sidebar-border bg-sidebar-accent/10">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Merchant</span>
                        <span className="text-xs font-semibold text-sidebar-foreground truncate max-w-[120px]">{item.seller_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Listing Price</span>
                        <span className="text-xs font-black text-primary">KES {item.price}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-sidebar-border">
                      <Button
                        variant="outline"
                        onClick={() => handleAction(item.product_id, 'reject')}
                        disabled={processing === item.product_id}
                        className="h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 uppercase font-black text-[10px] tracking-widest"
                      >
                        {processing === item.product_id ? <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : 'REJECT'}
                      </Button>
                      <Button
                        onClick={() => handleAction(item.product_id, 'approve')}
                        disabled={processing === item.product_id}
                        className="h-12 rounded-xl bg-green-600 hover:bg-green-500 text-white uppercase font-black text-[10px] tracking-widest"
                      >
                        {processing === item.product_id ? <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : 'APPROVE'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="riders" className="mt-0 outline-none">
          <div className="bg-sidebar-accent/10 border border-sidebar-border rounded-3xl p-6">
            <RiderVerificationTable />
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(o) => !o && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 flex justify-center [&>button]:text-white [&>button]:bg-black/50 [&>button]:hover:bg-black/70 [&>button]:p-2 [&>button]:rounded-full">
          <DialogTitle className="sr-only">Flagged Content Review</DialogTitle>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Flagged Item"
                className="max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(249,115,22,0.3)] border-2 border-orange-500"
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-orange-500 text-white uppercase font-black tracking-widest">Exhibit A</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
