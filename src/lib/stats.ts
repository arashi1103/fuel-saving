import type { FillUp } from './types'

export interface IntervalStat {
  fillUp: FillUp
  distanceKm: number
  costPerKm: number
  litresPer100km: number
}

export interface BrandStat {
  brand: string
  totalLitres: number
  totalNetAmount: number
  netPricePerLitre: number
  fillUpCount: number
}

export interface MonthlySpend {
  month: string // YYYY-MM
  totalNetAmount: number
  totalLitres: number
}

function sortByOdometer(fillUps: FillUp[]): FillUp[] {
  return [...fillUps].sort((a, b) => a.odometer - b.odometer)
}

/**
 * Per-interval cost/consumption stats. An interval is the distance between
 * two consecutive fill-ups (by odometer). The first fill-up has no prior
 * odometer reading, so it's excluded. Intervals flagged `missedPrevious`
 * (a gap where a fill-up wasn't logged) are also excluded, since the
 * distance can't be attributed to a single tank.
 */
export function computeIntervalStats(fillUps: FillUp[]): IntervalStat[] {
  const sorted = sortByOdometer(fillUps)
  const stats: IntervalStat[] = []

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i]
    const prev = sorted[i - 1]
    if (curr.missedPrevious) continue

    const distanceKm = curr.odometer - prev.odometer
    if (distanceKm <= 0) continue

    stats.push({
      fillUp: curr,
      distanceKm,
      costPerKm: curr.netAmount / distanceKm,
      litresPer100km: (curr.litres / distanceKm) * 100,
    })
  }

  return stats
}

export function computeOverallCostPerKm(fillUps: FillUp[]): number | null {
  const sorted = sortByOdometer(fillUps)
  if (sorted.length < 2) return null

  const totalDistance = sorted[sorted.length - 1].odometer - sorted[0].odometer
  if (totalDistance <= 0) return null

  const totalSpend = sorted.slice(1).reduce((sum, f) => sum + f.netAmount, 0)
  return totalSpend / totalDistance
}

/**
 * Volume-weighted average net price per litre, grouped by brand.
 * This is Σ netAmount / Σ litres per brand — NOT a mean of per-fill-up
 * unit prices, since that would overweight small fill-ups.
 */
export function computeBrandStats(fillUps: FillUp[]): BrandStat[] {
  const byBrand = new Map<string, { litres: number; amount: number; count: number }>()

  for (const f of fillUps) {
    const entry = byBrand.get(f.brand) ?? { litres: 0, amount: 0, count: 0 }
    entry.litres += f.litres
    entry.amount += f.netAmount
    entry.count += 1
    byBrand.set(f.brand, entry)
  }

  return Array.from(byBrand.entries())
    .map(([brand, { litres, amount, count }]) => ({
      brand,
      totalLitres: litres,
      totalNetAmount: amount,
      netPricePerLitre: litres > 0 ? amount / litres : 0,
      fillUpCount: count,
    }))
    .sort((a, b) => b.totalNetAmount - a.totalNetAmount)
}

export function computeOverallNetPricePerLitre(fillUps: FillUp[]): number | null {
  const totalLitres = fillUps.reduce((s, f) => s + f.litres, 0)
  const totalAmount = fillUps.reduce((s, f) => s + f.netAmount, 0)
  if (totalLitres <= 0) return null
  return totalAmount / totalLitres
}

export function computeMonthlySpend(fillUps: FillUp[]): MonthlySpend[] {
  const byMonth = new Map<string, { amount: number; litres: number }>()

  for (const f of fillUps) {
    const month = f.date.slice(0, 7) // YYYY-MM
    const entry = byMonth.get(month) ?? { amount: 0, litres: 0 }
    entry.amount += f.netAmount
    entry.litres += f.litres
    byMonth.set(month, entry)
  }

  return Array.from(byMonth.entries())
    .map(([month, { amount, litres }]) => ({
      month,
      totalNetAmount: amount,
      totalLitres: litres,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export interface BrandComparison {
  cheapest: BrandStat
  mostExpensive: BrandStat
  savingsPerTank: number // for a 40L tank
}

export function computeBrandComparison(brandStats: BrandStat[]): BrandComparison | null {
  const withData = brandStats.filter((b) => b.totalLitres > 0)
  if (withData.length < 2) return null

  const sorted = [...withData].sort((a, b) => a.netPricePerLitre - b.netPricePerLitre)
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]

  return {
    cheapest,
    mostExpensive,
    savingsPerTank: (mostExpensive.netPricePerLitre - cheapest.netPricePerLitre) * 40,
  }
}
