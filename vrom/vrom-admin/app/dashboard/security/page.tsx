'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Lock, LogIn, Shield, Zap, Clock, Eye, EyeOff } from 'lucide-react'

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
}

export default function SecurityPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'LOG001',
      action: 'User Login',
      actor: 'admin@vrom.io',
      timestamp: '2024-03-23 15:45:22',
      ipAddress: '192.168.1.100',
      result: 'success',
      details: 'Successful admin login with 2FA verification',
    },
    {
      id: 'LOG002',
      action: 'Driver Verification',
      actor: 'system',
      timestamp: '2024-03-23 15:40:10',
      ipAddress: 'N/A',
      result: 'success',
      details: 'Driver license verified - DRV001',
    },
    {
      id: 'LOG003',
      action: 'Payout Initiated',
      actor: 'admin@vrom.io',
      timestamp: '2024-03-23 15:35:45',
      ipAddress: '192.168.1.100',
      result: 'success',
      details: 'Payout of $50,000 to merchant account initiated',
    },
    {
      id: 'LOG004',
      action: 'Failed Login Attempt',
      actor: 'unknown@email.com',
      timestamp: '2024-03-23 15:20:30',
      ipAddress: '203.45.67.89',
      result: 'failed',
      details: 'Invalid credentials provided',
    },
    {
      id: 'LOG005',
      action: 'Data Export',
      actor: 'admin@vrom.io',
      timestamp: '2024-03-23 15:10:15',
      ipAddress: '192.168.1.100',
      result: 'warning',
      details: 'Exported user analytics report (50MB)',
    },
  ])

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'ALT001',
      type: 'fraud',
      severity: 'critical',
      title: 'Potential Fraud Detected',
      description: 'Multiple failed transactions from same account within 10 minutes',
      timestamp: '2024-03-23 15:42:00',
    },
    {
      id: 'ALT002',
      type: 'security',
      severity: 'high',
      title: 'Unusual Access Pattern',
      description: 'Admin account accessed from new location (unknown IP)',
      timestamp: '2024-03-23 15:35:00',
    },
    {
      id: 'ALT003',
      type: 'anomaly',
      severity: 'medium',
      title: 'High Volume Anomaly',
      description: 'Order volume 45% above 24-hour average',
      timestamp: '2024-03-23 15:15:00',
    },
    {
      id: 'ALT004',
      type: 'policy',
      severity: 'low',
      title: 'Policy Reminder',
      description: 'Monthly compliance report due - Last filed 28 days ago',
      timestamp: '2024-03-23 14:00:00',
    },
  ])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      case 'warning':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Security & Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Fraud detection, audit logs, and role-based access control.
        </p>
      </div>

      {/* Kill Switch */}
      <Card className={`p-6 glass-dark border-2 ${maintenanceMode ? 'border-destructive/50' : 'border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${maintenanceMode ? 'bg-destructive/20' : 'bg-primary/10'}`}>
              <Zap className={`h-6 w-6 ${maintenanceMode ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">System Maintenance Mode</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {maintenanceMode
                  ? 'System is currently in maintenance mode. All services are paused.'
                  : 'Enable to pause all platform operations for maintenance or emergencies.'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={maintenanceMode ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary'}
          >
            {maintenanceMode ? 'DISABLE' : 'ENABLE'}
          </Button>
        </div>
      </Card>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Alerts', value: alerts.length, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'Failed Logins (24h)', value: 3, icon: LogIn, color: 'text-orange-500' },
          { label: 'Flagged Transactions', value: 7, icon: Lock, color: 'text-yellow-500' },
          { label: 'Security Score', value: '92%', icon: Shield, color: 'text-green-500' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="p-4 glass-dark">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-current/10 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Active Alerts */}
      <Card className="glass-dark">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Security Alerts
          </h3>
        </div>

        <div className="divide-y divide-border">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-6 hover:bg-muted/30 transition-colors flex items-start gap-4"
              >
                <div className={`p-2 rounded-lg text-xl ${getSeverityColor(alert.severity)}`}>
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{alert.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {alert.timestamp}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted">
                      {alert.type}
                    </span>
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              No active alerts
            </div>
          )}
        </div>
      </Card>

      {/* Audit Log */}
      <Card className="glass-dark">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Audit Log (Real-time)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs text-muted-foreground font-mono">
                      {log.timestamp}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{log.actor}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      {log.ipAddress}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${getResultColor(log.result)}`} />
                      <span className={`text-xs font-medium ${getResultColor(log.result)}`}>
                        {log.result.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground truncate">
                      {log.details}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {auditLogs.length} of {auditLogs.length} logs
          </p>
          <Button variant="outline" size="sm">
            Load More
          </Button>
        </div>
      </Card>

      {/* RBA (Role-Based Access) Info */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4">Role-Based Access Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              role: 'Super Admin',
              permissions: '32 permissions',
              users: 2,
              color: 'text-red-500',
            },
            {
              role: 'Admin',
              permissions: '24 permissions',
              users: 5,
              color: 'text-orange-500',
            },
            {
              role: 'Analyst',
              permissions: '12 permissions',
              users: 12,
              color: 'text-blue-500',
            },
          ].map((rba, i) => (
            <Card key={i} className="p-4 border border-border">
              <p className={`font-semibold text-lg ${rba.color}`}>{rba.role}</p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>✓ {rba.permissions}</p>
                <p>👥 {rba.users} users assigned</p>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}
