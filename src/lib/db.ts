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
  language: 'en',
}

// Read-only — safe to use inside useLiveQuery (Dexie forbids writes in a
// liveQuery querier). Falls back to in-memory defaults if unseeded.
export async function getSettingsLive(): Promise<Settings> {
  const existing = await db.settings.get('settings')
  return existing ? { ...DEFAULT_SETTINGS, ...existing } : DEFAULT_SETTINGS
}

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('settings')
  if (existing) return { ...DEFAULT_SETTINGS, ...existing }
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

// Seeded from public Hong Kong sources, researched July 2026. Weekly discount-day
// patterns tend to be fairly stable; card/app promo periods expire and need
// re-checking — see each deal's notes for its source and any end date.
const SEED_DEALS: Deal[] = [
  {
    id: 'seed-esso-weekday-2026',
    brand: 'Esso',
    title: 'Esso Smiles 會員 — 星期二、五折扣日',
    rule: { type: 'weekly', days: [2, 5] },
    notes:
      '不同油站/日子的實際折扣金額會浮動，記得於Esso Smiles App內領取優惠券。資料來源：Mr. Miles、MoneyHero 入油優惠比較（2026年7月）。',
    enabled: true,
  },
  {
    id: 'seed-caltex-weekday-2026',
    brand: 'Caltex',
    title: '加德士「加FUN」會員 — 星期三、六折扣日',
    rule: { type: 'weekly', days: [3, 6] },
    notes:
      '加德士星期三及六的會員折扣通常較大，記得於「加FUN」App內揀選優惠券。資料來源：Mr. Miles、MoneyHero（2026年7月）。',
    enabled: true,
  },
  {
    id: 'seed-shell-weekday-2026',
    brand: 'Shell',
    title: 'Shell GO+ 會員 — 星期二、五、六、日折扣',
    rule: { type: 'weekly', days: [0, 2, 5, 6] },
    notes:
      'Shell於星期二、五、六、日一般提供較大折扣，可於Shell App「手動選取」頁面領用優惠券；生日月份雙倍積分。部份信用卡曾提供逢星期二、五額外每公升折扣（優惠期有變動）。資料來源：Shell香港官網、Miss Card（2026年7月）。',
    enabled: true,
  },
  {
    id: 'seed-sinopec-weekend-2026',
    brand: 'Sinopec',
    title: '中石化 — 週末（六、日）折扣升級',
    rule: { type: 'weekly', days: [0, 6] },
    notes: '中石化週末折扣一般較平日大，並不定期推出「週末折扣升級」推廣。資料來源：中石化香港官網 sinopechongkong.com（2026年7月）。',
    enabled: true,
  },
  {
    id: 'seed-sinopec-plus-app-promo-2026',
    brand: 'Sinopec',
    title: 'SINOPEC PLUS App — 入油儲分換半價優惠',
    rule: { type: 'dateRange', start: '2026-06-15', end: '2026-07-19' },
    notes:
      '完成指定入油次數及App換領任務，可解鎖電子折扣券，最高半價入油；適用於X CARD／X CARD PLUS／VIP卡會員。此推廣有截止日期，過期後請重新查閱官方App確認最新任務。資料來源：中石化香港官網（2026年7月）。',
    enabled: true,
  },
  {
    id: 'seed-petrochina-weekend-2026',
    brand: 'PetroChina',
    title: '中國石油 — 週末（六、日）會員折扣',
    rule: { type: 'weekly', days: [0, 6] },
    notes: '中國石油於週末的會員折扣一般較大，記得出示會員卡/App。資料來源：Mr. Miles（2026年7月）。',
    enabled: true,
  },
  {
    id: 'seed-hsbc-everymile-2026',
    brand: 'HSBC EveryMile（信用卡）',
    title: 'HSBC EveryMile 卡 — 5大油站 HK$2 = 1里',
    rule: { type: 'always' },
    notes:
      '憑HSBC EveryMile信用卡於Esso、Shell、加德士、中國石油、中石化油站簽賬，不限時段可享HK$2=1里數回贈，毋須額外登記。資料來源：HSBC香港官網（2026年7月）。',
    enabled: false,
  },
  {
    id: 'seed-daching-myauto-2026',
    brand: '大新 MyAuto 卡（信用卡）',
    title: '大新 MyAuto 信用卡 — 入油3.2%現金回贈',
    rule: { type: 'always' },
    notes: '大新銀行MyAuto信用卡於各大油站簽賬可享3.2%現金回贈，另設迎新獎賞。資料來源：Mr. Miles（2026年7月）。',
    enabled: false,
  },
  {
    id: 'seed-amex-platinum-2026',
    brand: 'Amex 白金卡（信用卡）',
    title: 'Amex 白金卡 — 4大油站雙倍積分',
    rule: { type: 'dateRange', start: '2026-01-01', end: '2026-12-31' },
    notes:
      '美國運通白金信用卡於加德士、Esso、Shell及中國石油油站簽賬，每HK$1可賺6 AE積分（雙倍），推廣至2026年12月31日，屆時請重新查閱。資料來源：Miss Card（2026年7月）。',
    enabled: false,
  },
]

export async function seedDealsIfEmpty(): Promise<void> {
  const count = await db.deals.count()
  if (count === 0) {
    await db.deals.bulkPut(SEED_DEALS)
  }
}
