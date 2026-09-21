import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, AccentColor, AppTheme, UpdateCheckResult, AppVersionInfo } from '@shared/types'

export const ACCENT_COLOR_CONFIG: Record<AccentColor, { label: string; hex: string; hover: string; muted: string; ring: string }> = {
  blue: {
    label: 'Windows Blau',
    hex: '#0078d4',
    hover: '#1084d9',
    muted: 'rgba(0, 120, 212, 0.15)',
    ring: 'ring-blue-500'
  },
  indigo: {
    label: 'Modern Indigo',
    hex: '#6366f1',
    hover: '#818cf8',
    muted: 'rgba(99, 102, 241, 0.15)',
    ring: 'ring-indigo-500'
  },
  emerald: {
    label: 'Smaragd Grün',
    hex: '#10b981',
    hover: '#34d399',
    muted: 'rgba(16, 185, 129, 0.15)',
    ring: 'ring-emerald-500'
  },
  rose: {
    label: 'Rosa / Crimson',
    hex: '#f43f5e',
    hover: '#fb7185',
    muted: 'rgba(244, 63, 94, 0.15)',
    ring: 'ring-rose-500'
  },
  amber: {
    label: 'Bernstein Gold',
    hex: '#f59e0b',
    hover: '#fbbf24',
    muted: 'rgba(245, 158, 11, 0.15)',
    ring: 'ring-amber-500'
  }
}

export function applyAccentToDom(accent: AccentColor) {
  const config = ACCENT_COLOR_CONFIG[accent] || ACCENT_COLOR_CONFIG.blue
  const root = document.documentElement
  root.style.setProperty('--fluent-accent', config.hex)
  root.style.setProperty('--fluent-accent-hover', config.hover)
  root.style.setProperty('--fluent-accent-muted', config.muted)
}

export function applyThemeToDom(theme: AppTheme) {
  const root = document.documentElement
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', isDark)
  } else if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [appInfo, setAppInfo] = useState<AppVersionInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [checkingUpdates, setCheckingUpdates] = useState<boolean>(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Fetch initial settings & app info
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [fetchedSettings, fetchedInfo] = await Promise.all([
        window.mToolbox.settings.getSettings(),
        window.mToolbox.settings.getAppInfo()
      ])
      setSettings(fetchedSettings)
      setAppInfo(fetchedInfo)

      if (fetchedSettings) {
        applyAccentToDom(fetchedSettings.accentColor)
        applyThemeToDom(fetchedSettings.theme)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save single or multiple settings
  const updateSettings = async (partial: Partial<AppSettings>) => {
    if (!settings) return false
    const optimistic = { ...settings, ...partial }
    setSettings(optimistic)

    if (partial.accentColor) {
      applyAccentToDom(partial.accentColor)
    }
    if (partial.theme) {
      applyThemeToDom(partial.theme)
    }

    try {
      const res = await window.mToolbox.settings.saveSettings(partial)
      if (res) {
        setSettings(res)
        setSaveStatus('Gespeichert')
        setTimeout(() => setSaveStatus(null), 2500)
        return true
      }
      return false
    } catch (err: any) {
      setSaveStatus(`Fehler: ${err?.message || 'Unbekannt'}`)
      return false
    }
  }

  // Check for GitHub updates
  const checkForUpdates = async () => {
    try {
      setCheckingUpdates(true)
      const result = await window.mToolbox.settings.checkUpdates()
      setUpdateResult(result)
      return result
    } catch (err) {
      console.error('Update check failed:', err)
      return null
    } finally {
      setCheckingUpdates(false)
    }
  }

  // Clear cache
  const clearCache = async () => {
    try {
      return await window.mToolbox.settings.clearCache()
    } catch (err: any) {
      return { success: false, message: err?.message || 'Cache konnte nicht geleert werden' }
    }
  }

  // Reset all settings to default
  const resetSettings = async () => {
    try {
      const res = await window.mToolbox.settings.resetSettings()
      if (res) {
        setSettings(res)
        applyAccentToDom(res.accentColor)
        applyThemeToDom(res.theme)
      }
      return { success: true, settings: res }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Einstellungen konnten nicht zurückgesetzt werden' }
    }
  }

  // Open AppData directory in Explorer
  const openUserDataFolder = async () => {
    try {
      await window.mToolbox.settings.openUserDataFolder()
    } catch (err) {
      console.error('Failed to open user data folder:', err)
    }
  }

  return {
    settings,
    appInfo,
    loading,
    checkingUpdates,
    updateResult,
    saveStatus,
    updateSettings,
    checkForUpdates,
    clearCache,
    resetSettings,
    openUserDataFolder,
    refresh: loadData
  }
}

