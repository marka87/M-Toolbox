import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AppLanguage } from '@shared/types'
import { de, type TranslationDict } from './locales/de'
import { en } from './locales/en'

interface LanguageContextType {
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => void
  t: TranslationDict
}

const DICTIONARIES: Record<AppLanguage, TranslationDict> = {
  de,
  en
}

const STORAGE_KEY = 'M_TOOLBOX_LANGUAGE'

const LanguageContext = createContext<LanguageContextType>({
  language: 'de',
  setLanguage: () => {},
  t: de
})

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'de' || stored === 'en') return stored
    } catch {
      // ignore
    }
    return 'de'
  })

  // Synchronize initial language from electron SettingsService if available
  useEffect(() => {
    if (window.mToolbox?.settings?.getSettings) {
      window.mToolbox.settings.getSettings().then((s) => {
        if (s?.language && (s.language === 'de' || s.language === 'en')) {
          setLanguageState(s.language)
          try {
            localStorage.setItem(STORAGE_KEY, s.language)
          } catch {
            // ignore
          }
        }
      }).catch(() => {})
    }
  }, [])

  // Sync cross-window language changes (e.g. Settings changed in Main window -> Mini HUD updates immediately)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'de' || e.newValue === 'en')) {
        setLanguageState(e.newValue as AppLanguage)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
    if (window.mToolbox?.settings?.saveSettings) {
      window.mToolbox.settings.saveSettings({ language: lang }).catch(() => {})
    }
  }, [])

  const t = DICTIONARIES[language] || de

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
