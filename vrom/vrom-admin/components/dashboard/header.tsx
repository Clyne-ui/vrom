'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun, Bell, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'
import { useUser } from '@/lib/contexts/user-context'

interface SystemStatus {
  name: string
  key: string
  status: 'online' | 'offline' | 'degraded'
  ping: number
}

export function Header() {
  const router = useRouter()
  const { role } = useUser()
  const [isDark, setIsDark] = useState(false)
  
  // Real-time Health Monitoring
  const { data: healthData, status: wsStatus } = useOCCWebSocket('health')
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([
    { name: 'Go Engine', key: 'go', status: 'online', ping: 12 },
    { name: 'Rust Matcher', key: 'rust', status: 'online', ping: 8 },
    { name: 'Python AI', key: 'python', status: 'online', ping: 45 },
  ])

  useEffect(() => {
    // If we're disconnected, set all to offline
    if (wsStatus === 'disconnected') {
      setSystemStatus(prev => prev.map(s => ({ ...s, status: 'offline', ping: -1 })))
      return
    }

    // If we're connecting, we might have last-known data, so don't clear it immediately
    // unless it's the initial load.
    
    if (healthData) {
      setSystemStatus([
        { name: 'Go Engine', key: 'go', status: (healthData.go_status || 'online') as any, ping: healthData.go_api_ms || 0 },
        { name: 'Rust Matcher', key: 'rust', status: (healthData.rust_status || 'online') as any, ping: healthData.rust_ms || 0 },
        { name: 'Python AI', key: 'python', status: (healthData.python_status || 'online') as any, ping: healthData.python_ms || 0 },
      ])
    }
  }, [healthData, wsStatus])

  useEffect(() => {
    const html = document.documentElement
    setIsDark(html.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      setIsDark(false)
    } else {
      html.classList.add('dark')
      setIsDark(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('vrom_user')
    localStorage.removeItem('vrom_session_token')
    router.push('/login')
  }

  return (
    <header className="border-b border-border bg-card glass-dark h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6 flex-1">
        <Link href="/dashboard/operations">
          <h2 className="text-sm font-semibold text-foreground hidden sm:block hover:text-primary transition-colors cursor-pointer">
            Operations Dashboard
          </h2>
        </Link>

        {/* System Status Badges */}
        {role === 'super_admin' && (
          <div className="flex items-center gap-2 ml-auto md:ml-4">
            {systemStatus.map((system) => (
              <Link
                key={system.name}
                href={`/dashboard/operations/health/${system.key}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs hover:border-primary/50 transition-all cursor-pointer"
                title={`${system.name} - ${system.ping}ms`}
              >
                <div
                  className={`h-2 w-2 rounded-full animate-pulse ${
                    system.status === 'online'
                      ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                      : system.status === 'degraded'
                        ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  }`}
                />
                <span className="text-foreground font-medium hidden sm:inline">
                  {system.name.split(' ')[0]}
                </span>
                <span className="text-muted-foreground text-xs hidden lg:inline">
                  {system.ping}ms
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-10 w-10"
          title="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <Link href="/dashboard/notifications">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 relative"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          </Button>
        </Link>

        <Link href="/dashboard/settings?tab=notifications">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:text-destructive transition-colors"
          title="Logout"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
