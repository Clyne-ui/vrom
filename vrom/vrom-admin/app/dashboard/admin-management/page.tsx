'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  UserCog, Plus, Trash2, Lock, Unlock, Globe, ShieldCheck,
  Search, MapPin, Mail, User
} from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { REGION_LIST } from '@/lib/regions'
import { RegionCode, UserRole } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface AdminAccount {
  id: string
  name: string
  email: string
  role: UserRole
  region: RegionCode
  status: 'active' | 'suspended'
  createdAt: string
  lastLogin: string
}

const DEMO_ADMINS: AdminAccount[] = [
  { id: '1', name: 'Clyne Mwangi', email: 'clyne@vrom.io', role: 'regional_admin', region: 'kenya', status: 'active', createdAt: '2025-01-15', lastLogin: '2026-03-23' },
  { id: '2', name: 'Emeka Okafor', email: 'emeka@vrom.io', role: 'regional_admin', region: 'nigeria', status: 'active', createdAt: '2025-02-01', lastLogin: '2026-03-22' },
  { id: '3', name: 'Sarah Nakato', email: 'sarah@vrom.io', role: 'regional_admin', region: 'uganda', status: 'active', createdAt: '2025-03-10', lastLogin: '2026-03-21' },
  { id: '4', name: 'James Mwanachuma', email: 'james@vrom.io', role: 'regional_admin', region: 'tanzania', status: 'suspended', createdAt: '2025-04-05', lastLogin: '2026-03-18' },
]

const REGION_FLAGS: Record<RegionCode, string> = {
  kenya: '🇰🇪', nigeria: '🇳🇬', uganda: '🇺🇬', tanzania: '🇹🇿', global: '🌍',
}

const REGION_COLORS: Record<RegionCode, string> = {
  kenya: 'bg-blue-500/20 text-blue-400',
  nigeria: 'bg-purple-500/20 text-purple-400',
  uganda: 'bg-green-500/20 text-green-400',
  tanzania: 'bg-orange-500/20 text-orange-400',
  global: 'bg-slate-500/20 text-slate-400',
}

export default function AdminManagementPage() {
  const { role } = useUser()
  const router = useRouter()

  // Super admin guard
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

  const [admins, setAdmins] = useState<AdminAccount[]>(DEMO_ADMINS)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    name: '', email: '', password: '', region: 'kenya' as RegionCode,
  })
  const [createError, setCreateError] = useState('')

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.region.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => {
    setCreateError('')
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      setCreateError('All fields are required.')
      return
    }
    const admin: AdminAccount = {
      id: Date.now().toString(),
      name: newAdmin.name,
      email: newAdmin.email,
      role: 'regional_admin',
      region: newAdmin.region,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: '—',
    }
    setAdmins(prev => [admin, ...prev])
    setNewAdmin({ name: '', email: '', password: '', region: 'kenya' })
    setShowCreateForm(false)
  }

  const toggleStatus = (id: string) => {
    setAdmins(prev => prev.map(a =>
      a.id === id ? { ...a, status: a.status === 'active' ? 'suspended' : 'active' } : a
    ))
  }

  const deleteAdmin = (id: string) => {
    setAdmins(prev => prev.filter(a => a.id !== id))
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
              <label className="text-sm font-medium text-foreground">Temporary Password</label>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                value={newAdmin.password}
                onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assign Region</label>
              <select
                value={newAdmin.region}
                onChange={e => setNewAdmin(p => ({ ...p, region: e.target.value as RegionCode }))}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm"
              >
                {REGION_LIST.map(r => (
                  <option key={r.code} value={r.code}>
                    {REGION_FLAGS[r.code]} {r.name}, {r.country}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {createError && (
            <p className="text-sm text-destructive mt-3">{createError}</p>
          )}
          <div className="flex gap-3 mt-5">
            <Button onClick={handleCreate} className="gap-2">
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
          { label: 'Active', value: admins.filter(a => a.status === 'active').length, icon: Globe, color: 'text-green-500' },
          { label: 'Suspended', value: admins.filter(a => a.status === 'suspended').length, icon: Lock, color: 'text-red-500' },
          { label: 'Regions Covered', value: new Set(admins.map(a => a.region)).size, icon: MapPin, color: 'text-orange-500' },
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Login</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No admins found.
                  </td>
                </tr>
              )}
              {filtered.map(admin => (
                <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{admin.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {admin.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${REGION_COLORS[admin.region]}`}>
                      {REGION_FLAGS[admin.region]} {admin.region.charAt(0).toUpperCase() + admin.region.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      admin.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${admin.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {admin.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{admin.lastLogin}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8"
                        onClick={() => toggleStatus(admin.id)}
                        title={admin.status === 'active' ? 'Suspend' : 'Reinstate'}
                      >
                        {admin.status === 'active'
                          ? <><Lock className="h-3.5 w-3.5" /> Suspend</>
                          : <><Unlock className="h-3.5 w-3.5" /> Reinstate</>
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => deleteAdmin(admin.id)}
                        title="Remove admin"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
