'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Check, X, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { apiClient } from '@/lib/api-client'

interface PendingRider {
    user_id: string
    full_name: string
    vehicle_type: string
    id_image_url: string
}

export function RiderVerificationTable() {
    const [riders, setRiders] = useState<PendingRider[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRider, setSelectedRider] = useState<PendingRider | null>(null)
    const [region, setRegion] = useState("Nairobi")

    const fetchPending = async () => {
        setLoading(true)
        try {
            const data = await apiClient.getPendingRiders()
            setRiders(data || [])
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPending()
    }, [])

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            if (action === 'approve') {
                await apiClient.approveRider(id, region)
            } else {
                await apiClient.rejectRider(id, "Incomplete documentation")
            }

            toast.success(`Rider ${action === 'approve' ? 'Approved' : 'Rejected'}`)
            setRiders(riders.filter(r => r.user_id !== id))
            setSelectedRider(null)
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Scanning dossier backlog...</div>

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow className="border-sidebar-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Rider</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Vehicle</TableHead>
                        <TableHead className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">ID Preview</TableHead>
                        <TableHead className="text-right text-muted-foreground uppercase text-[10px] font-black tracking-widest">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {riders.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                All verification dossiers cleared.
                            </TableCell>
                        </TableRow>
                    ) : (
                        riders.map((rider) => (
                            <TableRow key={rider.user_id} className="border-sidebar-border hover:bg-sidebar-accent/50 transition-colors">
                                <TableCell className="font-bold py-4">
                                    <div>
                                        <p className="text-sidebar-foreground">{rider.full_name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">{rider.user_id}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[9px] font-black">
                                        {rider.vehicle_type}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="h-10 w-16 rounded border border-sidebar-border overflow-hidden bg-muted cursor-pointer hover:border-primary transition-colors"
                                        onClick={() => setSelectedRider(rider)}>
                                        <img src={rider.id_image_url} alt="ID" className="h-full w-full object-cover" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-lg hover:bg-primary/20 hover:text-primary"
                                            onClick={() => setSelectedRider(rider)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-lg hover:bg-green-500/20 hover:text-green-500 border-green-500/20"
                                            onClick={() => setSelectedRider(rider)}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog open={!!selectedRider} onOpenChange={(o) => !o && setSelectedRider(null)}>
                <DialogContent className="max-w-2xl bg-sidebar border-sidebar-border shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-sidebar-foreground">
                            Verification Dossier: {selectedRider?.full_name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="aspect-video rounded-xl border border-sidebar-border overflow-hidden bg-black/40">
                                <img src={selectedRider?.id_image_url} alt="ID Front" className="w-full h-full object-contain" />
                            </div>
                            <p className="text-[10px] uppercase font-black text-muted-foreground text-center tracking-widest">Identify Document Overlay</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-sidebar-accent/50 rounded-xl border border-sidebar-border space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Assign Region</p>
                                        <Select value={region} onValueChange={setRegion}>
                                            <SelectTrigger className="w-full h-10 mt-1 bg-black/20 border-sidebar-border text-sm font-bold">
                                                <SelectValue placeholder="Select Operation Zone" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-sidebar border-sidebar-border">
                                                <SelectItem value="Nairobi">Nairobi, Kenya</SelectItem>
                                                <SelectItem value="Lagos">Lagos, Nigeria</SelectItem>
                                                <SelectItem value="Kampala">Kampala, Uganda</SelectItem>
                                                <SelectItem value="Dar es Salaam">Tanzania</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    I confirm that I have visually verified the submitted identification docs and they match the platform profile.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-3 sm:justify-start">
                        <Button
                            onClick={() => handleAction(selectedRider!.user_id, 'approve')}
                            className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-500 text-white uppercase font-black text-[11px] tracking-widest shadow-[0_5px_15px_rgba(22,163,74,0.3)]"
                        >
                            Approve & Onboard
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleAction(selectedRider!.user_id, 'reject')}
                            className="flex-1 h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 uppercase font-black text-[11px] tracking-widest"
                        >
                            Reject Dossier
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
