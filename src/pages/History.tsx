import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { db, getSettings, getSettingsLive } from '../lib/db'
import type { FillUp } from '../lib/types'
import { useLanguage } from '../lib/useLanguage'

function EditRow({ fillUp, onClose }: { fillUp: FillUp; onClose: () => void }) {
  const { t } = useLanguage()
  const [brand, setBrand] = useState(fillUp.brand)
  const [date, setDate] = useState(fillUp.date)
  const [litres, setLitres] = useState(String(fillUp.litres))
  const [netAmount, setNetAmount] = useState(String(fillUp.netAmount))
  const [odometer, setOdometer] = useState(String(fillUp.odometer))

  async function save() {
    await db.fillUps.put({
      ...fillUp,
      brand,
      date,
      litres: Number.parseFloat(litres),
      netAmount: Number.parseFloat(netAmount),
      odometer: Number.parseFloat(odometer),
    })
    onClose()
  }

  return (
    <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 p-3 space-y-2">
      <input
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
        placeholder={t('history.placeholderBrand')}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          step="0.01"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
          placeholder={t('history.placeholderOdometer')}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.01"
          value={litres}
          onChange={(e) => setLitres(e.target.value)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
          placeholder={t('history.placeholderLitres')}
        />
        <input
          type="number"
          step="0.01"
          value={netAmount}
          onChange={(e) => setNetAmount(e.target.value)}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
          placeholder={t('history.placeholderNetAmount')}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          className="flex-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-1.5"
        >
          {t('history.save')}
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-md bg-neutral-200 dark:bg-neutral-800 text-sm font-medium py-1.5"
        >
          {t('history.cancel')}
        </button>
      </div>
    </div>
  )
}

const STALE_BACKUP_DAYS = 14

export default function History() {
  const { t } = useLanguage()
  const fillUps = useLiveQuery(() => db.fillUps.orderBy('date').reverse().toArray(), [])
  const settings = useLiveQuery(getSettingsLive, [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [brandFilter, setBrandFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const brands = useMemo(
    () => Array.from(new Set((fillUps ?? []).map((f) => f.brand))).sort(),
    [fillUps],
  )

  const filtered = useMemo(
    () => (fillUps ?? []).filter((f) => !brandFilter || f.brand === brandFilter),
    [fillUps, brandFilter],
  )

  const backupStatus = useMemo(() => {
    if (!fillUps || fillUps.length === 0 || !settings) return null
    if (!settings.lastBackupAt) return 'never' as const
    const daysSince = (Date.now() - new Date(settings.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= STALE_BACKUP_DAYS ? ('stale' as const) : null
  }, [fillUps, settings])

  async function handleDelete(id: string) {
    if (!confirm(t('history.deleteConfirm'))) return
    await db.fillUps.delete(id)
  }

  async function handleExport() {
    const all = await db.fillUps.toArray()
    const deals = await db.deals.toArray()
    const exportable = all.map(({ receiptImage: _receiptImage, ...rest }) => rest)
    const blob = new Blob([JSON.stringify({ fillUps: exportable, deals }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fuel-saver-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    const current = await getSettings()
    await db.settings.put({ ...current, lastBackupAt: new Date().toISOString() })
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { fillUps?: FillUp[]; deals?: unknown[] }
      if (data.fillUps) {
        await db.fillUps.bulkPut(data.fillUps)
      }
      setImportMessage(t('history.imported', { count: data.fillUps?.length ?? 0 }))
    } catch (err) {
      setImportMessage(t('history.importFailed'))
      console.error(err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setImportMessage(null), 3000)
    }
  }

  return (
    <div>
      <PageHeader title={t('history.title')} subtitle={t('history.subtitle', { count: fillUps?.length ?? 0 })} />

      {backupStatus && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">{t('history.backupTitle')}</p>
          <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5 text-xs">
            {backupStatus === 'never'
              ? t('history.backupBodyNever')
              : t('history.backupBodyStale', {
                  date: settings?.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString() : '',
                })}
          </p>
        </div>
      )}

      <div className="px-4 flex items-center gap-2">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-sm flex-1"
        >
          <option value="">{t('history.allBrands')}</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="rounded-lg bg-neutral-200 dark:bg-neutral-800 px-3 py-1.5 text-sm font-medium"
        >
          {t('history.export')}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-neutral-200 dark:bg-neutral-800 px-3 py-1.5 text-sm font-medium"
        >
          {t('history.import')}
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
      </div>

      {importMessage && (
        <p className="px-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">{importMessage}</p>
      )}

      <div className="px-4 mt-3 space-y-2 pb-4">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-8">{t('history.empty')}</p>
        )}
        {filtered.map((f) =>
          editingId === f.id ? (
            <EditRow key={f.id} fillUp={f} onClose={() => setEditingId(null)} />
          ) : (
            <div
              key={f.id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 flex items-center justify-between text-sm"
            >
              <div>
                <p className="font-medium">
                  {f.brand} <span className="text-neutral-400 font-normal">· {f.date}</span>
                </p>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                  {f.litres.toFixed(2)} L · ${f.netAmount.toFixed(2)} · {f.odometer.toLocaleString()} km
                  {f.missedPrevious && ` · ${t('history.gap')}`}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditingId(f.id)}
                  className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs font-medium"
                >
                  {t('history.edit')}
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-1 text-xs font-medium"
                >
                  {t('history.delete')}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
