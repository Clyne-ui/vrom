'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Navigation, MessageCircle, Banknote, HelpCircle, AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface DisputeEntry {
  order_id: string
  buyer_name: string
  seller_name: string
  amount: number
  status: string
  created_at: string
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Confirmation Dialog State
  const [selectedDispute, setSelectedDispute] = useState<DisputeEntry | null>(null)

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/disputes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch disputes')
      const data = await res.json()
      setDisputes(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Error connecting to OCC')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDisputes()
  }, [])

  const handleResolve = async () => {
    if (!selectedDispute) return
    const orderId = selectedDispute.order_id
    
    setProcessing(orderId)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/disputes/resolve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_id: orderId })
      })

      if (!res.ok) {
        const errData = await res.text()
        throw new Error(errData || 'Failed to resolve dispute')
      }
      
      toast.success(`Dispute Resolved: KES ${selectedDispute.amount} refunded to ${selectedDispute.buyer_name}`)
      setDisputes(disputes.filter(d => d.order_id !== orderId))
      setSelectedDispute(null)
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
            <div className="h-10 w-10 rounded-xl bg-destructive/20 flex items-center justify-center border border-destructive/30">
              <AlertOctagon className="h-5 w-5 text-destructive" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-sidebar-foreground">Dispute Resolution</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">Operations Control Center / Financial Escrow Mediation</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="h-11 px-4 border-destructive/20 bg-destructive/10 text-destructive text-[10px] uppercase font-black tracking-[0.2em]">
            <HelpCircle className="h-3.5 w-3.5 mr-2" />
            {disputes.length} Active Disputes
          </Badge>
          <Button onClick={fetchDisputes} className="h-11 px-6 gap-2 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-widest text-[10px] active:scale-95 transition-all">
            Refresh Tickets
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-6 p-8 text-center bg-sidebar-accent/10 border border-sidebar-border rounded-3xl">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-bold tracking-[0.2em] uppercase text-primary">Scanning Escrow Ledger...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-sidebar-border rounded-3xl bg-sidebar/50">
          <CheckCircle2 className="h-16 w-16 text-green-500/20 mx-auto mb-4" />
          <h3 className="text-xl font-black uppercase text-muted-foreground tracking-tighter">Zero Disputes</h3>
          <p className="text-sm text-muted-foreground mt-2">All escrow funds are currently secure and undisputed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {disputes.map(dispute => (
            <div key={dispute.order_id} className="group p-6 bg-sidebar border border-sidebar-border rounded-3xl hover:border-destructive/50 transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] relative overflow-hidden flex flex-col justify-between h-auto">
              
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <AlertCircle className="h-24 w-24 text-destructive -mt-8 -mr-8" />
              </div>

              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-mono tracking-widest text-muted-foreground mb-1 uppercase">Order Hash</h3>
                    <p className="text-lg font-black font-mono text-sidebar-foreground">{dispute.order_id}</p>
                  </div>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 uppercase font-bold text-[10px] tracking-widest">
                    {dispute.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-black/20 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">Buyer</p>
                      <p className="text-sm font-semibold truncate max-w-[120px]">{dispute.buyer_name}</p>
                    </div>
                    <Navigation className="h-4 w-4 text-primary opacity-50 rotate-90" />
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">Seller</p>
                      <p className="text-sm font-semibold truncate max-w-[120px]">{dispute.seller_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-2 text-primary">
                      <Banknote className="h-5 w-5" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Escrow Hold</span>
                    </div>
                    <span className="text-lg font-black tracking-tighter text-sidebar-foreground">KES {dispute.amount}</span>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Escrow locked since: {new Date(dispute.created_at).toLocaleString()}
                </div>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-sidebar-border">
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl bg-black/20 border-sidebar-border text-muted-foreground hover:text-white uppercase font-bold tracking-widest text-[10px] transition-all flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </Button>
                <Button 
                  onClick={() => setSelectedDispute(dispute)}
                  className="w-full h-12 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white uppercase font-bold tracking-widest text-[10px] transition-all"
                >
                  Force Refund
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="bg-sidebar border border-sidebar-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-black uppercase tracking-widest">
              <AlertCircle className="h-5 w-5" /> Confirm Escrow Reversal
            </DialogTitle>
            <DialogDescription className="pt-4 text-sm text-muted-foreground">
              You are about to authorize a forced refund for order <strong className="font-mono text-sidebar-foreground">{selectedDispute?.order_id}</strong>.
              <br /><br />
              This action will securely transfer <strong className="text-primary font-black">KES {selectedDispute?.amount}</strong> from the Vrom Escrow Wallet back to <strong className="text-white">{selectedDispute?.buyer_name}</strong>'s wallet.
              <br /><br />
              This action is immutable and will be recorded in the Admin Audit Log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex items-center gap-3">
            <Button variant="outline" onClick={() => setSelectedDispute(null)} className="h-12 w-full rounded-xl uppercase font-bold tracking-widest text-[10px]">
              Cancel
            </Button>
            <Button 
              disabled={!!processing}
              onClick={handleResolve} 
              className="h-12 w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white uppercase font-black tracking-widest text-[10px] shadow-[0_5px_20px_rgba(239,68,68,0.3)]"
            >
              {processing ? (
                <div className="h-4 w-4 border-2 border-white/40 border-t-white animate-spin rounded-full" />
              ) : (
                "Authorize Refund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
