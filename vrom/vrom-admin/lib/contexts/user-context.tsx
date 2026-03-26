'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { User, UserRole, RegionCode, UserContext as UserContextType } from '@/lib/types'

const UserContext = createContext<UserContextType | undefined>(undefined)

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
// Refresh 1 minute before the 15-min access token expires
const REFRESH_INTERVAL_MS = 14 * 60 * 1000

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [region, setRegionState] = useState<RegionCode>('global')
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Persist access token ──────────────────────────────
  const persistToken = (t: string) => {
    setTokenState(t)
    localStorage.setItem('vrom_session_token', t)
  }

  // ── Silent background refresh ─────────────────────────
  const silentRefresh = async () => {
    const refreshToken = localStorage.getItem('vrom_refresh_token')
    if (!refreshToken) return

    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.access_token) {
          persistToken(data.access_token)
          console.log('[Auth] Access token silently refreshed ✅')
        }
      } else {
        // Refresh token expired — force re-login
        console.warn('[Auth] Refresh token expired. Logging out.')
        clearSession()
        window.location.href = '/login'
      }
    } catch {
      console.warn('[Auth] Refresh fetch failed — server may be restarting.')
    }
  }

  const clearSession = () => {
    localStorage.removeItem('vrom_session_token')
    localStorage.removeItem('vrom_refresh_token')
    localStorage.removeItem('vrom_user')
    setTokenState(null)
    setUserState(null)
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
  }

  // ── Start refresh loop ────────────────────────────────
  const startRefreshLoop = () => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    refreshTimerRef.current = setInterval(silentRefresh, REFRESH_INTERVAL_MS)
  }

  // ── Load from localStorage on mount ──────────────────
  useEffect(() => {
    const userSession = localStorage.getItem('vrom_user')
    const sessionToken = localStorage.getItem('vrom_session_token')
    const refreshToken = localStorage.getItem('vrom_refresh_token')

    if (sessionToken) setTokenState(sessionToken)

    if (userSession) {
      try {
        const parsedUser = JSON.parse(userSession)
        setUserState(parsedUser)
        if (parsedUser.role === 'super_admin') setRegionState('global')
        else if (parsedUser.region) setRegionState(parsedUser.region)
      } catch {}
    }

    // If we have a refresh token, start the background loop immediately
    if (refreshToken) startRefreshLoop()

    setIsLoading(false)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [])

  // ── setUser — called after successful login ───────────
  const setUser = (newUser: User, newToken?: string, refreshToken?: string) => {
    setUserState(newUser)
    localStorage.setItem('vrom_user', JSON.stringify(newUser))

    if (newToken) persistToken(newToken)
    if (refreshToken) {
      localStorage.setItem('vrom_refresh_token', refreshToken)
      startRefreshLoop()
    }

    if (newUser.role === 'super_admin') setRegionState('global')
    else if (newUser.region) setRegionState(newUser.region)
  }

  const setRegion = (newRegion: RegionCode) => {
    if (user?.role === 'super_admin' || user?.regions?.includes(newRegion)) {
      setRegionState(newRegion)
    }
  }

  const switchRegion = (newRegion: RegionCode) => { setRegion(newRegion) }

  const canManageRegion = (regionCode: RegionCode): boolean => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (user.role === 'regional_admin' && user.region === regionCode) return true
    return false
  }

  const canAccessRegions = (): RegionCode[] => {
    if (!user) return []
    if (user.role === 'super_admin') return ['global', 'kenya', 'nigeria', 'uganda', 'tanzania']
    if (user.region) return [user.region]
    return []
  }

  const value: UserContextType = {
    user, region, token, isLoading,
    role: user?.role || 'operator',
    setUser, setRegion, switchRegion, canManageRegion, canAccessRegions,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within UserProvider')
  return context
}
