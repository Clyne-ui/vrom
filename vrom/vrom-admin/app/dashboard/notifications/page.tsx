'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Bell, Info, AlertTriangle, AlertCircle, 
  CheckCircle, Trash2, Search, RefreshCw,
  Calendar, ArrowLeft, CheckCheck, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/contexts/user-context'
import { useOCCWebSocket } from '@/lib/hooks/use-occ-websocket'

interface SystemNotification {
  id: string
  type: 'info' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const { token } = useUser()
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'info' | 'warning' | 'error'>('all')
  const [search, setSearch] = useState('')

  // ── API helpers ──────────────────────────────────
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${apiUrl}/occ/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const json = await res.json()
      setNotifications(json || [])
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend')
    } finally {
      setLoading(false)
    }
  }, [token, apiUrl])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // ── WebSocket: receive incoming live notifications ──
  const { data: wsData } = useOCCWebSocket('notifications')
  useEffect(() => {
    if (wsData?.event === 'new_notification' && wsData.notification) {
      setNotifications(prev => [wsData.notification as SystemNotification, ...prev])
    }
  }, [wsData])

  // ── CRUD Actions ──────────────────────────────────
  const markAsRead = async (id: string) => {
    // optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch(`${apiUrl}/occ/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {})
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch(`${apiUrl}/occ/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {})
  }

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await fetch(`${apiUrl}/occ/notifications/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {})
  }

  const clearAll = async () => {
    setNotifications([])
    await fetch(`${apiUrl}/occ/notifications/clear`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {})
  }

  // ── Derived list ──────────────────────────────────
  const filtered = notifications.filter(n => {
    const matchType = filter === 'all' ? true : filter === 'unread' ? !n.read : n.type === filter
    const matchSearch = search === '' || n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const typeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':   return <AlertCircle   className="h-5 w-5 text-red-500"    />
      case 'info':    return <Info          className="h-5 w-5 text-blue-500"   />
      default:        return <Bell          className="h-5 w-5 text-primary"    />
    }
  }

  const typeBadge = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-500/15 text-yellow-500'
      case 'error':   return 'bg-red-500/15 text-red-500'
      default:        return 'bg-blue-500/15 text-blue-500'
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-7 w-7 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm font-semibold bg-primary text-primary-foreground rounded-full px-2.5 py-0.5">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time platform alerts from all engine services.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchNotifications}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10" onClick={clearAll} disabled={notifications.length === 0}>
            <X className="h-4 w-4" /> Clear all
          </Button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Connection Error</p>
            <p className="text-xs opacity-80">{error}. Make sure the Go backend is running.</p>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={fetchNotifications}>Retry</Button>
        </div>
      )}

      {/* ── Filters & Search ── */}
      <div className="flex flex-wrap gap-4 items-center justify-between p-4 glass-dark rounded-xl border border-white/5">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'unread', 'info', 'warning', 'error'] as const).map(f => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-primary/20 text-primary' : ''}
            >
              {f === 'unread' && unreadCount > 0 ? `Unread (${unreadCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none text-sm outline-none w-48 text-foreground"
          />
        </div>
      </div>

      {/* ── Notification List ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Bell className="h-8 w-8 text-primary/40 animate-bounce" />
            <p className="text-sm text-muted-foreground">Loading from server...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <CheckCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {notifications.length === 0 ? "You're all caught up!" : "No matching alerts"}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {notifications.length === 0
                  ? "No notifications in the database yet. They will appear here when a service event occurs."
                  : "Try changing your filter or search term."}
              </p>
            </div>
          </Card>
        ) : (
          filtered.map(n => (
            <Card
              key={n.id}
              className={`p-4 transition-all hover:bg-white/5 border-l-4 group ${
                !n.read ? 'bg-primary/5 border-l-primary' : 'border-l-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${typeBadge(n.type)}`}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className={`font-bold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </h4>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeBadge(n.type)}`}>
                        {n.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="hover:text-primary transition-colors font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
