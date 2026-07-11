import type { Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null

async function getWorker() {
  if (!workerPromise) {
    const { createWorker } = await import('tesseract.js')
    workerPromise = createWorker('eng')
  }
  return workerPromise
}

export async function recognizeWithTesseract(image: Blob): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image)
  return data.text
}
