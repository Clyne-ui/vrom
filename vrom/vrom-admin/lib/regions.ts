import { Region, RegionCode } from '@/lib/types'

export const REGIONS: Record<RegionCode, Region> = {
  global: {
    code: 'global',
    name: 'Global Operations',
    country: 'Worldwide',
    status: 'active',
    currency: 'USD',
    timezone: 'UTC',
    drivers: 125420,
    riders: 547890,
    merchants: 8934,
    activeOrders: 45670,
    gmv: 5234000,
  },
  kenya: {
    code: 'kenya',
    name: 'Nairobi',
    country: 'Kenya',
    status: 'active',
    currency: 'KES',
    timezone: 'EAT',
    drivers: 2340,
    riders: 15670,
    merchants: 890,
    activeOrders: 3450,
    gmv: 284000,
  },
  nigeria: {
    code: 'nigeria',
    name: 'Lagos',
    country: 'Nigeria',
    status: 'active',
    currency: 'NGN',
    timezone: 'WAT',
    drivers: 5670,
    riders: 45230,
    merchants: 2340,
    activeOrders: 8920,
    gmv: 756000,
  },
  uganda: {
    code: 'uganda',
    name: 'Kampala',
    country: 'Uganda',
    status: 'active',
    currency: 'UGX',
    timezone: 'EAT',
    drivers: 890,
    riders: 6780,
    merchants: 340,
    activeOrders: 1245,
    gmv: 89000,
  },
  tanzania: {
    code: 'tanzania',
    name: 'Dar es Salaam',
    country: 'Tanzania',
    status: 'active',
    currency: 'TZS',
    timezone: 'EAT',
    drivers: 1230,
    riders: 8920,
    merchants: 450,
    activeOrders: 2340,
    gmv: 156000,
  },
}

export const REGION_LIST = Object.values(REGIONS).filter(r => r.code !== 'global')

export function getRegion(code: RegionCode): Region {
  return REGIONS[code]
}

export function getRegionName(code: RegionCode): string {
  return REGIONS[code]?.name || 'Unknown'
}

export function getRegionColor(code: RegionCode): string {
  const colors: Record<RegionCode, string> = {
    kenya: 'bg-blue-500',
    nigeria: 'bg-purple-500',
    uganda: 'bg-green-500',
    tanzania: 'bg-orange-500',
    global: 'bg-slate-500',
  }
  return colors[code] || 'bg-slate-500'
}

export function filterDataByRegion<T extends Record<string, any>>(
  data: T[],
  region: RegionCode,
  regionField: string = 'region'
): T[] {
  if (region === 'global') return data
  return data.filter(item => item[regionField] === region)
}
