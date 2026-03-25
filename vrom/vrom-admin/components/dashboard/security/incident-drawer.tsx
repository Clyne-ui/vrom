'use client'

import { X, CheckCircle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SecurityAlert } from './alert-card'

interface IncidentDrawerProps {
    alert: SecurityAlert | null
    onClose: () => void
    onResolve: (id: string, newStatus: 'resolved' | 'dismissed') => void
}

export function IncidentDrawer({ alert, onClose, onResolve }: IncidentDrawerProps) {
    if (!alert) return null

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30'
            case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
            case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
            case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
            default: return 'bg-gray-500/20 text-gray-500'
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-background border-l border-border h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right-full transition-transform duration-300">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-destructive" /> Incident Report
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-3 ${getSeverityColor(alert.severity)}`}>
                                {alert.severity} PRIORITY
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">{alert.title}</h3>
                            <p className="text-muted-foreground">{alert.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4 glass-dark">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Incident ID</p>
                                <p className="font-mono mt-1 text-sm">{alert.id}</p>
                            </Card>
                            <Card className="p-4 glass-dark">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Time Detected</p>
                                <p className="text-sm mt-1">{alert.timestamp}</p>
                            </Card>
                            <Card className="p-4 glass-dark">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Classification</p>
                                <p className="text-sm mt-1 uppercase">{alert.type}</p>
                            </Card>
                            <Card className="p-4 glass-dark">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Affected Region</p>
                                <p className="text-sm mt-1 uppercase text-primary font-bold">{alert.region || 'GLOBAL'}</p>
                            </Card>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-border">
                            <h4 className="font-semibold text-foreground">Recommended Actions</h4>
                            <Button
                                onClick={() => onResolve(alert.id, 'resolved')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                            >
                                <CheckCircle className="h-4 w-4" /> Mark as Resolved & Secure
                            </Button>
                            <Button
                                onClick={() => onResolve(alert.id, 'dismissed')}
                                variant="outline"
                                className="w-full"
                            >
                                Dismiss as False Alarm
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
