import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DealBanner } from '../components/DealBanner'
import { PageHeader } from '../components/PageHeader'
import { db } from '../lib/db'
import {
  computeBrandComparison,
  computeBrandStats,
  computeIntervalStats,
  computeMonthlySpend,
  computeOverallCostPerKm,
  computeOverallNetPricePerLitre,
} from '../lib/stats'
import { useLanguage } from '../lib/useLanguage'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useLanguage()
  const fillUps = useLiveQuery(() => db.fillUps.toArray(), [])

  const overallCostPerKm = useMemo(() => (fillUps ? computeOverallCostPerKm(fillUps) : null), [fillUps])
  const overallNetPricePerLitre = useMemo(
    () => (fillUps ? computeOverallNetPricePerLitre(fillUps) : null),
    [fillUps],
  )
  const brandStats = useMemo(() => (fillUps ? computeBrandStats(fillUps) : []), [fillUps])
  const brandComparison = useMemo(() => computeBrandComparison(brandStats), [brandStats])
  const intervalStats = useMemo(() => (fillUps ? computeIntervalStats(fillUps) : []), [fillUps])
  const monthlySpend = useMemo(() => (fillUps ? computeMonthlySpend(fillUps) : []), [fillUps])

  const consumptionSeries = intervalStats.map((s) => ({
    date: s.fillUp.date,
    'L/100km': Number(s.litresPer100km.toFixed(2)),
  }))

  const monthlySpendSeries = monthlySpend.map((m) => ({
    month: m.month,
    spend: Number(m.totalNetAmount.toFixed(2)),
  }))

  if (fillUps && fillUps.length === 0) {
    return (
      <div>
        <PageHeader title={t('dashboard.title')} />
        <DealBanner />
        <div className="px-4 mt-8 text-center text-neutral-500 dark:text-neutral-400 text-sm">
          {t('dashboard.empty')}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('dashboard.title')} />
      <DealBanner />

      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <StatCard
          label={t('dashboard.costPerKm')}
          value={overallCostPerKm != null ? `$${overallCostPerKm.toFixed(3)}` : '—'}
        />
        <StatCard
          label={t('dashboard.avgNetPrice')}
          value={overallNetPricePerLitre != null ? `$${overallNetPricePerLitre.toFixed(2)}` : '—'}
        />
      </div>

      {brandComparison && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
            💡{' '}
            {t('dashboard.insight', {
              cheapBrand: brandComparison.cheapest.brand,
              cheapPrice: brandComparison.cheapest.netPricePerLitre.toFixed(2),
              expBrand: brandComparison.mostExpensive.brand,
              expPrice: brandComparison.mostExpensive.netPricePerLitre.toFixed(2),
            })}
          </p>
          <p className="text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            {t('dashboard.insightSub', { savings: brandComparison.savingsPerTank.toFixed(2) })}
          </p>
        </div>
      )}

      <div className="px-4 mt-5">
        <h2 className="text-sm font-semibold mb-2">{t('dashboard.byBrand')}</h2>
        <div className="space-y-1.5">
          {brandStats.map((b) => (
            <div
              key={b.brand}
              className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
            >
              <span className="font-medium">{b.brand}</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                ${b.netPricePerLitre.toFixed(2)}/L ·{' '}
                {t(
                  b.fillUpCount === 1 ? 'dashboard.fillUpCount.one' : 'dashboard.fillUpCount.other',
                  { count: b.fillUpCount },
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {consumptionSeries.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-semibold mb-2">{t('dashboard.consumptionTrend')}</h2>
          <div className="h-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consumptionSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="L/100km" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {monthlySpendSeries.length > 0 && (
        <div className="px-4 mt-6 mb-6">
          <h2 className="text-sm font-semibold mb-2">{t('dashboard.monthlySpend')}</h2>
          <div className="h-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySpendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="spend" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
