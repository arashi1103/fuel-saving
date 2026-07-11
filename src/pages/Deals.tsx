import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { PageHeader } from '../components/PageHeader'
import { db } from '../lib/db'
import { DAY_NAMES, describeDealRule } from '../lib/deals'
import type { Deal, DealRule } from '../lib/types'
import { KNOWN_BRANDS } from '../lib/types'

interface DealForm {
  brand: string
  customBrand: string
  title: string
  ruleType: DealRule['type']
  days: number[]
  start: string
  end: string
  notes: string
}

function emptyForm(): DealForm {
  return {
    brand: '',
    customBrand: '',
    title: '',
    ruleType: 'weekly',
    days: [],
    start: '',
    end: '',
    notes: '',
  }
}

function buildRule(form: DealForm): DealRule {
  if (form.ruleType === 'weekly') return { type: 'weekly', days: form.days }
  if (form.ruleType === 'dateRange') return { type: 'dateRange', start: form.start, end: form.end }
  return { type: 'always' }
}

export default function Deals() {
  const deals = useLiveQuery(() => db.deals.toArray(), [])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<DealForm>(emptyForm())

  function update<K extends keyof DealForm>(key: K, value: DealForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const brand = form.brand === 'Other' || !form.brand ? form.customBrand.trim() : form.brand
    if (!brand || !form.title.trim()) return

    const deal: Deal = {
      id: uuid(),
      brand,
      title: form.title.trim(),
      rule: buildRule(form),
      notes: form.notes.trim() || undefined,
      enabled: true,
    }
    await db.deals.put(deal)
    setForm(emptyForm())
    setShowForm(false)
  }

  async function toggleEnabled(deal: Deal) {
    await db.deals.put({ ...deal, enabled: !deal.enabled })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this deal reminder?')) return
    await db.deals.delete(id)
  }

  return (
    <div>
      <PageHeader title="Deals" subtitle="Brand discount reminders" />

      <div className="px-4 space-y-2">
        {(deals ?? []).map((deal) => (
          <div
            key={deal.id}
            className={`rounded-lg border p-3 text-sm ${
              deal.enabled
                ? 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                : 'border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {deal.brand} — {deal.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {describeDealRule(deal)}
                </p>
                {deal.notes && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{deal.notes}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 items-end shrink-0 ml-2">
                <button
                  onClick={() => toggleEnabled(deal)}
                  className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs font-medium"
                >
                  {deal.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(deal.id)}
                  className="rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-1 text-xs font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {deals && deals.length === 0 && (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-8">
            No deals yet. Add one below.
          </p>
        )}
      </div>

      <div className="px-4 mt-4">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-sm font-medium py-2.5 text-neutral-600 dark:text-neutral-400"
          >
            + Add deal reminder
          </button>
        ) : (
          <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
            <div>
              <label className="block text-xs font-medium mb-1">Brand</label>
              <select
                value={form.brand}
                onChange={(e) => update('brand', e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
              >
                <option value="">Select brand…</option>
                {KNOWN_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Other">Other…</option>
              </select>
              {(form.brand === 'Other' || !form.brand) && (
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={form.customBrand}
                  onChange={(e) => update('customBrand', e.target.value)}
                  className="mt-2 w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Deal title</label>
              <input
                type="text"
                placeholder="e.g. Free petrol upgrade"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">When</label>
              <select
                value={form.ruleType}
                onChange={(e) => update('ruleType', e.target.value as DealRule['type'])}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
              >
                <option value="weekly">Specific day(s) of week</option>
                <option value="dateRange">Date range</option>
                <option value="always">Ongoing / always</option>
              </select>
            </div>

            {form.ruleType === 'weekly' && (
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((name, idx) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => toggleDay(idx)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      form.days.includes(idx)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {form.ruleType === 'dateRange' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.start}
                  onChange={(e) => update('start', e.target.value)}
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={form.end}
                  onChange={(e) => update('end', e.target.value)}
                  className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={2}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2"
              >
                Save deal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyForm())
                }}
                className="flex-1 rounded-md bg-neutral-200 dark:bg-neutral-800 text-sm font-medium py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
