'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, TrendingUp, Users, ShoppingBag, Zap, Globe, Lock, ShieldAlert, X, ShieldCheck, CheckCircle, Trash2, Eye, Unlock } from 'lucide-react'
import { REGION_LIST } from '@/lib/regions'
import { useUser } from '@/lib/contexts/user-context'
import { useRouter } from 'next/navigation'

interface ExtendedRegion {
  code: string
  name: string
  country: string
  status: 'active' | 'inactive' | 'blocked'
  currency: string
  timezone: string
  drivers: number
  riders: number
  merchants: number
  activeOrders: number
  gmv: number
  hasIssue?: boolean
}

// Mock users inside a region for management
interface RegionUser {
  id: string
  name: string
  role: 'admin' | 'rider' | 'merchant' | 'customer'
  status: 'active' | 'pending_approval' | 'blocked'
  documents?: { type: string; url: string; approved: boolean | null }[]
}

const DEMO_REGION_USERS: Record<string, RegionUser[]> = {
  kenya: [
    { id: 'ADM01', name: 'Clyne Mwangi', role: 'admin', status: 'active' },
    { id: 'RDR01', name: 'James Kamau', role: 'rider', status: 'pending_approval', documents: [{ type: 'Driver License', url: '#', approved: null }, { type: 'Vehicle Insurance', url: '#', approved: null }] },
    { id: 'USR01', name: 'Alice Wanjiku', role: 'customer', status: 'active' },
  ],
  nigeria: [
    { id: 'ADM02', name: 'Emeka Okafor', role: 'admin', status: 'active' },
    { id: 'RDR02', name: 'Chinedu Eze', role: 'rider', status: 'active' },
  ],
  uganda: [
    { id: 'ADM03', name: 'Sarah Nakato', role: 'admin', status: 'active' },
  ]
}

export default function RegionsPage() {
  const { role } = useUser()
  const router = useRouter()

  const [regions, setRegions] = useState<ExtendedRegion[]>(
    REGION_LIST.map(r => ({ ...r, hasIssue: r.code === 'nigeria' })) // Mock issue in Nigeria
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRegion, setNewRegion] = useState({ name: '', country: '', currency: '', timezone: '' })

  // Manage Region Drawer
  const [managingRegion, setManagingRegion] = useState<string | null>(null)
  const [regionUsers, setRegionUsers] = useState<Record<string, RegionUser[]>>(DEMO_REGION_USERS)

  if (role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Lock className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">Only Super Admins can manage regions</p>
        <Button onClick={() => router.push('/dashboard')}>Go Back</Button>
      </div>
    )
  }

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateRegion = () => {
    if (!newRegion.name || !newRegion.country) return
    const code = newRegion.name.toLowerCase().replace(/\s+/g, '-')
    const created: ExtendedRegion = {
      code,
      name: newRegion.name,
      country: newRegion.country,
      currency: newRegion.currency || 'USD',
      timezone: newRegion.timezone || 'UTC',
      status: 'active',
      drivers: 0, riders: 0, merchants: 0, activeOrders: 0, gmv: 0,
      hasIssue: false
    }
    setRegions([...regions, created])
    setRegionUsers({ ...regionUsers, [code]: [] })
    setNewRegion({ name: '', country: '', currency: '', timezone: '' })
    setShowAddForm(false)
  }

  const handleBlockRegion = (code: string) => {
    setRegions(prev => prev.map(r => r.code === code ? { ...r, status: r.status === 'blocked' ? 'active' : 'blocked' } : r))
  }

  const handleDeleteRegion = (code: string) => {
    setRegions(prev => prev.filter(r => r.code !== code))
    if (managingRegion === code) setManagingRegion(null)
  }

  // User inner management actions
  const handleUserAction = (regionCode: string, userId: string, action: 'block' | 'delete' | 'approve_doc' | 'decline_doc') => {
    setRegionUsers(prev => {
      const users = prev[regionCode] || []
      return {
        ...prev,
        [regionCode]: users.map(u => {
          if (u.id !== userId) return u
          if (action === 'block') return { ...u, status: u.status === 'blocked' ? 'active' : 'blocked' } as RegionUser
          if (action === 'approve_doc') return { ...u, status: 'active', documents: u.documents?.map(d => ({ ...d, approved: true })) } as RegionUser
          if (action === 'decline_doc') return { ...u, status: 'blocked', documents: u.documents?.map(d => ({ ...d, approved: false })) } as RegionUser
          return u
        }).filter(u => action !== 'delete' || u.id !== userId)
      }
    })
  }

  const stats = {
    totalRegions: regions.length,
    activeRegions: regions.filter(r => r.status === 'active').length,
    totalDrivers: regions.reduce((sum, r) => sum + r.drivers, 0),
    totalRiders: regions.reduce((sum, r) => sum + r.riders, 0),
    totalGMV: regions.reduce((sum, r) => sum + r.gmv, 0),
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Regional Management</h1>
          <p className="text-muted-foreground">Manage all regions and monitor multi-country operations</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2 bg-primary">
          <Globe className="h-4 w-4" /> Add New Region
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Regions', val: stats.totalRegions, sub: `${stats.activeRegions} Active`, icon: Globe, iconColor: 'text-primary' },
          { label: 'Total Drivers', val: stats.totalDrivers.toLocaleString(), sub: '+12% from last month', icon: Users, iconColor: 'text-green-500' },
          { label: 'Total Riders', val: stats.totalRiders.toLocaleString(), sub: '+18% from last month', icon: Users, iconColor: 'text-blue-500' },
          { label: 'Total Merchants', val: regions.reduce((sum, r) => sum + r.merchants, 0).toLocaleString(), sub: '+8% from last month', icon: ShoppingBag, iconColor: 'text-purple-500' },
          { label: 'Global GMV', val: `$${(stats.totalGMV / 1000000).toFixed(1)}M`, sub: '+24% YoY', icon: TrendingUp, iconColor: 'text-orange-500' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={i} className="p-6 glass-dark">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground">{s.val}</p>
                  <p className={`text-xs mt-2 ${s.iconColor}`}>{s.sub}</p>
                </div>
                <Icon className={`h-10 w-10 ${s.iconColor} opacity-20`} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Add Region Form */}
      {showAddForm && (
        <Card className="p-6 glass-dark bg-primary/5 border border-primary/30 animate-in fade-in slide-in-from-top-4">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Setup New Region</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><label className="text-sm font-medium">City / Region Name</label><Input placeholder="e.g. Accra" value={newRegion.name} onChange={e => setNewRegion({ ...newRegion, name: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium">Country</label><Input placeholder="e.g. Ghana" value={newRegion.country} onChange={e => setNewRegion({ ...newRegion, country: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium">Currency</label><Input placeholder="e.g. GHS" value={newRegion.currency} onChange={e => setNewRegion({ ...newRegion, currency: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium">Timezone</label><Input placeholder="e.g. GMT" value={newRegion.timezone} onChange={e => setNewRegion({ ...newRegion, timezone: e.target.value })} className="mt-1" /></div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreateRegion} className="bg-primary">Launch Region</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Input placeholder="Search regions by name or country..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegions.map((region) => {
          const isProblem = region.hasIssue
          return (
            <Card key={region.code} className={`p-6 glass-dark transition-all ${isProblem ? 'border-destructive bg-destructive/10 border-2' : ''}`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isProblem ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                      {isProblem ? <ShieldAlert className="h-5 w-5 text-destructive" /> : <MapPin className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg flex gap-2">
                        {region.name} {isProblem && <span className="animate-pulse text-destructive">⚠️ Alert</span>}
                      </h3>
                      <p className="text-xs text-muted-foreground">{region.country}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${region.status === 'active' ? 'bg-green-500/20 text-green-500' :
                    region.status === 'blocked' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}>
                    {region.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
                  <div><p className="text-xs text-muted-foreground">Drivers</p><p className="font-bold">{region.drivers.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Riders</p><p className="font-bold">{region.riders.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Merchants</p><p className="font-bold">{region.merchants.toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">GMV</p><p className="font-bold text-primary">${region.gmv.toLocaleString()}</p></div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setManagingRegion(region.code)} className="flex-1 bg-primary/20 hover:bg-primary/40 text-primary border-0">
                    Manage Hub
                  </Button>
                  <Button size="sm" variant="outline" className={`flex-1 ${region.status === 'blocked' ? 'text-green-500 border-green-500/50' : 'text-yellow-500 border-yellow-500/50'}`}
                    onClick={() => handleBlockRegion(region.code)}>
                    {region.status === 'blocked' ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                    {region.status === 'blocked' ? 'Unblock' : 'Block'}
                  </Button>
                  <Button size="icon" variant="outline" className="h-9 w-9 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDeleteRegion(region.code)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Multi-Country Expansion Section */}
      <Card className="p-6 glass-dark border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => setShowAddForm(true)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Ready to Expand to New Countries?
          </h2>
          <p className="text-sm text-muted-foreground">
            Add new regions to scale Vrom's operations globally. Configure regional settings, assign admins, and monitor performance in real-time.
          </p>
        </div>
      </Card>

      {/* Regional Management Drawer (Room) */}
      {managingRegion && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setManagingRegion(null)} />
          <div className="relative w-full max-w-2xl bg-background border-l border-border h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right-full">

            {/* Drawer Header */}
            <div className="p-6 border-b border-border bg-muted/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-wider text-primary">
                  {regions.find(r => r.code === managingRegion)?.name} Hub
                </h2>
                <p className="text-sm text-muted-foreground">Admin & User Control Center</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setManagingRegion(null)}><X className="h-6 w-6" /></Button>
            </div>

            <div className="p-6 space-y-8 flex-1">

              {/* Alert resolution for affected regions */}
              {regions.find(r => r.code === managingRegion)?.hasIssue && (
                <Card className="p-4 bg-destructive/10 border-destructive/50 flex justify-between items-center text-destructive">
                  <div className="flex gap-3">
                    <ShieldAlert className="h-6 w-6" />
                    <div>
                      <h4 className="font-bold">Critical Issue Detected</h4>
                      <p className="text-sm">High rates of declined orders in the last hour.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => {
                    setRegions(prev => prev.map(r => r.code === managingRegion ? { ...r, hasIssue: false } : r))
                  }}>Resolve Issue</Button>
                </Card>
              )}

              {/* Regional Admins */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Assigned Admins</h3>
                <div className="space-y-3">
                  {regionUsers[managingRegion]?.filter(u => u.role === 'admin').map(admin => (
                    <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-semibold">{admin.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{admin.id}</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => handleUserAction(managingRegion, admin.id, 'delete')}>
                        Remove Admin
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed">Assign New Admin to Region</Button>
                </div>
              </div>

              {/* Rider / User Approvals */}
              <div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Pending Approvals & Users</h3>
                <div className="space-y-3">
                  {regionUsers[managingRegion]?.filter(u => u.role !== 'admin').map(user => (
                    <Card key={user.id} className="p-4 border border-border bg-card">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {user.name}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase font-bold">{user.role}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${user.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-500' : user.status === 'blocked' ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>
                              {user.status.replace('_', ' ')}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className={user.status === 'blocked' ? 'text-green-500 border-green-500/30' : 'text-orange-500 border-orange-500/30'} onClick={() => handleUserAction(managingRegion, user.id, 'block')}>
                            {user.status === 'blocked' ? 'Unblock' : 'Block'}
                          </Button>
                          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive border-destructive/30" onClick={() => handleUserAction(managingRegion, user.id, 'delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Documents Section for Pending Riders */}
                      {user.status === 'pending_approval' && user.documents && (
                        <div className="p-3 bg-muted/40 rounded-lg mt-2">
                          <p className="text-xs font-semibold mb-2 uppercase text-muted-foreground">Submitted Documents</p>
                          <div className="space-y-2 mb-3">
                            {user.documents.map((doc, idx) => (
                              <div key={idx} className="flex justify-between text-sm items-center p-2 bg-background rounded border border-border">
                                <span className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> {doc.type}</span>
                                <span className="text-xs font-bold text-primary cursor-pointer hover:underline">View File</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleUserAction(managingRegion, user.id, 'approve_doc')}><CheckCircle className="h-3 w-3 mr-1" /> Approve Rider</Button>
                            <Button size="sm" variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleUserAction(managingRegion, user.id, 'decline_doc')}><X className="h-3 w-3 mr-1" /> Decline</Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                  {regionUsers[managingRegion]?.filter(u => u.role !== 'admin').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">No active users or pending approvals in this region.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
