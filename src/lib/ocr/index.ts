import { parseReceiptText, type ParsedReceipt } from '../parser'
import { recognizeWithTesseract } from './tesseract'

export interface ReceiptDraft extends ParsedReceipt {
  rawText: string
}

/**
 * Runs OCR then the field parser over a receipt image. Swap the
 * implementation here (e.g. for an LLM-vision backend) without touching
 * callers — they only depend on this function's signature.
 */
export async function extractReceipt(image: Blob): Promise<ReceiptDraft> {
  const rawText = await recognizeWithTesseract(image)
  const parsed = parseReceiptText(rawText)
  return { ...parsed, rawText }
}
