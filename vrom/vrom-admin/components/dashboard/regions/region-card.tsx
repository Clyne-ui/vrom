'use client'

import { MapPin, ShieldAlert, Lock, Unlock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface ExtendedRegion {
    code: string
    name: string
    country: string
    status: 'active' | 'inactive' | 'blocked'
    currency: string
    timezone: string
    drivers: number
    riders: number
    merchants: number
    activeOrders: number
    gmv: number
    hasIssue?: boolean
}

interface RegionCardProps {
    region: ExtendedRegion
    onManage: (code: string) => void
    onBlock: (code: string) => void
    onDelete: (code: string) => void
}

export function RegionCard({ region, onManage, onBlock, onDelete }: RegionCardProps) {
    const isProblem = region.hasIssue

    return (
        <Card className={`p-6 glass-dark transition-all ${isProblem ? 'border-destructive bg-destructive/10 border-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}>
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isProblem ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                            {isProblem ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <MapPin className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-lg flex gap-2">
                                {region.name} {isProblem && <span className="animate-pulse text-destructive">⚠️ Alert</span>}
                            </h3>
                            <p className="text-xs text-muted-foreground">{region.country}</p>
                        </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${region.status === 'active' ? 'bg-green-500/20 text-green-500' :
                            region.status === 'blocked' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'
                        }`}>
                        {region.status}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
                    <div><p className="text-xs text-muted-foreground">Drivers</p><p className="font-bold">{region.drivers.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Riders</p><p className="font-bold">{region.riders.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">Merchants</p><p className="font-bold">{region.merchants.toLocaleString()}</p></div>
                    <div><p className="text-xs text-muted-foreground">GMV</p><p className="font-bold text-primary">${region.gmv.toLocaleString()}</p></div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => onManage(region.code)} className="flex-1 bg-primary/20 hover:bg-primary/40 text-primary border-0">
                        Manage Hub
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 ${region.status === 'blocked' ? 'text-green-500 border-green-500/50' : 'text-yellow-500 border-yellow-500/50'}`}
                        onClick={() => onBlock(region.code)}
                    >
                        {region.status === 'blocked' ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                        {region.status === 'blocked' ? 'Unblock' : 'Block'}
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => onDelete(region.code)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    )
}
