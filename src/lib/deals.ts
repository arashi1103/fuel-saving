import { translate } from './i18n'
import type { Deal, Language } from './types'

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

export const DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6]

export function dayName(language: Language, day: number): string {
  return translate(language, `day.${day}`)
}

export function dayAbbr(language: Language, day: number): string {
  return translate(language, `day.abbr.${day}`)
}

export function describeDealRule(deal: Deal, language: Language): string {
  switch (deal.rule.type) {
    case 'always':
      return translate(language, 'deal.rule.ongoing')
    case 'weekly':
      return translate(language, 'deal.rule.every', {
        days: deal.rule.days.map((d) => dayName(language, d)).join('、'),
      })
    case 'dateRange':
      return `${deal.rule.start} – ${deal.rule.end}`
  }
}
