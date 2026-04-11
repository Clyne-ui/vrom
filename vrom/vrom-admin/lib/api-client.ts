const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const request = async (path: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vrom_session_token') : null
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    let errorData
    try {
      errorData = JSON.parse(text)
    } catch {
      errorData = { message: text || res.statusText }
    }
    throw new Error(errorData.message || 'API Request Failed')
  }

  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return res.json()
  }
  return res.text()
}

export const apiClient = {
  // Generic helpers
  get: (path: string) => request(path),
  post: (path: string, body: any) => request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  put: (path: string, body: any) => request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  delete: (path: string) => request(path, { method: 'DELETE' }),

  // Auth endpoints
  login: async (email: string, password: string) => {
    return request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  },

  logout: async () => {
    return request('/logout', { method: 'POST' })
  },

  me: async () => {
    return request('/profile')
  },

  // CRM endpoints
  searchUsers: async (query: string, type?: string) => {
    const params = new URLSearchParams({ q: query })
    if (type) params.append('role', type)
    return request(`/occ/crm/search?${params}`)
  },

  getUser: async (id: string) => {
    return request(`/occ/crm/history?user_id=${id}`)
  },

  deleteUser: async (id: string) => {
    return request('/occ/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id })
    })
  },

  // Moderation
  getPendingRiders: async () => {
    return request('/admin/riders/pending')
  },

  approveRider: async (userId: string, region: string) => {
    return request('/admin/riders/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, region })
    })
  },

  rejectRider: async (userId: string, reason: string) => {
    return request('/admin/riders/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, reason })
    })
  },

  // Financials
  getFinancials: async () => {
    return request('/occ/analytics/financials')
  },

  // Map
  getFleetLocations: async () => {
    return request('/occ/fleet/live')
  },

  // Security
  getAuditLog: async (page: number = 1) => {
    return request(`/occ/audit/log?page=${page}`)
  },

  triggerMaintenance: async (active: boolean) => {
    return request('/occ/admin/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
  },

  // Real-time stream helper
  streamFinancials: (callback: (data: any) => void) => {
    const eventSource = new EventSource(`${API_BASE_URL}/occ/stream/financials`, {
      withCredentials: true,
    })

    eventSource.onmessage = (event) => {
      callback(JSON.parse(event.data))
    }

    return () => eventSource.close()
  },
}
