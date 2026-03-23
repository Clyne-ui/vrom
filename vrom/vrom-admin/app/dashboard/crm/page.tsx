'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Download, ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  type: 'driver' | 'rider' | 'merchant' | 'courier'
  status: 'active' | 'inactive' | 'suspended'
  joinDate: string
  orders: number
  rating: number
  revenue: number
}

const mockUsers: User[] = [
  {
    id: 'DRV001',
    name: 'Rajesh Kumar',
    email: 'rajesh@driver.com',
    type: 'driver',
    status: 'active',
    joinDate: '2023-06-15',
    orders: 245,
    rating: 4.8,
    revenue: 12450,
  },
  {
    id: 'RDR002',
    name: 'Priya Singh',
    email: 'priya@rider.com',
    type: 'rider',
    status: 'active',
    joinDate: '2023-08-20',
    orders: 89,
    rating: 4.5,
    revenue: 0,
  },
  {
    id: 'MER003',
    name: 'Sharma Foods',
    email: 'contact@sharmafoods.com',
    type: 'merchant',
    status: 'active',
    joinDate: '2023-05-10',
    orders: 523,
    rating: 4.7,
    revenue: 34200,
  },
  {
    id: 'COR004',
    name: 'Arun Patel',
    email: 'arun@courier.com',
    type: 'courier',
    status: 'active',
    joinDate: '2023-07-12',
    orders: 156,
    rating: 4.9,
    revenue: 8900,
  },
  {
    id: 'DRV005',
    name: 'Vikram Singh',
    email: 'vikram@driver.com',
    type: 'driver',
    status: 'inactive',
    joinDate: '2023-04-22',
    orders: 182,
    rating: 4.3,
    revenue: 9200,
  },
]

export default function CRMPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'revenue'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filterType === 'all' || user.type === filterType
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let compareA = a[sortBy]
    let compareB = b[sortBy]

    if (typeof compareA === 'string') {
      compareA = compareA.toLowerCase()
      compareB = compareB.toLowerCase()
    }

    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'driver':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'rider':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'merchant':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'courier':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-500'
      case 'inactive':
        return 'text-gray-500'
      case 'suspended':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Unified CRM</h1>
        <p className="text-muted-foreground mt-1">
          Manage drivers, riders, merchants, and couriers in one place.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-primary' },
          { label: 'Drivers', value: users.filter(u => u.type === 'driver').length, color: 'text-orange-500' },
          { label: 'Merchants', value: users.filter(u => u.type === 'merchant').length, color: 'text-green-500' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'text-blue-500' },
        ].map((stat, i) => (
          <Card key={i} className="p-4 glass-dark">
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card className="p-4 glass-dark space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Export */}
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">User Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            >
              <option value="all">All Types</option>
              <option value="driver">Drivers</option>
              <option value="rider">Riders</option>
              <option value="merchant">Merchants</option>
              <option value="courier">Couriers</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm"
            >
              <option value="name">Name</option>
              <option value="orders">Orders</option>
              <option value="revenue">Revenue</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="glass-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  User Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Type
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold text-foreground cursor-pointer hover:bg-muted"
                  onClick={() => {
                    if (sortBy === 'orders') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('orders')
                      setSortOrder('desc')
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Orders
                    {sortBy === 'orders' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Rating
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold text-foreground cursor-pointer hover:bg-muted"
                  onClick={() => {
                    if (sortBy === 'revenue') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy('revenue')
                      setSortOrder('desc')
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Revenue
                    {sortBy === 'revenue' && (
                      sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedUsers.length > 0 ? (
                sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {user.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(user.type)}`}>
                        {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{user.orders}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{user.rating.toFixed(1)} ★</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">
                        ${(user.revenue / 1000).toFixed(1)}k
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)} bg-current/10`}>
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(user.status)}`} />
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No users found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {sortedUsers.length} of {users.length} users
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Previous
            </Button>
            <Button variant="outline" size="sm">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
