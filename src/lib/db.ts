import Dexie, { type Table } from 'dexie'
import type { Deal, FillUp, Settings } from './types'

class FuelDB extends Dexie {
  fillUps!: Table<FillUp, string>
  deals!: Table<Deal, string>
  settings!: Table<Settings, string>

  constructor() {
    super('fuel-saver')
    this.version(1).stores({
      fillUps: 'id, date, brand, odometer',
      deals: 'id, brand, enabled',
      settings: 'id',
    })
  }
}

export const db = new FuelDB()

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  currency: 'HKD',
  distanceUnit: 'km',
}

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('settings')
  if (existing) return existing
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

const SEED_DEALS: Deal[] = [
  {
    id: 'seed-caltex-saturday',
    brand: 'Caltex',
    title: 'Free petrol upgrade',
    rule: { type: 'weekly', days: [6] },
    notes: 'Verify current terms with your local Caltex station — promos change over time.',
    enabled: true,
  },
  {
    id: 'seed-shell-placeholder',
    brand: 'Shell',
    title: 'Check for Shell Go+ member discount',
    rule: { type: 'always' },
    notes: 'Placeholder — edit or disable this and add your station\'s actual promo.',
    enabled: false,
  },
  {
    id: 'seed-esso-placeholder',
    brand: 'Esso',
    title: 'Check for Esso Smiles member discount',
    rule: { type: 'always' },
    notes: 'Placeholder — edit or disable this and add your station\'s actual promo.',
    enabled: false,
  },
]

export async function seedDealsIfEmpty(): Promise<void> {
  const count = await db.deals.count()
  if (count === 0) {
    await db.deals.bulkPut(SEED_DEALS)
  }
}
