import { KNOWN_BRANDS } from './types'

export interface ParsedReceipt {
  brand: string | null
  netAmount: number | null
  litres: number | null
  date: string | null // ISO date
  confidence: {
    brand: boolean
    netAmount: boolean
    litres: boolean
    date: boolean
  }
}

const NET_AMOUNT_LABELS = /(total|net\s*amount|amount\s*due|payable|grand\s*total|visa|mastercard|paid|amount\s*paid)/i
const EXCLUDE_LABELS = /(discount|rebate|save|saving|offset|original|subtotal|less|coupon|redeemed|points)/i

function findBrand(text: string): string | null {
  const lower = text.toLowerCase()
  for (const brand of KNOWN_BRANDS) {
    if (lower.includes(brand.toLowerCase())) return brand
  }
  return null
}

function moneyValuesInLine(line: string): number[] {
  const matches = line.match(/(?:\$|HK\$|USD|SGD)?\s*(\d{1,5}(?:[.,]\d{2}))/g) ?? []
  return matches
    .map((m) => Number.parseFloat(m.replace(/[^0-9.]/g, '')))
    .filter((n) => !Number.isNaN(n) && n > 0)
}

/**
 * Finds the NET / final amount paid. Receipts list several money lines
 * (subtotal, discounts, redeemed points, final total) — this deliberately
 * ignores anything that looks like a discount/subtotal line and instead
 * scans for the last line matching a "total paid" style label. If no
 * labelled line is found, falls back to the largest money value on the
 * receipt (typically the grand total is the largest single figure).
 */
function findNetAmount(lines: string[]): { amount: number | null; confident: boolean } {
  let lastLabelledAmount: number | null = null

  for (const line of lines) {
    if (EXCLUDE_LABELS.test(line)) continue
    if (!NET_AMOUNT_LABELS.test(line)) continue
    const values = moneyValuesInLine(line)
    if (values.length > 0) {
      lastLabelledAmount = values[values.length - 1]
    }
  }

  if (lastLabelledAmount !== null) {
    return { amount: lastLabelledAmount, confident: true }
  }

  const allValues = lines
    .filter((l) => !EXCLUDE_LABELS.test(l))
    .flatMap((l) => moneyValuesInLine(l))
  if (allValues.length > 0) {
    return { amount: Math.max(...allValues), confident: false }
  }

  return { amount: null, confident: false }
}

function findLitres(text: string): number | null {
  const match = text.match(/(\d+\.\d{1,3})\s*(?:L\b|Litre|Liter|公升)/i)
  if (match) return Number.parseFloat(match[1])
  return null
}

function findDate(text: string): string | null {
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // YYYY-MM-DD
  const ymd = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)

  const brand = findBrand(rawText)
  const { amount: netAmount, confident: amountConfident } = findNetAmount(lines)
  const litres = findLitres(rawText)
  const date = findDate(rawText)

  return {
    brand,
    netAmount,
    litres,
    date,
    confidence: {
      brand: brand !== null,
      netAmount: amountConfident,
      litres: litres !== null,
      date: date !== null,
    },
  }
}
