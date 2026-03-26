'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings as SettingsIcon, Bell, Lock, Users, Globe, Shield, Save, Check, Plus, Trash2 } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { REGIONS } from '@/lib/regions'
import { UserRole, RegionCode } from '@/lib/types'
import { useSearchParams } from 'next/navigation'

type TabType = 'general' | 'users' | 'notifications' | 'security' | 'integrations'

interface DashboardUser {
  id: string
  name: string
  email: string
  role: UserRole
  region?: RegionCode
  status: 'active' | 'inactive'
  lastAccess: string
}

export default function SettingsPage() {
  const { user, role } = useUser()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabType) || 'users'
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType
    if (tab) setActiveTab(tab)
  }, [searchParams])
  const [saved, setSaved] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'regional_admin' as UserRole, region: 'kenya' as RegionCode })

  const [users, setUsers] = useState<DashboardUser[]>([
    {
      id: '1',
      name: 'Super Admin',
      email: 'admin@vrom.io',
      role: 'super_admin',
      status: 'active',
      lastAccess: '2024-03-23 15:45',
    },
    {
      id: '2',
      name: 'Nairobi Admin',
      email: 'nairobi@vrom.io',
      role: 'regional_admin',
      region: 'kenya',
      status: 'active',
      lastAccess: '2024-03-23 14:20',
    },
    {
      id: '3',
      name: 'Lagos Admin',
      email: 'lagos@vrom.io',
      role: 'regional_admin',
      region: 'nigeria',
      status: 'active',
      lastAccess: '2024-03-22 18:30',
    },
    {
      id: '4',
      name: 'Kampala Admin',
      email: 'kampala@vrom.io',
      role: 'regional_admin',
      region: 'uganda',
      status: 'active',
      lastAccess: '2024-03-22 10:15',
    },
  ])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      const user: DashboardUser = {
        id: Math.random().toString(36).substr(2, 9),
        ...newUser,
        status: 'active',
        lastAccess: new Date().toLocaleString(),
      }
      setUsers([...users, user])
      setNewUser({ name: '', email: '', role: 'regional_admin', region: 'kenya' })
      setShowAddUser(false)
      handleSave()
    }
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId))
    handleSave()
  }

  const filteredUsers = role === 'super_admin'
    ? users
    : users.filter(u => u.region === user?.region || u.role === 'super_admin')

  const tabs: { label: string; value: TabType; icon: any }[] = [
    { label: 'Users', value: 'users', icon: Users },
    { label: 'General', value: 'general', icon: SettingsIcon },
    { label: 'Notifications', value: 'notifications', icon: Bell },
    { label: 'Security', value: 'security', icon: Lock },
    { label: 'Integrations', value: 'integrations', icon: Globe },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          {role === 'super_admin'
            ? 'Configure your OCC platform and manage regional admins.'
            : `Manage settings for ${REGIONS[user?.region as RegionCode]?.name}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.value
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Add User Section - Super Admin Only */}
            {role === 'super_admin' && (
              <Card className="p-6 glass-dark border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">Add New Admin</h2>
                  <Button
                    variant={showAddUser ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowAddUser(!showAddUser)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {showAddUser ? 'Cancel' : 'Add Admin'}
                  </Button>
                </div>

                {showAddUser && (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
                    <Input
                      placeholder="Full Name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className="col-span-1 md:col-span-2"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="col-span-1 md:col-span-2"
                    />
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm"
                    >
                      <option value="regional_admin">Regional Admin</option>
                    </select>
                    {newUser.role === 'regional_admin' && (
                      <select
                        value={newUser.region || 'kenya'}
                        onChange={(e) => setNewUser({ ...newUser, region: e.target.value as RegionCode })}
                        className="px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm col-span-1 md:col-span-1"
                      >
                        <option value="kenya">Nairobi, Kenya</option>
                        <option value="nigeria">Lagos, Nigeria</option>
                        <option value="uganda">Kampala, Uganda</option>
                        <option value="tanzania">Dar es Salaam, Tanzania</option>
                      </select>
                    )}
                    <Button
                      onClick={handleAddUser}
                      className="bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      Create
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Users Table */}
            <Card className="p-6 glass-dark overflow-x-auto">
              <h2 className="text-lg font-bold text-foreground mb-4">
                {role === 'super_admin' ? 'All Admins' : 'Regional Team'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Role</th>
                      {role === 'super_admin' && (
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Region</th>
                      )}
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Last Access</th>
                      {role === 'super_admin' && (
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-card/30 transition-colors">
                        <td className="py-3 px-4 text-foreground">{u.name}</td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            {u.role === 'super_admin' ? 'Super Admin' : 'Regional Admin'}
                          </span>
                        </td>
                        {role === 'super_admin' && (
                          <td className="py-3 px-4">
                            {u.region ? (
                              <span className="text-sm text-foreground">
                                {REGIONS[u.region]?.name}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Global</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${u.status === 'active'
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                              : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{u.lastAccess}</td>
                        {role === 'super_admin' && (
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <Card className="p-6 glass-dark">
              <h2 className="text-lg font-bold text-foreground mb-4">Platform Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Platform Name</label>
                  <Input placeholder="Vrom Operations Command Center" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Support Email</label>
                  <Input type="email" placeholder="support@vrom.io" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                  <select className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground">
                    <option>UTC</option>
                    <option>EAT (East Africa Time)</option>
                    <option>WAT (West Africa Time)</option>
                  </select>
                </div>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <Card className="p-6 glass-dark">
            <h2 className="text-lg font-bold text-foreground mb-4">Notification Preferences</h2>
            <div className="space-y-3">
              {['System alerts', 'Fraud alerts', 'Daily summary', 'Weekly report'].map((notif) => (
                <label key={notif} className="flex items-center gap-3 p-3 hover:bg-card/50 rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-foreground">{notif}</span>
                </label>
              ))}
            </div>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card className="p-6 glass-dark">
            <h2 className="text-lg font-bold text-foreground mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Two-Factor Authentication</label>
                <Button variant="outline">Enable 2FA</Button>
              </div>
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-medium text-foreground mb-2">Session Timeout (minutes)</label>
                <Input type="number" defaultValue="30" />
              </div>
            </div>
          </Card>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <Card className="p-6 glass-dark">
            <h2 className="text-lg font-bold text-foreground mb-4">Backend Integration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Go Backend URL</label>
                <Input placeholder="http://localhost:8080" defaultValue="http://localhost:8080" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">API Key</label>
                <Input type="password" placeholder="Enter your API key" />
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Check className="h-4 w-4" />
                Test Connection
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Save Notification */}
      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-600 dark:text-green-400">
          <Check className="h-5 w-5" />
          Changes saved successfully
        </div>
      )}
    </div>
  )
}
