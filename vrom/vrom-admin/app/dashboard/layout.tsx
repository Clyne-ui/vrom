'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { apiClient } from '@/lib/api-client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const userSession = localStorage.getItem('vrom_user')
        const sessionToken = localStorage.getItem('vrom_session_token')

        if (!userSession || !sessionToken) {
          router.push('/login')
          setIsLoading(false)
          return
        }

        // Verify with real backend
        await apiClient.me()
        setIsAuthenticated(true)
      } catch (err) {
        console.error('Auth verification failed:', err)
        localStorage.removeItem('vrom_user')
        localStorage.removeItem('vrom_session_token')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
