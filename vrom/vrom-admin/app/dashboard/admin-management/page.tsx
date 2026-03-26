'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  UserCog, Plus, Trash2, Lock, Unlock, Globe, ShieldCheck,
  Search, MapPin, Mail, User
} from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { useRouter } from 'next/navigation'

interface AdminAccount {
  user_id: string
  full_name: string
  email: string
  role: string
  assigned_region: string
  is_verified: boolean
  created_at: string
}

interface DBRegion {
  id: string
  name: string
  country: string
}

export default function AdminManagementPage() {
  const { role, token } = useUser()
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [regions, setRegions] = useState<DBRegion[]>([])
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [newAdmin, setNewAdmin] = useState({
    name: '', email: '', password: '', phone_number: '', region: ''
  })
  const [createError, setCreateError] = useState('')

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/occ/crm/search?role=regional_admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAdmins(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err)
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  const fetchRegions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/occ/regions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const regs = Array.isArray(data) ? data : []
        setRegions(regs)
        if (regs.length > 0 && !newAdmin.region) {
          setNewAdmin(p => ({ ...p, region: regs[0].id }))
        }
      }
    } catch (err) {
      console.error('Failed to fetch regions:', err)
    }
  }, [API_URL, token, newAdmin.region])

  useEffect(() => {
    if (role === 'super_admin') {
      fetchAdmins()
      fetchRegions()
    }
  }, [role, fetchAdmins, fetchRegions])

  if (role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldCheck className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm">
          Only Super Admins can manage admin accounts.
        </p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  const filtered = admins.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.assigned_region?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    setCreateError('')
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password || !newAdmin.region || !newAdmin.phone_number) {
      setCreateError('All fields are required.')
      return
    }

    try {
      const res = await fetch(`${API_URL}/occ/admins`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: newAdmin.name,
          email: newAdmin.email,
          phone_number: newAdmin.phone_number,
          password: newAdmin.password,
          role: 'regional_admin',
          assigned_region: newAdmin.region
        })
      })

      if (res.ok) {
        await fetchAdmins()
        setNewAdmin({ name: '', email: '', phone_number: '', password: '', region: regions[0]?.id || '' })
        setShowCreateForm(false)
      } else {
        const errData = await res.text()
        setCreateError(errData || 'Failed to create admin')
      }
    } catch (err) {
      setCreateError('Network error occurred.')
    }
  }

  const toggleStatus = async (id: string, currentlyVerified: boolean) => {
    try {
      const endpoint = currentlyVerified ? 'suspend' : 'unsuspend'
      const res = await fetch(`${API_URL}/occ/admin/${endpoint}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: id })
      })

      if (res.ok) {
        setAdmins(prev => prev.map(a =>
          a.user_id === id ? { ...a, is_verified: !currentlyVerified } : a
        ))
      }
    } catch (err) {
      console.error('Failed to toggle status', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="h-7 w-7 text-primary" /> Admin Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage regional admin accounts. Assign each admin to their region.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showCreateForm ? 'Cancel' : 'Create New Admin'}
        </Button>
      </div>

      {/* Create Admin Form */}
      {showCreateForm && (
        <Card className="p-6 glass-dark border-primary/30 bg-primary/5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Regional Admin
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input
                placeholder="e.g. Clyne Mwangi"
                value={newAdmin.name}
                onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <Input
                type="email"
                placeholder="e.g. clyne@vrom.io"
                value={newAdmin.email}
                onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <Input
                type="text"
                placeholder="e.g. +254700000000"
                value={newAdmin.phone_number}
                onChange={e => setNewAdmin(p => ({ ...p, phone_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Temporary Password</label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={newAdmin.password}
                onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Assign Region</label>
              <select
                value={newAdmin.region}
                onChange={e => setNewAdmin(p => ({ ...p, region: e.target.value }))}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm"
              >
                {regions.map(r => (
                  <option key={r.id} value={r.id}>
                    🌍 {r.name}, {r.country}
                  </option>
                ))}
                {regions.length === 0 && <option disabled>No regions available. Create one first.</option>}
              </select>
            </div>
          </div>
          {createError && (
            <p className="text-sm text-destructive mt-3">{createError}</p>
          )}
          <div className="flex gap-3 mt-5">
            <Button onClick={handleCreate} className="gap-2" disabled={regions.length === 0}>
              <ShieldCheck className="h-4 w-4" /> Create Admin Account
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            This admin will be locked to their assigned region and cannot access other regions.
          </p>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Admins', value: admins.length, icon: UserCog, color: 'text-primary' },
          { label: 'Active', value: admins.filter(a => a.is_verified).length, icon: Globe, color: 'text-green-500' },
          { label: 'Suspended', value: admins.filter(a => !a.is_verified).length, icon: Lock, color: 'text-red-500' },
          { label: 'Regions Covered', value: new Set(admins.map(a => a.assigned_region)).size, icon: MapPin, color: 'text-orange-500' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-4 glass-dark">
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email or region..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Admin Table */}
      <Card className="glass-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Region</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created At</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                 <tr>
                 <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                   Loading admins...
                 </td>
               </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No admins found.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(admin => {
                const regionMatches = regions.find(r => r.id === admin.assigned_region)
                const regionName = regionMatches ? `${regionMatches.name}, ${regionMatches.country}` : (admin.assigned_region || 'Unassigned')
                return (
                  <tr key={admin.user_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{admin.full_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {admin.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                        🌍 {regionName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        admin.is_verified
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${admin.is_verified ? 'bg-green-500' : 'bg-red-500'}`} />
                        {admin.is_verified ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8"
                          onClick={() => toggleStatus(admin.user_id, admin.is_verified)}
                          title={admin.is_verified ? 'Suspend' : 'Reinstate'}
                        >
                          {admin.is_verified
                            ? <><Lock className="h-3.5 w-3.5" /> Suspend</>
                            : <><Unlock className="h-3.5 w-3.5" /> Reinstate</>
                          }
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
