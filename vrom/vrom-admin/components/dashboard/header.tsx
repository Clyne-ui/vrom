'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun, Bell, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface SystemStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  ping: number
}

export function Header() {
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([
    { name: 'Go Engine', status: 'online', ping: 12 },
    { name: 'Rust Matcher', status: 'online', ping: 8 },
    { name: 'Python AI', status: 'online', ping: 45 },
  ])

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

  // Simulate ping updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev =>
        prev.map(status => ({
          ...status,
          ping: Math.floor(Math.random() * 100),
        }))
      )
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="border-b border-border bg-card glass-dark h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6 flex-1">
        <h2 className="text-sm font-semibold text-foreground hidden sm:block">
          Operations Dashboard
        </h2>

        {/* System Status Badges */}
        <div className="flex items-center gap-2 ml-auto md:ml-4">
          {systemStatus.map((system) => (
            <div
              key={system.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs"
              title={`${system.name} - ${system.ping}ms`}
            >
              <div
                className={`h-2 w-2 rounded-full animate-pulse ${
                  system.status === 'online'
                    ? 'bg-green-500'
                    : system.status === 'degraded'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-foreground font-medium hidden sm:inline">
                {system.name.split(' ')[0]}
              </span>
              <span className="text-muted-foreground text-xs hidden lg:inline">
                {system.ping}ms
              </span>
            </div>
          ))}
        </div>
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

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 relative"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          title="Logout"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
