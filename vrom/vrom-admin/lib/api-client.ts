// Configure your Go backend URL here
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export const apiClient = {
  // Auth endpoints
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })
    return res.json()
  },

  logout: async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  },

  me: async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: 'include',
    })
    return res.json()
  },

  // CRM endpoints
  searchUsers: async (query: string, type?: string) => {
    const params = new URLSearchParams({ q: query })
    if (type) params.append('type', type)
    
    const res = await fetch(`${API_BASE_URL}/api/crm/search?${params}`, {
      credentials: 'include',
    })
    return res.json()
  },

  getUser: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/api/crm/users/${id}`, {
      credentials: 'include',
    })
    return res.json()
  },

  updateUser: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}/api/crm/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    return res.json()
  },

  // Financials endpoints
  getFinancials: async () => {
    const res = await fetch(`${API_BASE_URL}/api/financials`, {
      credentials: 'include',
    })
    return res.json()
  },

  // Map endpoints
  getFleetLocations: async () => {
    const res = await fetch(`${API_BASE_URL}/api/map/fleet`, {
      credentials: 'include',
    })
    return res.json()
  },

  // Security endpoints
  getAuditLog: async (limit?: number) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    
    const res = await fetch(`${API_BASE_URL}/api/security/audit-log?${params}`, {
      credentials: 'include',
    })
    return res.json()
  },

  triggerMaintenance: async (enabled: boolean) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
      credentials: 'include',
    })
    return res.json()
  },

  // Analytics endpoints
  getAnalytics: async (range?: string) => {
    const params = new URLSearchParams()
    if (range) params.append('range', range)
    
    const res = await fetch(`${API_BASE_URL}/api/analytics?${params}`, {
      credentials: 'include',
    })
    return res.json()
  },

  // Real-time stream helper
  streamFinancials: (callback: (data: any) => void) => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/stream/financials`, {
      withCredentials: true,
    })
    
    eventSource.onmessage = (event) => {
      callback(JSON.parse(event.data))
    }
    
    return () => eventSource.close()
  },
}
