'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Lock, LogIn, Shield, Zap, Eye, CheckCircle, ShieldAlert } from 'lucide-react'
import { AlertCard, SecurityAlert } from '@/components/dashboard/security/alert-card'
import { IncidentDrawer } from '@/components/dashboard/security/incident-drawer'

interface AuditLog {
  id: string
  action: string
  actor: string
  timestamp: string
  ipAddress: string
  result: 'success' | 'failed' | 'warning'
  details: string
}

const INITIAL_ALERTS: SecurityAlert[] = [
  { id: 'ALT001', type: 'fraud', severity: 'critical', title: 'Potential Fraud Detected', description: 'Multiple failed transactions from same account within 10 minutes', timestamp: '2024-03-23 15:42:00', status: 'active', region: 'kenya' },
  { id: 'ALT002', type: 'security', severity: 'high', title: 'Unusual Access Pattern', description: 'Admin account accessed from new location (unknown IP)', timestamp: '2024-03-23 15:35:00', status: 'active', region: 'global' },
  { id: 'ALT003', type: 'anomaly', severity: 'medium', title: 'High Volume Anomaly', description: 'Order volume 45% above 24-hour average', timestamp: '2024-03-23 15:15:00', status: 'active', region: 'nigeria' },
  { id: 'ALT004', type: 'policy', severity: 'low', title: 'Policy Reminder', description: 'Monthly compliance report due - Last filed 28 days ago', timestamp: '2024-03-23 14:00:00', status: 'active', region: 'global' },
]

export default function SecurityPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)
  const activeAlerts = alerts.filter(a => a.status === 'active')

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        const token = localStorage.getItem('vrom_session_token')
        const headers = { 'Authorization': `Bearer ${token}` }

        // Fetch Maintenance Status
        const maintRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/admin/maintenance`, { headers })
        if (maintRes.ok) {
          const data = await maintRes.json()
          setMaintenanceMode(data.maintenance_mode)
        }

        // Fetch Alerts
        const alertsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/security/alerts?status=active`, { headers })
        if (alertsRes.ok) {
          const data = await alertsRes.json()
          setAlerts(data.map((a: any) => ({
            id: a.alert_id,
            type: a.type,
            severity: a.severity,
            title: a.type.charAt(0).toUpperCase() + a.type.slice(1) + ' Alert',
            description: a.message,
            timestamp: a.created_at,
            status: a.status,
            region: a.region
          })))
        }

        // Fetch Audit Logs
        const auditRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/analytics/audit`, { headers })
        if (auditRes.ok) {
          const data = await auditRes.json()
          setAuditLogs(data.map((l: any) => ({
            id: l.log_id,
            action: l.action,
            actor: l.admin_email,
            timestamp: l.created_at,
            ipAddress: l.ip_address,
            result: 'success', // Backend doesn't store result yet, assuming success for logs present
            details: `Action on ${l.target_id}`
          })))
        }
      } catch (err) {
        console.error('Failed to fetch security data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSecurityData()
  }, [])

  const handleToggleMaintenance = async () => {
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/admin/maintenance/toggle`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !maintenanceMode })
      })
      if (res.ok) {
        setMaintenanceMode(!maintenanceMode)
      }
    } catch (err) {
      console.error('Failed to toggle maintenance:', err)
    }
  }

  const handleResolveAlert = async (id: string, newStatus: 'resolved' | 'dismissed') => {
    try {
      const token = localStorage.getItem('vrom_session_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/security/resolve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alert_id: id, action: newStatus })
      })
      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== id))
        setSelectedAlert(null)
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  const getResultColor = (result: string) => {
    return result === 'success' ? 'text-green-500' : result === 'failed' ? 'text-red-500' : 'text-yellow-500'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security & Compliance</h1>
        <p className="text-muted-foreground mt-1">Fraud detection, audit logs, and system alerts.</p>
      </div>

      {/* Kill Switch */}
      <Card className={`p-6 glass-dark border-2 transition-colors ${maintenanceMode ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${maintenanceMode ? 'bg-destructive/20' : 'bg-primary/10'}`}>
              <Zap className={`h-6 w-6 ${maintenanceMode ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">System Maintenance Mode</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {maintenanceMode ? 'System is currently halted. All customer transactions are paused.' : 'Enable to instantly pause all platform operations globally.'}
              </p>
            </div>
          </div>
          <Button onClick={handleToggleMaintenance} className={maintenanceMode ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary'}>
            {maintenanceMode ? 'DISABLE KILL SWITCH' : 'ENABLE KILL SWITCH'}
          </Button>
        </div>
      </Card>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Alerts', value: activeAlerts.length, icon: ShieldAlert, color: 'text-red-500' },
          { label: 'Failed Logins (24h)', value: 12, icon: LogIn, color: 'text-orange-500' },
          { label: 'Blocked IPS', value: 45, icon: Lock, color: 'text-yellow-500' },
          { label: 'System Health', value: '98%', icon: Shield, color: 'text-green-500' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="p-4 glass-dark flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${stat.color}`}><Icon className="h-6 w-6" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Active Alerts List */}
      <Card className="glass-dark">
        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Active Security Alerts
          </h3>
          <span className="text-xs font-bold px-2.5 py-1 bg-destructive/20 text-destructive rounded-full">{activeAlerts.length} Pending</span>
        </div>
        <div className="divide-y divide-border">
          {activeAlerts.length > 0 ? (
            activeAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onClick={setSelectedAlert}
              />
            ))
          ) : (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <CheckCircle className="h-10 w-10 text-green-500/50" />
              <p>No active security alerts. System is fully secure.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Alert Details Drawer */}
      <IncidentDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onResolve={handleResolveAlert}
      />

      {/* Audit Logs */}
      <Card className="glass-dark">
        <div className="p-5 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5" /> Audit Log (Live)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Time</th>
                <th className="px-5 py-3 text-left font-semibold">Action Event</th>
                <th className="px-5 py-3 text-left font-semibold">Actor / IP</th>
                <th className="px-5 py-3 text-left font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{log.timestamp.split(' ')[1]}</td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground max-w-xs truncate">{log.details}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-foreground">{log.actor}</p>
                    <p className="text-xs font-mono text-muted-foreground">{log.ipAddress}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold bg-muted ${getResultColor(log.result)}`}>
                      {log.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
