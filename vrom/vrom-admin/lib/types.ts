export type UserRole = 'super_admin' | 'regional_admin' | 'operator'

export type RegionCode = 'kenya' | 'nigeria' | 'uganda' | 'tanzania' | 'global'

export interface Region {
  code: RegionCode
  name: string
  country: string
  status: 'active' | 'inactive'
  currency: string
  timezone: string
  drivers: number
  riders: number
  merchants: number
  activeOrders: number
  gmv: number
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  region?: RegionCode
  regions?: RegionCode[]
  avatar?: string
  loginTime?: string
}

export interface UserContext {
  user: User | null
  region: RegionCode
  role: UserRole
  isLoading: boolean
  setUser: (user: User) => void
  setRegion: (region: RegionCode) => void
  switchRegion: (region: RegionCode) => void
  canManageRegion: (region: RegionCode) => boolean
  canAccessRegions: () => RegionCode[]
}
