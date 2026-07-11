import { describe, expect, it } from 'vitest'
import { parseReceiptText } from './parser'

describe('parseReceiptText', () => {
  it('picks the net/final amount and ignores discount lines', () => {
    const receipt = `
      CALTEX STAR MART
      Date: 11/07/2026
      Unleaded 95     45.230 L
      Subtotal              $452.30
      Member Discount       -$20.00
      Original Price        $472.30
      Amount Paid (VISA)    $432.30
    `
    const parsed = parseReceiptText(receipt)
    expect(parsed.brand).toBe('Caltex')
    expect(parsed.netAmount).toBe(432.3)
    expect(parsed.litres).toBe(45.23)
    expect(parsed.date).toBe('2026-07-11')
  })

  it('falls back to the largest non-excluded value when no labelled total exists', () => {
    const receipt = `
      SHELL
      95 Octane   30.00L
      $300.00
    `
    const parsed = parseReceiptText(receipt)
    expect(parsed.brand).toBe('Shell')
    expect(parsed.netAmount).toBe(300)
    expect(parsed.confidence.netAmount).toBe(false)
  })

  it('returns nulls with low confidence when nothing matches', () => {
    const parsed = parseReceiptText('random unrelated text with no numbers')
    expect(parsed.brand).toBeNull()
    expect(parsed.netAmount).toBeNull()
    expect(parsed.litres).toBeNull()
  })
})
