'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { UserRole, RegionCode } from '@/lib/types'
import { REGIONS } from '@/lib/regions'
import { useUser } from '@/lib/contexts/user-context'

const DEMO_USERS = [
  { email: 'admin@vrom.io', role: 'super_admin' as UserRole, region: 'global' as RegionCode, name: 'Super Admin' },
  { email: 'nairobi@vrom.io', role: 'regional_admin' as UserRole, region: 'kenya' as RegionCode, name: 'Nairobi Admin' },
  { email: 'lagos@vrom.io', role: 'regional_admin' as UserRole, region: 'nigeria' as RegionCode, name: 'Lagos Admin' },
  { email: 'kampala@vrom.io', role: 'regional_admin' as UserRole, region: 'uganda' as RegionCode, name: 'Kampala Admin' },
]

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('regional_admin')
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('kenya')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleQuickLogin = async (demoUser: typeof DEMO_USERS[0]) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoUser.email, password: 'password123' }),
      })
      
      const data = await res.json()
      if (res.ok && data.access_token) {
        const assignedRegion = data.user.role === 'admin' ? 'global' : (data.user.assigned_region || demoUser.region)
        const user = {
          id: data.user.user_id,
          email: data.user.email,
          name: data.user.full_name,
          role: data.user.role === 'admin' ? 'super_admin' : 'regional_admin',
          region: assignedRegion,
          regions: data.user.role === 'admin' 
            ? ['global', 'kenya', 'nigeria', 'uganda', 'tanzania'] 
            : [assignedRegion],
          loginTime: new Date().toISOString()
        }
        
        localStorage.setItem('vrom_session_token', data.access_token)
        if (data.refresh_token) localStorage.setItem('vrom_refresh_token', data.refresh_token)
        setUser(user, data.access_token, data.refresh_token)
        router.push('/dashboard')
      } else {
        setError(data.message || 'Quick login failed')
      }
    } catch (err) {
      setError('Connection to backend failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      
      if (res.ok && data.access_token) {
        const assignedRegion = data.user.role === 'admin' ? 'global' : (data.user.assigned_region || selectedRegion)
        const user = {
          id: data.user.user_id,
          email: data.user.email,
          name: data.user.full_name,
          role: data.user.role === 'admin' ? 'super_admin' : 'regional_admin',
          region: assignedRegion,
          regions: data.user.role === 'admin'
            ? ['global', 'kenya', 'nigeria', 'uganda', 'tanzania']
            : [assignedRegion],
          loginTime: new Date().toISOString()
        }
        
        localStorage.setItem('vrom_session_token', data.access_token)
        if (data.refresh_token) localStorage.setItem('vrom_refresh_token', data.refresh_token)
        setUser(user, data.access_token, data.refresh_token)
        router.push('/dashboard')
      } else {
        setError(data.message || 'Invalid email or password')
      }
    } catch (err) {
      setError('Connection to backend failed. Please ensure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vrom%20logo%20transparen-hs31Teidv5LhajHyiL3YSpt6yTesQe.png"
              alt="Vrom Logo"
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Vrom OCC</h1>
          <p className="text-muted-foreground">Operations Command Center</p>
        </div>

        {/* Quick Login Buttons */}
        <div className="mb-6 space-y-2">
          <p className="text-xs text-muted-foreground px-2 font-medium">Quick Login - Demo Users</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleQuickLogin(user)}
                className="p-3 rounded-lg border border-border hover:bg-card/50 transition-colors text-left"
              >
                <div className="text-xs font-medium text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.region === 'global' ? 'Super Admin' : user.region.charAt(0).toUpperCase() + user.region.slice(1)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <Card className="p-8 glass-dark">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Demo Mode Notice */}
            <div className="flex gap-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-primary">Demo Mode: Create custom accounts with role & region assignment</p>
            </div>

            {error && (
              <div className="flex gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="admin@vrom.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Advanced Options */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary hover:underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} Role & Region Options
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-card/50 rounded-lg border border-border">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    User Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm"
                  >
                    <option value="super_admin">Super Admin (All Regions)</option>
                    <option value="regional_admin">Regional Admin (Single Region)</option>
                  </select>
                </div>

                {selectedRole !== 'super_admin' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Assigned Region
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value as RegionCode)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm"
                    >
                      <option value="kenya">Nairobi, Kenya</option>
                      <option value="nigeria">Lagos, Nigeria</option>
                      <option value="uganda">Kampala, Uganda</option>
                      <option value="tanzania">Dar es Salaam, Tanzania</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <p>Demo Account</p>
            <p className="font-mono text-xs mt-2">admin@vrom.io / password123</p>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Vrom Operations Command Center © 2024
        </p>
      </div>
    </div>
  )
}
