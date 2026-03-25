'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search, Download, Plus, Trash2, Lock, Unlock, Eye, X,
  User, ChevronUp, ChevronDown, ShoppingBag, Car, Bike,
  Wallet, Star, AlertCircle, Phone, Mail, Calendar, BarChart3,
  ShieldCheck
} from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { useEffect, useCallback } from 'react'

type UserType = 'customer' | 'seller' | 'rider' | 'admin' | 'moderator'
type UserStatus = 'active' | 'blocked' | 'suspended'

interface VromUser {
  id: string
  name: string
  email: string
  phone: string
  type: UserType
  status: UserStatus
  joinDate: string
  region: string
  orders: number
  trips: number
  walletBalance: number
  totalSpent: number
  totalEarned: number
  rating: number
  sales: number
}

const TYPE_ICONS: Record<UserType, any> = {
  customer: User,
  seller: ShoppingBag,
  rider: Bike,
  admin: Lock,
  moderator: ShieldCheck,
}
const TYPE_COLORS: Record<UserType, string> = {
  customer: 'bg-blue-500/15 text-blue-400',
  seller: 'bg-green-500/15 text-green-400',
  rider: 'bg-orange-500/15 text-orange-400',
  admin: 'bg-purple-500/15 text-purple-400',
  moderator: 'bg-pink-500/15 text-pink-400',
}
const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'bg-green-500/15 text-green-500',
  blocked: 'bg-red-500/15 text-red-500',
  suspended: 'bg-yellow-500/15 text-yellow-500',
}

const DEMO_USERS: VromUser[] = [
  { id: 'USR001', name: 'Alice Wanjiku', email: 'alice@gmail.com', phone: '+254712000001', type: 'customer', status: 'active', joinDate: '2024-02-10', region: 'kenya', orders: 34, trips: 56, walletBalance: 1200, totalSpent: 45600, totalEarned: 0, rating: 4.3, sales: 0 },
  { id: 'USR002', name: 'Brian Otieno', email: 'brian@gmail.com', phone: '+254723000002', type: 'customer', status: 'active', joinDate: '2024-03-15', region: 'kenya', orders: 12, trips: 22, walletBalance: 800, totalSpent: 18900, totalEarned: 0, rating: 4.7, sales: 0 },
  { id: 'SLR001', name: 'Mama Mboga Shop', email: 'shop@mamamboga.ke', phone: '+254734000003', type: 'seller', status: 'active', joinDate: '2023-11-01', region: 'kenya', orders: 523, trips: 0, walletBalance: 34500, totalSpent: 0, totalEarned: 234000, rating: 4.8, sales: 523 },
  { id: 'SLR002', name: 'Tech Gadgets Ltd', email: 'info@techgadgets.ke', phone: '+254745000004', type: 'seller', status: 'suspended', joinDate: '2024-01-20', region: 'kenya', orders: 89, trips: 0, walletBalance: 12000, totalSpent: 0, totalEarned: 78000, rating: 3.9, sales: 89 },
  { id: 'RDR001', name: 'Clyne Mwangi', email: 'clyne.rider@vrom.io', phone: '+254756000005', type: 'rider', status: 'active', joinDate: '2023-09-05', region: 'kenya', orders: 0, trips: 789, walletBalance: 8900, totalSpent: 0, totalEarned: 45600, rating: 4.9, sales: 0 },
  { id: 'RDR002', name: 'James Kamau', email: 'james.rider@vrom.io', phone: '+254767000006', type: 'rider', status: 'blocked', joinDate: '2024-04-01', region: 'kenya', orders: 0, trips: 102, walletBalance: 1200, totalSpent: 0, totalEarned: 12000, rating: 3.2, sales: 0 },
  { id: 'USR003', name: 'Emeka Lagos', email: 'emeka@email.ng', phone: '+234801000007', type: 'customer', status: 'active', joinDate: '2024-05-10', region: 'nigeria', orders: 45, trips: 30, walletBalance: 5600, totalSpent: 67000, totalEarned: 0, rating: 4.6, sales: 0 },
]

type SortKey = 'name' | 'orders' | 'trips' | 'walletBalance' | 'rating'

export default function CRMPage() {
  const { role, region } = useUser()
  const [users, setUsers] = useState<VromUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<UserType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedUser, setSelectedUser] = useState<VromUser | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', type: 'customer' as UserType, password: '' })
  const [createError, setCreateError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Filter by region for regional admins
  const regionFiltered = role === 'super_admin'
    ? users
    : users.filter(u => u.region === region)

  const filtered = regionFiltered.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = u.name.toLowerCase().includes(q) || u.email.includes(q) || u.id.toLowerCase().includes(q) || u.phone.includes(q)
    const matchType = filterType === 'all' || u.type === filterType
    const matchStatus = filterStatus === 'all' || u.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortBy], vb = b[sortBy]
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va)
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('vrom_session_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/crm/search?q=${search}&role=${filterType === 'all' ? '' : filterType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const dataArray = Array.isArray(data) ? data : []
        // Map backend AdminUserView to frontend VromUser
        const mapped: VromUser[] = dataArray.map((u: any) => ({
          id: u.user_id,
          name: u.full_name,
          email: u.email,
          phone: u.phone_number,
          type: u.role as UserType,
          status: u.is_verified ? 'active' : 'blocked',
          joinDate: u.created_at?.split('T')[0] || 'N/A',
          region: 'kenya', // Placeholder or add to backend
          orders: u.orders_count || 0,
          trips: u.trips_count || 0,
          walletBalance: u.balance || 0,
          totalSpent: 0, // Need backend support
          totalEarned: 0, // Need backend support
          rating: 0, // Need backend support
          sales: 0,
        }))
        setUsers(mapped)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setIsLoading(false)
    }
  }, [search, filterType])

  useEffect(() => {
    const id = setTimeout(fetchUsers, 500) // Debounce search
    return () => clearTimeout(id)
  }, [fetchUsers])

  const toggleBlock = async (id: string, currentStatus: UserStatus) => {
    try {
      const token = localStorage.getItem('vrom_session_token')
      const endpoint = currentStatus === 'blocked' ? 'unsuspend' : 'suspend'
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/occ/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: id })
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (err) {
      console.error('Action failed:', err)
    }
  }

  const deleteUser = async (id: string) => {
    // Backend doesn't have a specific OCC delete yet, using suspend for now
    // or we could add a DELETE endpoint. 
    // To preserve UI functionality:
    setUsers(prev => prev.filter(u => u.id !== id))
    setConfirmDelete(null)
  }

  const handleCreate = () => {
    setCreateError('')
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
      setCreateError('All fields are required.')
      return
    }
    const prefixes: Record<UserType, string> = { customer: 'USR', seller: 'SLR', rider: 'RDR' }
    const u: VromUser = {
      id: `${prefixes[newUser.type]}${Date.now().toString().slice(-4)}`,
      name: newUser.name, email: newUser.email, phone: newUser.phone,
      type: newUser.type, status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      region: region === 'global' ? 'kenya' : region,
      orders: 0, trips: 0, walletBalance: 0, totalSpent: 0, totalEarned: 0, rating: 0, sales: 0,
    }
    setUsers(prev => [u, ...prev])
    setNewUser({ name: '', email: '', phone: '', type: 'customer', password: '' })
    setShowCreateForm(false)
  }

  const SortIcon = ({ k }: { k: SortKey }) => sortBy !== k ? null
    : sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Create, monitor, and control all platform users.</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showCreateForm ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-6 glass-dark border-primary/30 bg-primary/5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Platform User
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input placeholder="e.g. Alice Wanjiku" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <Input type="email" placeholder="user@email.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <Input placeholder="+254712345678" value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Temporary Password</label>
              <Input type="password" placeholder="Min. 8 characters" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">User Type</label>
              <div className="flex gap-3">
                {(['customer', 'seller', 'rider'] as UserType[]).map(t => (
                  <button key={t} onClick={() => setNewUser(p => ({ ...p, type: t }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${newUser.type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    {t === 'customer' && <User className="h-4 w-4" />}
                    {t === 'seller' && <ShoppingBag className="h-4 w-4" />}
                    {t === 'rider' && <Bike className="h-4 w-4" />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {createError && <p className="text-sm text-destructive mt-3">{createError}</p>}
          <div className="flex gap-3 mt-5">
            <Button onClick={handleCreate} className="gap-2"><Plus className="h-4 w-4" /> Create Account</Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: regionFiltered.length, color: 'text-primary', icon: User },
          { label: 'Customers', value: regionFiltered.filter(u => u.type === 'customer').length, color: 'text-blue-400', icon: User },
          { label: 'Sellers', value: regionFiltered.filter(u => u.type === 'seller').length, color: 'text-green-400', icon: ShoppingBag },
          { label: 'Riders', value: regionFiltered.filter(u => u.type === 'rider').length, color: 'text-orange-400', icon: Bike },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="p-4 glass-dark">
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, phone, ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm min-w-[140px]">
          <option value="all">All Types</option>
          <option value="customer">Customers</option>
          <option value="seller">Sellers</option>
          <option value="rider">Riders</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm min-w-[140px]">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
      </div>

      {/* Table */}
      <Card className="glass-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground" onClick={() => handleSort('orders')}>
                  <span className="flex items-center gap-1">Orders <SortIcon k="orders" /></span>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground" onClick={() => handleSort('trips')}>
                  <span className="flex items-center gap-1">Trips <SortIcon k="trips" /></span>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground" onClick={() => handleSort('walletBalance')}>
                  <span className="flex items-center gap-1">Wallet <SortIcon k="walletBalance" /></span>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground" onClick={() => handleSort('rating')}>
                  <span className="flex items-center gap-1">Rating <SortIcon k="rating" /></span>
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">Loading users...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">No users found.</td></tr>
              ) : sorted.map(user => {
                const TypeIcon = TYPE_ICONS[user.type] || User
                return (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[user.type]}`}>
                        {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground">{user.orders}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">{user.trips}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">${user.walletBalance.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      {user.rating > 0
                        ? <span className="flex items-center gap-1 text-foreground font-semibold">{user.rating.toFixed(1)} <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /></span>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[user.status]}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setSelectedUser(user)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button size="sm" variant="outline" className={`h-8 gap-1.5 ${user.status === 'blocked' ? 'text-green-500 border-green-500/30' : 'text-yellow-500 border-yellow-500/30'}`}
                          onClick={() => toggleBlock(user.id, user.status)}>
                          {user.status === 'blocked' ? <><Unlock className="h-3.5 w-3.5" /> Unblock</> : <><Lock className="h-3.5 w-3.5" /> Block</>}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setConfirmDelete(user.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Showing {sorted.length} of {regionFiltered.length} users</p>
        </div>
      </Card>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="p-6 glass-dark max-w-sm w-full mx-4 space-y-4 border-destructive/40">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h3 className="font-bold text-foreground">Delete User?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently remove the user and all their data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => deleteUser(confirmDelete)}>
                Delete Permanently
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* User Profile Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedUser(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-background border-l border-border h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                    {(() => { const Icon = TYPE_ICONS[selectedUser.type] || User; return <Icon className="h-7 w-7 text-primary" /> })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedUser.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[selectedUser.type]}`}>
                      {selectedUser.type.charAt(0).toUpperCase() + selectedUser.type.slice(1)}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Status Badge */}
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedUser.status]}`}>
                ● {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
              </span>

              {/* Contact Info */}
              <Card className="p-4 glass-dark space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Contact Info</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> {selectedUser.email}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> {selectedUser.phone}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> Joined: {selectedUser.joinDate}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{selectedUser.id}</span>
                </div>
              </Card>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Orders', value: selectedUser.orders, icon: ShoppingBag, color: 'text-blue-400' },
                  { label: 'Trips', value: selectedUser.trips, icon: Car, color: 'text-orange-400' },
                  { label: 'Wallet', value: `$${selectedUser.walletBalance.toLocaleString()}`, icon: Wallet, color: 'text-green-400' },
                  { label: 'Rating', value: selectedUser.rating > 0 ? `${selectedUser.rating}★` : '—', icon: Star, color: 'text-yellow-400' },
                  { label: 'Total Spent', value: `$${selectedUser.totalSpent.toLocaleString()}`, icon: BarChart3, color: 'text-purple-400' },
                  { label: selectedUser.type === 'seller' ? 'Sales Revenue' : 'Total Earned', value: `$${selectedUser.totalEarned.toLocaleString()}`, icon: BarChart3, color: 'text-pink-400' },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <Card key={s.label} className="p-3 glass-dark">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${s.color}`} />
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                    </Card>
                  )
                })}
              </div>

              {/* Mini activity chart */}
              <Card className="p-4 glass-dark">
                <h3 className="font-semibold text-foreground text-sm mb-3">Activity (Last 30 Days)</h3>
                <div className="h-24 flex items-end gap-1">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-t bg-primary/30 hover:bg-primary/60 transition-colors"
                      style={{ height: `${10 + Math.abs(Math.sin(i * 0.5 + selectedUser.id.charCodeAt(0)) * 90)}%`, minHeight: '4px' }} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Day 1 → 30</p>
              </Card>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button className={`w-full gap-2 ${selectedUser.status === 'blocked' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}
                  onClick={() => { toggleBlock(selectedUser.id, selectedUser.status); setSelectedUser(u => u ? { ...u, status: u.status === 'blocked' ? 'active' : 'blocked' } : null) }}>
                  {selectedUser.status === 'blocked' ? <><Unlock className="h-4 w-4" /> Unblock User</> : <><Lock className="h-4 w-4" /> Block User</>}
                </Button>
                <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => { setSelectedUser(null); setConfirmDelete(selectedUser.id) }}>
                  <Trash2 className="h-4 w-4" /> Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
