import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { activeDealsOn } from '../lib/deals'

export function DealBanner() {
  const deals = useLiveQuery(() => db.deals.toArray(), [])
  const today = new Date()
  const active = deals ? activeDealsOn(deals, today) : []

  if (active.length === 0) return null

  return (
    <div className="mx-4 mt-4 space-y-2">
      {active.map((deal) => (
        <div
          key={deal.id}
          className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-sm"
        >
          <span className="text-lg leading-none">🎉</span>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Today: {deal.brand} — {deal.title}
            </p>
            {deal.notes && (
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">{deal.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
