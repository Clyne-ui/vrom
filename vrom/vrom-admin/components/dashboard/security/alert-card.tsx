'use client'

import { AlertTriangle, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface SecurityAlert {
    id: string
    type: 'fraud' | 'security' | 'anomaly' | 'policy'
    severity: 'critical' | 'high' | 'medium' | 'low'
    title: string
    description: string
    timestamp: string
    status: 'active' | 'resolved' | 'dismissed'
    region?: string
}

interface AlertCardProps {
    alert: SecurityAlert
    onClick: (alert: SecurityAlert) => void
}

export function AlertCard({ alert, onClick }: AlertCardProps) {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30'
            case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
            case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
            case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
            default: return 'bg-gray-500/20 text-gray-500'
        }
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
            case 'high':
                return <AlertTriangle className="h-5 w-5" />
            default:
                return <Shield className="h-5 w-5" />
        }
    }

    return (
        <div
            onClick={() => onClick(alert)}
            className="p-5 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between group"
        >
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg text-xl ${getSeverityColor(alert.severity)}`}>
                    {getSeverityIcon(alert.severity)}
                </div>
                <div>
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {alert.timestamp}</span>
                        <span className="uppercase tracking-wider">Type: {alert.type}</span>
                        {alert.region && <span className="uppercase tracking-wider text-primary">Region: {alert.region}</span>}
                    </div>
                </div>
            </div>
            <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Review Incident</Button>
        </div>
    )
}
