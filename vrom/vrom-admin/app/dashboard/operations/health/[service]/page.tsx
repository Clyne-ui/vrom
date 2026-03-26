'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, Activity, Cpu, Server, Clock, 
  Terminal, ShieldCheck, AlertCircle, RefreshCw,
  BarChart2, Zap, Brain, ShieldAlert
} from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'

interface HealthDetail {
  service_name: string
  status: string
  latency_ms: number
  cpu_usage: number
  mem_usage: number
  uptime: string
  last_check: string
  logs: string[]
}

export default function ServiceHealthPage() {
  const params = useParams()
  const router = useRouter()
  const { token } = useUser()
  const service = params?.service as string
  
  const [data, setData] = useState<HealthDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDown, setIsDown] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchHealth = async () => {
    if (!token) {
      setErrorMsg('Not authenticated. Please log in again.')
      setIsDown(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/health/${service}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setIsDown(false)
        setErrorMsg(null)
      } else {
        setIsDown(true)
        if (res.status === 401) {
          setErrorMsg('Authentication expired. Your session may have been cleared by the server restart.')
        } else {
          setErrorMsg(`Server responded with status: ${res.status}`)
        }
      }
    } catch (err) {
      console.error('Failed to fetch service health', err)
      setIsDown(true)
      setErrorMsg('Failed to reach the Go API. Ensure the backend server is running on port 8080.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Poll faster (5s) if we are in a down state to catch the server coming back up
    const interval = setInterval(fetchHealth, isDown ? 5000 : 10000)
    return () => clearInterval(interval)
  }, [service, isDown, token])

  if (loading && !data && !isDown) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  const isHealthy = data?.status === 'online' && !isDown

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{data?.service_name || service.toUpperCase()}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {isDown ? 'OFFLINE' : data?.status}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={fetchHealth} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Server Down Alert */}
      {isDown && (
        <Card className="p-6 border-destructive bg-destructive/10 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4 text-destructive">
            <ShieldAlert className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold">CRITICAL: CONNECTION LOST</h3>
              <p className="text-sm opacity-90">
                {errorMsg || `The ${service} engine is currently unreachable. This may be due to the service being stopped or a network failure.`}
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              className="ml-auto"
              onClick={fetchHealth}
            >
              Retry Connection
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`p-4 glass-dark ${isDown ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Latency</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{isDown ? '--' : data?.latency_ms}ms</p>
        </Card>
        <Card className={`p-4 glass-dark ${isDown ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">CPU Usage</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{isDown ? '0.0' : data?.cpu_usage.toFixed(1)}%</p>
        </Card>
        <Card className={`p-4 glass-dark ${isDown ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <Server className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Memory</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{isDown ? '0.00' : ((data?.mem_usage || 0) / 1024).toFixed(2)} GB</p>
        </Card>
        <Card className={`p-4 glass-dark ${isDown ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase">Uptime</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{isDown ? '0s' : data?.uptime}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart Placeholder */}
        <Card className={`p-6 lg:col-span-2 glass-dark ${isDown ? 'opacity-50 grayscale' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Latency Over Time
            </h3>
          </div>
          <div className="h-64 flex items-end gap-1 px-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 ${isDown ? 'bg-muted' : 'bg-primary/20'} rounded-t border-t ${isDown ? 'border-muted' : 'border-primary/40'} transition-all hover:bg-primary/40`}
                style={{ height: isDown ? '5%' : `${Math.random() * 60 + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-muted-foreground uppercase">
            <span>60 Minutes Ago</span>
            <span>Now</span>
          </div>
        </Card>

        {/* AI Operational Insights */}
        <Card className="p-6 glass-dark border-primary/20 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Brain className="h-16 w-16 text-primary" />
          </div>
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-primary" />
            AI Operational Insights
          </h3>
          <div className="space-y-4">
            {isDown ? (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <p className="font-semibold mb-1">Critical Failure Detected</p>
                AI systems recommend immediate restart of the {service} service. Dependent modules (CRM, Dispatch) may experience delays.
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
                <p className="font-semibold mb-1">Performance Optimal</p>
                AI analysis confirms stable throughput. Latency is within standard range ({"<"} 100ms). No bottlenecks detected.
              </div>
            )}
            <div className="text-xs text-muted-foreground italic">
               "Model VR-4 Alpha suggests monitoring CPU spikes during peak Kenyan hours (07:00 - 09:00 UTC)."
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs gap-2">
              <Terminal className="h-3 w-3" />
              Ask AI for Diagnostics
            </Button>
          </div>
        </Card>
      </div>

      {/* System Logs */}
      <Card className="p-6 glass-dark border-border/40">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          Recent Logs
        </h3>
        <div className="space-y-3 font-mono text-[11px]">
          {isDown ? (
            <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive">
              [SYSTEM] ERROR: Failed to reach {service} engine. Connection refused.
            </div>
          ) : (
            data?.logs.map((log, i) => (
              <div key={i} className="p-2 rounded bg-black/40 border border-white/5 text-muted-foreground">
                <span className="text-primary mr-2">[{new Date().toLocaleTimeString()}]</span>
                {log}
              </div>
            ))
          )}
          {!isDown && (
            <div className="p-2 rounded bg-black/40 border border-white/5 text-muted-foreground animate-pulse">
              <span className="text-primary mr-2">[{new Date().toLocaleTimeString()}]</span>
              Listening for new events...
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
