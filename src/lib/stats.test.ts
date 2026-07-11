import { describe, expect, it } from 'vitest'
import {
  computeBrandComparison,
  computeBrandStats,
  computeIntervalStats,
  computeMonthlySpend,
  computeOverallCostPerKm,
  computeOverallNetPricePerLitre,
} from './stats'
import type { FillUp } from './types'

function makeFillUp(overrides: Partial<FillUp>): FillUp {
  return {
    id: crypto.randomUUID(),
    date: '2026-01-01',
    brand: 'Shell',
    litres: 40,
    netAmount: 400,
    odometer: 1000,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeIntervalStats', () => {
  it('excludes the first fill-up (no prior odometer)', () => {
    const fillUps = [makeFillUp({ odometer: 1000 })]
    expect(computeIntervalStats(fillUps)).toHaveLength(0)
  })

  it('computes cost per km and consumption between consecutive fill-ups', () => {
    const fillUps = [
      makeFillUp({ odometer: 1000, netAmount: 400, litres: 40, date: '2026-01-01' }),
      makeFillUp({ odometer: 1500, netAmount: 450, litres: 45, date: '2026-01-15' }),
    ]
    const stats = computeIntervalStats(fillUps)
    expect(stats).toHaveLength(1)
    expect(stats[0].distanceKm).toBe(500)
    expect(stats[0].costPerKm).toBeCloseTo(450 / 500)
    expect(stats[0].litresPer100km).toBeCloseTo((45 / 500) * 100)
  })

  it('skips intervals flagged missedPrevious', () => {
    const fillUps = [
      makeFillUp({ odometer: 1000, date: '2026-01-01' }),
      makeFillUp({ odometer: 2000, date: '2026-02-01', missedPrevious: true }),
    ]
    expect(computeIntervalStats(fillUps)).toHaveLength(0)
  })

  it('handles out-of-order input by sorting on odometer', () => {
    const fillUps = [
      makeFillUp({ odometer: 1500, netAmount: 450, litres: 45, date: '2026-01-15' }),
      makeFillUp({ odometer: 1000, netAmount: 400, litres: 40, date: '2026-01-01' }),
    ]
    const stats = computeIntervalStats(fillUps)
    expect(stats).toHaveLength(1)
    expect(stats[0].distanceKm).toBe(500)
  })
})

describe('computeOverallCostPerKm', () => {
  it('returns null with fewer than 2 fill-ups', () => {
    expect(computeOverallCostPerKm([makeFillUp({})])).toBeNull()
  })

  it('divides total spend (excluding first) by total distance', () => {
    const fillUps = [
      makeFillUp({ odometer: 1000, netAmount: 400 }),
      makeFillUp({ odometer: 1500, netAmount: 450 }),
      makeFillUp({ odometer: 2000, netAmount: 500 }),
    ]
    expect(computeOverallCostPerKm(fillUps)).toBeCloseTo((450 + 500) / 1000)
  })
})

describe('computeBrandStats', () => {
  it('computes volume-weighted average net price per litre, not mean of unit prices', () => {
    const fillUps = [
      makeFillUp({ brand: 'Shell', litres: 10, netAmount: 100 }), // $10/L
      makeFillUp({ brand: 'Shell', litres: 40, netAmount: 360 }), // $9/L
    ]
    const stats = computeBrandStats(fillUps)
    expect(stats).toHaveLength(1)
    // volume-weighted: (100+360)/(10+40) = 9.2, NOT mean(10,9) = 9.5
    expect(stats[0].netPricePerLitre).toBeCloseTo(9.2)
    expect(stats[0].netPricePerLitre).not.toBeCloseTo(9.5)
  })

  it('groups separately by brand', () => {
    const fillUps = [
      makeFillUp({ brand: 'Shell', litres: 40, netAmount: 400 }),
      makeFillUp({ brand: 'Caltex', litres: 40, netAmount: 360 }),
    ]
    const stats = computeBrandStats(fillUps)
    expect(stats.map((s) => s.brand).sort()).toEqual(['Caltex', 'Shell'])
  })
})

describe('computeOverallNetPricePerLitre', () => {
  it('returns null with no litres', () => {
    expect(computeOverallNetPricePerLitre([])).toBeNull()
  })

  it('computes volume-weighted overall average', () => {
    const fillUps = [
      makeFillUp({ litres: 10, netAmount: 100 }),
      makeFillUp({ litres: 40, netAmount: 360 }),
    ]
    expect(computeOverallNetPricePerLitre(fillUps)).toBeCloseTo(9.2)
  })
})

describe('computeMonthlySpend', () => {
  it('groups by YYYY-MM and sorts ascending', () => {
    const fillUps = [
      makeFillUp({ date: '2026-02-05', netAmount: 100, litres: 10 }),
      makeFillUp({ date: '2026-01-05', netAmount: 200, litres: 20 }),
      makeFillUp({ date: '2026-01-20', netAmount: 50, litres: 5 }),
    ]
    const spend = computeMonthlySpend(fillUps)
    expect(spend.map((s) => s.month)).toEqual(['2026-01', '2026-02'])
    expect(spend[0].totalNetAmount).toBe(250)
    expect(spend[0].totalLitres).toBe(25)
  })
})

describe('computeBrandComparison', () => {
  it('returns null with fewer than 2 brands', () => {
    const fillUps = [makeFillUp({ brand: 'Shell' })]
    expect(computeBrandComparison(computeBrandStats(fillUps))).toBeNull()
  })

  it('identifies cheapest/most expensive brand and per-tank savings', () => {
    const fillUps = [
      makeFillUp({ brand: 'Shell', litres: 40, netAmount: 400 }), // $10/L
      makeFillUp({ brand: 'Caltex', litres: 40, netAmount: 360 }), // $9/L
    ]
    const comparison = computeBrandComparison(computeBrandStats(fillUps))
    expect(comparison).not.toBeNull()
    expect(comparison!.cheapest.brand).toBe('Caltex')
    expect(comparison!.mostExpensive.brand).toBe('Shell')
    expect(comparison!.savingsPerTank).toBeCloseTo(40) // $1/L * 40L tank
  })
})
