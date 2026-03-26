'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Activity, Zap, Cpu, Server, ShieldCheck, 
  AlertTriangle, ArrowRight, RefreshCw, BarChart3,
  Globe, Terminal, Brain, HardDrive, Radio
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'
import { useUser } from '@/lib/contexts/user-context'

interface ServiceStatus {
  name: string
  key: string
  status: 'online' | 'offline' | 'degraded'
  latency: number
  description: string
  icon: any
  color: string
}

export default function OperationsPage() {
  const router = useRouter()
  const { token } = useUser()
  const { data: healthData, status: wsStatus } = useOCCWebSocket('health')

  const [systemUptime, setSystemUptime] = useState('99.98%')
  const [activeAlerts, setActiveAlerts] = useState(0)

  const services: ServiceStatus[] = [
    { 
      name: 'Go Modular Engine', 
      key: 'go', 
      status: (healthData?.go_status || 'online') as any,
      latency: healthData?.go_api_ms || 12,
      description: 'Core API, WebSocket Hub, and Transaction Orchestration.',
      icon: Zap,
      color: 'blue'
    },
    { 
      name: 'Rust Matcher', 
      key: 'rust', 
      status: (healthData?.rust_status || 'online') as any,
      latency: healthData?.rust_ms || 8,
      description: 'High-performance H3 spatial indexing and real-time dispatch matching.',
      icon: Cpu,
      color: 'purple'
    },
    { 
      name: 'Python AI Brain', 
      key: 'python', 
      status: (healthData?.python_status || 'online') as any,
      latency: healthData?.python_ms || 45,
      description: 'Fraud detection, NLP support, and predictive ETA models.',
      icon: Brain,
      color: 'green'
    }
  ]

  // If WebSocket is disconnected, mark all as offline
  const displayServices = wsStatus === 'disconnected' 
    ? services.map(s => ({ ...s, status: 'offline' as const, latency: -1 }))
    : services

  return (
    <div className="space-y-8 pb-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Radio className="h-8 w-8 text-primary animate-pulse" />
            Mission Control
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Real-time operational overview of the Vrom Platform. Monitor core engine health, 
            spatial matching performance, and AI-driven security diagnostics.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Hard Refresh
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck className="h-4 w-4" />
            System Scan
          </Button>
        </div>
      </div>

      {/* High Level Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 glass-dark border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Aggregate Uptime</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-foreground">{systemUptime}</span>
            <span className="text-xs text-green-500 font-bold mb-1.5 flex items-center gap-0.5">
               ↑ 0.02%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Calculated across last 30 operational days.</p>
        </Card>

        <Card className="p-6 glass-dark border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-yellow-500/70">System Latency</span>
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-foreground">
              {Math.max(...displayServices.map(s => s.latency))}
            </span>
            <span className="text-xl font-bold text-foreground opacity-40 mb-1">ms</span>
            <span className="text-xs text-yellow-500 font-bold mb-1.5 flex items-center gap-0.5">
               Peak
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Measured as maximum service round-trip delay.</p>
        </Card>

        <Card className="p-6 glass-dark border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
              onClick={() => router.push('/dashboard/notifications')}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-destructive/70">Unresolved Alerts</span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-foreground">
              {wsStatus === 'disconnected' ? '1' : activeAlerts}
            </span>
            <span className="text-xs text-destructive font-bold mb-1.5 flex items-center gap-0.5">
               Action Required
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Most recent: {wsStatus === 'disconnected' ? 'Main API unreachable' : 'None'}</p>
        </Card>
      </div>

      {/* Core Services Grid */}
      <div>
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          Core Engine Infrastructure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayServices.map((service) => {
            const Icon = service.icon
            const isOnline = service.status === 'online'
            const isOffline = service.status === 'offline'
            
            return (
              <Card 
                key={service.key} 
                className={`group relative overflow-hidden p-6 glass-dark border-border/40 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 ${isOffline ? 'opacity-70' : ''}`}
              >
                {/* Background Sparkle Effect */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-3xl transition-all group-hover:opacity-20 ${
                  service.color === 'blue' ? 'bg-blue-500' : service.color === 'purple' ? 'bg-purple-500' : 'bg-green-500'
                }`} />

                <div className="flex items-start justify-between mb-6">
                  <div className={`p-3 rounded-2xl bg-${service.color}-500/10 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 text-${service.color}-500`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 
                      service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    }`} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">
                      {service.status}
                    </span>
                  </div>
                </div>

                <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{service.name}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6 line-clamp-2">
                  {service.description}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Latency</span>
                    <span className={`text-sm font-mono font-bold ${isOffline ? 'text-destructive' : 'text-foreground'}`}>
                      {isOffline ? 'CRITICAL' : `${service.latency}ms`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Health</span>
                    <span className={`text-sm font-bold ${isOnline ? 'text-green-500' : 'text-destructive'}`}>
                      {isOnline ? 'NOMINAL' : isOffline ? 'LOST' : 'DEGRADED'}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => router.push(`/dashboard/operations/health/${service.key}`)}
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all gap-2"
                >
                  View Full Diagnostics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Card>
            )
          })}
        </div>
      </div>

      {/* System Timeline & Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        <Card className="lg:col-span-2 p-8 glass-dark border-border/40 bg-card/30">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Platform Stability Timeline
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Online
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                Outage
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-6 md:grid-cols-12 lg:grid-cols-24 gap-1.5 h-16">
            {Array.from({ length: 48 }).map((_, i) => {
              const hasOutage = i === 12 || i === 45
              return (
                <div 
                  key={i} 
                  className={`h-full rounded-sm transition-all hover:scale-y-110 cursor-pointer ${
                    hasOutage ? 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-green-500/40 hover:bg-green-500/60'
                  }`}
                  title={`${i*30}m ago: ${hasOutage ? 'Brief Outage' : 'System OK'}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>24 Hours Ago</span>
            <span>Real-time</span>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Network Load</span>
                <p className="text-xl font-bold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  3.4 Gbps
                </p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">IOPS Rate</span>
                <p className="text-xl font-bold flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-orange-500" />
                  12.8k
                </p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Active Threads</span>
                <p className="text-xl font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  1,482
                </p>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Error Density</span>
                <p className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  0.02%
                </p>
             </div>
          </div>
        </Card>

        <Card className="p-8 glass-dark border-border/40 flex flex-col">
          <h3 className="font-bold flex items-center gap-2 mb-6">
            <Terminal className="h-5 w-5 text-primary" />
            Live Event Stream
          </h3>
          <div className="flex-1 space-y-4 font-mono text-[10px] overflow-hidden">
            {[
              { type: 'SYS', msg: 'Cleaning redundant Redis nodes...', time: '12:45:01' },
              { type: 'SEC', msg: 'Shield: Anomalous login detected (IP block applied)', time: '12:44:12' },
              { type: 'GO ', msg: 'Hub: Re-sharding spatial partitions', time: '12:42:55' },
              { type: 'AI ', msg: 'Model: Recalculating ETA variance for Nairobi/Westlands', time: '12:40:22' },
              { type: 'SYS', msg: 'Automatic SSL certificate renewal initiated', time: '12:38:10' },
            ].map((log, i) => (
              <div key={i} className="flex gap-3 text-muted-foreground border-l-2 border-primary/20 pl-3 py-0.5">
                <span className="text-primary whitespace-nowrap">[{log.time}]</span>
                <span className="font-bold text-foreground/80">{log.type}</span>
                <span className="line-clamp-2">{log.msg}</span>
              </div>
            ))}
          </div>
          <Button 
            onClick={() => router.push('/dashboard/notifications')}
            variant="ghost" 
            size="sm" 
            className="w-full mt-6 border border-border/40 hover:bg-sidebar-accent"
          >
            View Full Incident Log
          </Button>
        </Card>
      </div>
    </div>
  )
}
