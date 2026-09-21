import { useState, useEffect, useCallback, useMemo } from 'react'
import type { TweakItem, TweakCategory } from '@shared/types'

export function useTweaks() {
  const [tweaks, setTweaks] = useState<TweakItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeCategory, setActiveCategory] = useState<TweakCategory>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [applyingRecommended, setApplyingRecommended] = useState<boolean>(false)
  const [pendingRestart, setPendingRestart] = useState<boolean>(false)
  const [restartingExplorer, setRestartingExplorer] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const loadTweaks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.mToolbox.tweaks.getAll()
      setTweaks(data)
    } catch (err) {
      console.error('Failed to load tweaks:', err)
      setToastMessage({ text: 'Fehler beim Laden der Tweaks.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTweaks()
  }, [loadTweaks])

  // Clear toast after 4s
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const toggleTweak = useCallback(async (tweakId: string, nextValue: boolean) => {
    try {
      setTogglingId(tweakId)
      // Optimistic update
      setTweaks((prev) =>
        prev.map((t) => (t.id === tweakId ? { ...t, value: nextValue } : t))
      )

      const result = await window.mToolbox.tweaks.setTweak(tweakId, nextValue)

      if (result.success) {
        setToastMessage({ text: result.message, type: 'success' })
        if (result.requiresRestart === 'explorer') {
          setPendingRestart(true)
        }
      } else {
        // Revert on failure
        setTweaks((prev) =>
          prev.map((t) => (t.id === tweakId ? { ...t, value: !nextValue } : t))
        )
        setToastMessage({ text: result.message, type: 'error' })
      }
    } catch (err: any) {
      console.error(`Failed to toggle tweak ${tweakId}:`, err)
      // Revert on exception
      setTweaks((prev) =>
        prev.map((t) => (t.id === tweakId ? { ...t, value: !nextValue } : t))
      )
      setToastMessage({
        text: `Unerwarteter Fehler: ${err?.message || 'Aktion fehlgeschlagen'}`,
        type: 'error'
      })
    } finally {
      setTogglingId(null)
    }
  }, [])

  const applyRecommended = useCallback(async () => {
    try {
      setApplyingRecommended(true)
      const result = await window.mToolbox.tweaks.applyRecommended()
      if (result.success) {
        setToastMessage({
          text: `${result.updatedCount} empfohlene Tweaks wurden erfolgreich angewendet.`,
          type: 'success'
        })
        if (result.requiresRestart) {
          setPendingRestart(true)
        }
      } else {
        setToastMessage({
          text: `Teilweise angewendet. Einige Tweaks (${result.failedIds.length}) erfordern Administratorrechte.`,
          type: 'error'
        })
      }
      await loadTweaks()
    } catch (err: any) {
      console.error('Failed to apply recommended tweaks:', err)
      setToastMessage({
        text: `Fehler beim Ausführen der Optimierung: ${err?.message || 'Unbekannt'}`,
        type: 'error'
      })
    } finally {
      setApplyingRecommended(false)
    }
  }, [loadTweaks])

  const restartExplorer = useCallback(async () => {
    try {
      setRestartingExplorer(true)
      const res = await window.mToolbox.tweaks.restartExplorer()
      if (res.success) {
        setPendingRestart(false)
        setToastMessage({ text: res.message, type: 'success' })
      } else {
        setToastMessage({ text: res.message, type: 'error' })
      }
    } catch (err: any) {
      setToastMessage({ text: `Fehler: ${err?.message || 'Konnte Explorer nicht neu starten'}`, type: 'error' })
    } finally {
      setRestartingExplorer(false)
    }
  }, [])

  const filteredTweaks = useMemo(() => {
    return tweaks.filter((t) => {
      const matchesCategory = activeCategory === 'all' || t.category === activeCategory
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [tweaks, activeCategory, searchQuery])

  const stats = useMemo(() => {
    const total = tweaks.length
    const activeCount = tweaks.filter((t) => t.value).length
    const recommendedCount = tweaks.filter((t) => t.recommendedValue).length
    const activeRecommendedCount = tweaks.filter(
      (t) => t.recommendedValue && t.value
    ).length

    return {
      total,
      activeCount,
      recommendedCount,
      activeRecommendedCount,
      allRecommendedApplied: recommendedCount > 0 && recommendedCount === activeRecommendedCount
    }
  }, [tweaks])

  return {
    tweaks: filteredTweaks,
    allTweaks: tweaks,
    loading,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    togglingId,
    applyingRecommended,
    pendingRestart,
    restartingExplorer,
    toastMessage,
    stats,
    toggleTweak,
    applyRecommended,
    restartExplorer,
    reload: loadTweaks
  }
}

