import { useLanguage } from '../lib/useLanguage'

export function LangToggle() {
  const { language, setLanguage } = useLanguage()
  const next = language === 'en' ? 'zh-Hant' : 'en'
  const label = language === 'en' ? '繁中' : 'EN'

  return (
    <button
      onClick={() => setLanguage(next)}
      className="fixed top-3 right-3 z-30 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 shadow-sm"
    >
      {label}
    </button>
  )
}
