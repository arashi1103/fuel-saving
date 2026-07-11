import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, getSettings, getSettingsLive } from './db'
import { translate } from './i18n'
import type { Language } from './types'

export function useLanguage() {
  const settings = useLiveQuery(getSettingsLive, [])
  const language: Language = settings?.language ?? DEFAULT_SETTINGS.language

  async function setLanguage(next: Language) {
    const current = await getSettings()
    await db.settings.put({ ...current, language: next })
  }

  function t(key: string, vars?: Record<string, string | number>) {
    return translate(language, key, vars)
  }

  return { language, setLanguage, t }
}
