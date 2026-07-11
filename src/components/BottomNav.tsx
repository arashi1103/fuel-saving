import { NavLink } from 'react-router-dom'
import { useLanguage } from '../lib/useLanguage'

const TABS = [
  { to: '/', labelKey: 'nav.add', icon: '⛽' },
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: '📊' },
  { to: '/history', labelKey: 'nav.history', icon: '🕘' },
  { to: '/deals', labelKey: 'nav.deals', icon: '🏷️' },
]

export function BottomNav() {
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md grid grid-cols-4">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
