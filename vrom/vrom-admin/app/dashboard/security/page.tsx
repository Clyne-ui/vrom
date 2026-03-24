'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Lock, LogIn, Shield, Zap, Clock, Eye, X, CheckCircle, ShieldAlert } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  actor: string
  timestamp: string
  ipAddress: string
  result: 'success' | 'failed' | 'warning'
  details: string
}

interface Alert {
  id: string
  type: 'fraud' | 'security' | 'anomaly' | 'policy'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  timestamp: string
  status: 'active' | 'resolved' | 'dismissed'
  region?: string
}

const INITIAL_ALERTS: Alert[] = [
  { id: 'ALT001', type: 'fraud', severity: 'critical', title: 'Potential Fraud Detected', description: 'Multiple failed transactions from same account within 10 minutes', timestamp: '2024-03-23 15:42:00', status: 'active', region: 'kenya' },
  { id: 'ALT002', type: 'security', severity: 'high', title: 'Unusual Access Pattern', description: 'Admin account accessed from new location (unknown IP)', timestamp: '2024-03-23 15:35:00', status: 'active', region: 'global' },
  { id: 'ALT003', type: 'anomaly', severity: 'medium', title: 'High Volume Anomaly', description: 'Order volume 45% above 24-hour average', timestamp: '2024-03-23 15:15:00', status: 'active', region: 'nigeria' },
  { id: 'ALT004', type: 'policy', severity: 'low', title: 'Policy Reminder', description: 'Monthly compliance report due - Last filed 28 days ago', timestamp: '2024-03-23 14:00:00', status: 'active', region: 'global' },
]

export default function SecurityPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  const [auditLogs] = useState<AuditLog[]>([
    { id: 'LOG001', action: 'User Login', actor: 'admin@vrom.io', timestamp: '2024-03-23 15:45:22', ipAddress: '192.168.1.100', result: 'success', details: 'Successful admin login with 2FA verification' },
    { id: 'LOG002', action: 'Driver Verification', actor: 'system', timestamp: '2024-03-23 15:40:10', ipAddress: '192.168.1.100', result: 'success', details: 'Driver license verified - DRV001' },
    { id: 'LOG003', action: 'Payout Initiated', actor: 'admin@vrom.io', timestamp: '2024-03-23 15:35:45', ipAddress: '192.168.1.100', result: 'success', details: 'Payout of $50,000 to merchant account' },
    { id: 'LOG004', action: 'Failed Login Attempt', actor: 'unknown@email.com', timestamp: '2024-03-23 15:20:30', ipAddress: '203.45.67.89', result: 'failed', details: 'Invalid credentials provided' },
  ])

  const activeAlerts = alerts.filter(a => a.status === 'active')

  const handleResolveAlert = (id: string, newStatus: 'resolved' | 'dismissed') => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: newStatus } : a))
    setSelectedAlert(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
      case 'low': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-500'
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
          <Button onClick={() => setMaintenanceMode(!maintenanceMode)} className={maintenanceMode ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary'}>
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
              <div key={alert.id} onClick={() => setSelectedAlert(alert)} className="p-5 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between group">
                <div className="flex items-start gap-4">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
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
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedAlert(null)} />
          <div className="relative w-full max-w-lg bg-background border-l border-border h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" /> Incident Report
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAlert(null)}><X className="h-5 w-5" /></Button>
              </div>

              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-3 ${getSeverityColor(selectedAlert.severity)}`}>
                    {selectedAlert.severity} PRIORITY
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{selectedAlert.title}</h3>
                  <p className="text-muted-foreground">{selectedAlert.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 glass-dark">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Incident ID</p>
                    <p className="font-mono mt-1 text-sm">{selectedAlert.id}</p>
                  </Card>
                  <Card className="p-4 glass-dark">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Time Detected</p>
                    <p className="text-sm mt-1">{selectedAlert.timestamp}</p>
                  </Card>
                  <Card className="p-4 glass-dark">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Classification</p>
                    <p className="text-sm mt-1 uppercase">{selectedAlert.type}</p>
                  </Card>
                  <Card className="p-4 glass-dark">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Affected Region</p>
                    <p className="text-sm mt-1 uppercase text-primary font-bold">{selectedAlert.region || 'GLOBAL'}</p>
                  </Card>
                </div>

                <div className="space-y-3 pt-6 border-t border-border">
                  <h4 className="font-semibold">Recommended Actions</h4>
                  <Button onClick={() => handleResolveAlert(selectedAlert.id, 'resolved')} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                    <CheckCircle className="h-4 w-4" /> Mark as Resolved & Secure
                  </Button>
                  <Button onClick={() => handleResolveAlert(selectedAlert.id, 'dismissed')} variant="outline" className="w-full">
                    Dismiss as False Alarm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
