import type { Deal } from './types'

export function isDealActiveOn(deal: Deal, date: Date): boolean {
  if (!deal.enabled) return false

  switch (deal.rule.type) {
    case 'always':
      return true
    case 'weekly':
      return deal.rule.days.includes(date.getDay())
    case 'dateRange': {
      const iso = date.toISOString().slice(0, 10)
      return iso >= deal.rule.start && iso <= deal.rule.end
    }
  }
}

export function activeDealsOn(deals: Deal[], date: Date): Deal[] {
  return deals.filter((d) => isDealActiveOn(d, date))
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function describeDealRule(deal: Deal): string {
  switch (deal.rule.type) {
    case 'always':
      return 'Ongoing'
    case 'weekly':
      return `Every ${deal.rule.days.map((d) => DAY_NAMES[d]).join(', ')}`
    case 'dateRange':
      return `${deal.rule.start} – ${deal.rule.end}`
  }
}

export { DAY_NAMES }
