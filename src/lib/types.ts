export const KNOWN_BRANDS = [
  'Shell',
  'Esso',
  'Caltex',
  'Sinopec',
  'PetroChina',
  'CNPC',
  'BP',
  'Mobil',
] as const

export type KnownBrand = (typeof KNOWN_BRANDS)[number]

export interface FillUp {
  id: string
  date: string // ISO date
  brand: string
  litres: number
  netAmount: number
  odometer: number
  stationName?: string
  receiptImage?: Blob
  missedPrevious?: boolean // exclude this interval from per-km stats (gap in odometer history)
  createdAt: string
}

export type DealRule =
  | { type: 'weekly'; days: number[] } // 0 = Sunday .. 6 = Saturday
  | { type: 'dateRange'; start: string; end: string }
  | { type: 'always' }

export interface Deal {
  id: string
  brand: string
  title: string
  rule: DealRule
  notes?: string
  enabled: boolean
}

export interface Settings {
  id: string // singleton row, always 'settings'
  currency: string
  distanceUnit: 'km'
}
