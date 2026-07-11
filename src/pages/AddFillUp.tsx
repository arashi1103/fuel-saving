import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { DealBanner } from '../components/DealBanner'
import { PageHeader } from '../components/PageHeader'
import { db } from '../lib/db'
import { extractReceipt } from '../lib/ocr'
import { KNOWN_BRANDS } from '../lib/types'
import { useLanguage } from '../lib/useLanguage'

interface DraftForm {
  brand: string
  customBrand: string
  date: string
  litres: string
  netAmount: string
  odometer: string
  stationName: string
  missedPrevious: boolean
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): DraftForm {
  return {
    brand: '',
    customBrand: '',
    date: todayIso(),
    litres: '',
    netAmount: '',
    odometer: '',
    stationName: '',
    missedPrevious: false,
  }
}

export default function AddFillUp() {
  const { t } = useLanguage()
  const [form, setForm] = useState<DraftForm>(emptyForm())
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, boolean> | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const lastFillUp = useLiveQuery(
    () => db.fillUps.orderBy('odometer').last(),
    [],
  )

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setReceiptBlob(file)
    setPreviewUrl(URL.createObjectURL(file))
    setOcrRunning(true)
    try {
      const draft = await extractReceipt(file)
      setForm((f) => ({
        ...f,
        brand: draft.brand && KNOWN_BRANDS.includes(draft.brand as (typeof KNOWN_BRANDS)[number]) ? draft.brand : '',
        customBrand: draft.brand && !KNOWN_BRANDS.includes(draft.brand as (typeof KNOWN_BRANDS)[number]) ? draft.brand : '',
        date: draft.date ?? f.date,
        litres: draft.litres != null ? String(draft.litres) : f.litres,
        netAmount: draft.netAmount != null ? String(draft.netAmount) : f.netAmount,
      }))
      setOcrConfidence(draft.confidence)
    } catch (err) {
      setError(t('add.ocrError'))
      console.error(err)
    } finally {
      setOcrRunning(false)
    }
  }

  function update<K extends keyof DraftForm>(key: K, value: DraftForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const resolvedBrand = form.brand === 'Other' || !form.brand ? form.customBrand.trim() : form.brand

  const odometerNum = Number.parseFloat(form.odometer)
  const odometerWarning =
    lastFillUp && !Number.isNaN(odometerNum) && odometerNum <= lastFillUp.odometer
      ? t('add.odometerWarning', { km: lastFillUp.odometer.toLocaleString() })
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const litres = Number.parseFloat(form.litres)
    const netAmount = Number.parseFloat(form.netAmount)
    const odometer = Number.parseFloat(form.odometer)

    if (!resolvedBrand) {
      setError(t('add.errBrand'))
      return
    }
    if (Number.isNaN(litres) || litres <= 0) {
      setError(t('add.errLitres'))
      return
    }
    if (Number.isNaN(netAmount) || netAmount <= 0) {
      setError(t('add.errNetAmount'))
      return
    }
    if (Number.isNaN(odometer) || odometer <= 0) {
      setError(t('add.errOdometer'))
      return
    }

    await db.fillUps.put({
      id: uuid(),
      date: form.date,
      brand: resolvedBrand,
      litres,
      netAmount,
      odometer,
      stationName: form.stationName.trim() || undefined,
      receiptImage: receiptBlob ?? undefined,
      missedPrevious: form.missedPrevious,
      createdAt: new Date().toISOString(),
    })

    setSaveMessage(t('add.saved'))
    setForm(emptyForm())
    setReceiptBlob(null)
    setPreviewUrl(null)
    setOcrConfidence(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setSaveMessage(null), 2500)
  }

  const confidenceBadge = (field: string) =>
    ocrConfidence && field in ocrConfidence
      ? ocrConfidence[field]
        ? null
        : <span className="ml-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">{t('add.verify')}</span>
      : null

  return (
    <div>
      <PageHeader title={t('add.title')} subtitle={t('add.subtitle')} />
      <DealBanner />

      <div className="px-4 mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="receipt-upload">
            {t('add.receiptLabel')}
          </label>
          <input
            ref={fileInputRef}
            id="receipt-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-neutral-600 dark:text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-white file:text-sm file:font-medium"
          />
          {previewUrl && (
            <img src={previewUrl} alt="Receipt preview" className="mt-2 max-h-48 rounded-lg border border-neutral-200 dark:border-neutral-800" />
          )}
          {ocrRunning && <p className="mt-2 text-sm text-neutral-500">{t('add.reading')}</p>}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {saveMessage && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {saveMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="brand">
              {t('add.brand')} {confidenceBadge('brand')}
            </label>
            <select
              id="brand"
              value={form.brand}
              onChange={(e) => update('brand', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
            >
              <option value="">{t('add.selectBrand')}</option>
              {KNOWN_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Other">{t('add.other')}</option>
            </select>
            {(form.brand === 'Other' || !form.brand) && (
              <input
                type="text"
                placeholder={t('add.enterBrandName')}
                value={form.customBrand}
                onChange={(e) => update('customBrand', e.target.value)}
                className="mt-2 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="date">
                {t('add.date')} {confidenceBadge('date')}
              </label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="litres">
                {t('add.litres')} {confidenceBadge('litres')}
              </label>
              <input
                id="litres"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder={t('add.litresPlaceholder')}
                value={form.litres}
                onChange={(e) => update('litres', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="netAmount">
              {t('add.netAmount')} {confidenceBadge('netAmount')}
            </label>
            <input
              id="netAmount"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder={t('add.netAmountPlaceholder')}
              value={form.netAmount}
              onChange={(e) => update('netAmount', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">{t('add.netAmountHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="odometer">
              {t('add.odometer')}
            </label>
            <input
              id="odometer"
              type="number"
              step="1"
              inputMode="numeric"
              placeholder={t('add.odometerPlaceholder')}
              value={form.odometer}
              onChange={(e) => update('odometer', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
            />
            {odometerWarning && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{odometerWarning}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="stationName">
              {t('add.stationName')}
            </label>
            <input
              id="stationName"
              type="text"
              value={form.stationName}
              onChange={(e) => update('stationName', e.target.value)}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm"
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.missedPrevious}
              onChange={(e) => update('missedPrevious', e.target.checked)}
              className="mt-0.5"
            />
            <span>{t('add.missedPrevious')}</span>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 text-sm transition-colors"
          >
            {t('add.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
