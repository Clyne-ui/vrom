'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole, RegionCode, UserContext as UserContextType } from '@/lib/types'

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [region, setRegionState] = useState<RegionCode>('global')
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const userSession = localStorage.getItem('vrom_user')
    if (userSession) {
      try {
        const parsedUser = JSON.parse(userSession)
        setUserState(parsedUser)
        
        // Set initial region based on user role
        if (parsedUser.role === 'super_admin') {
          setRegionState('global')
        } else if (parsedUser.region) {
          setRegionState(parsedUser.region)
        }
      } catch (err) {
        console.log('[v0] Error parsing user session:', err)
      }
    }
    setIsLoading(false)
  }, [])

  const setUser = (newUser: User) => {
    setUserState(newUser)
    localStorage.setItem('vrom_user', JSON.stringify(newUser))
    
    // Auto-set region based on role
    if (newUser.role === 'super_admin') {
      setRegionState('global')
    } else if (newUser.region) {
      setRegionState(newUser.region)
    }
  }

  const setRegion = (newRegion: RegionCode) => {
    if (user?.role === 'super_admin' || user?.regions?.includes(newRegion)) {
      setRegionState(newRegion)
    }
  }

  const switchRegion = (newRegion: RegionCode) => {
    setRegion(newRegion)
  }

  const canManageRegion = (regionCode: RegionCode): boolean => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    if (user.role === 'regional_admin' && user.region === regionCode) return true
    return false
  }

  const canAccessRegions = (): RegionCode[] => {
    if (!user) return []
    if (user.role === 'super_admin') {
      return ['global', 'kenya', 'nigeria', 'uganda', 'tanzania']
    }
    if (user.region) return [user.region]
    return []
  }

  const value: UserContextType = {
    user,
    region,
    role: user?.role || 'operator',
    isLoading,
    setUser,
    setRegion,
    switchRegion,
    canManageRegion,
    canAccessRegions,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
