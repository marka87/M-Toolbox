import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  BloatwareApp,
  BloatwareSafety,
  BloatwareCategory,
  BloatwareBatchProgress
} from '@shared/types'

export function useBloatware() {
  const [apps, setApps] = useState<BloatwareApp[]>([])
  const [loading, setLoading] = useState(true)
  const [isUninstalling, setIsUninstalling] = useState(false)
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<BloatwareBatchProgress | null>(null)
  const [filterSafety, setFilterSafety] = useState<BloatwareSafety | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<BloatwareCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const scan = useCallback(async () => {
    if (!window.mToolbox?.bloatware) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await window.mToolbox.bloatware.scan()
      setApps(result)
    } catch (err) {
      console.error('[useBloatware] Scan error:', err)
      setApps([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scan()

    if (!window.mToolbox?.bloatware) return

    const unsubscribe = window.mToolbox.bloatware.onProgress((event: BloatwareBatchProgress) => {
      setProgress(event)
    })

    return () => {
      unsubscribe()
    }
  }, [scan])

  const toggleSelect = (id: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAllSafe = () => {
    const safeIds = apps.filter((a) => a.safety === 'safe' && a.isRemovable).map((a) => a.id)
    setSelectedAppIds(new Set(safeIds))
  }

  const clearSelection = () => {
    setSelectedAppIds(new Set())
  }

  const uninstallSingle = async (appId: string): Promise<boolean> => {
    if (!window.mToolbox?.bloatware) return false
    setIsUninstalling(true)
    try {
      const res = await window.mToolbox.bloatware.uninstall(appId)
      if (res.success) {
        setApps((prev) => prev.filter((a) => a.id !== appId))
        setSelectedAppIds((prev) => {
          const next = new Set(prev)
          next.delete(appId)
          return next
        })
      }
      return res.success
    } catch (err) {
      console.error('[useBloatware] Uninstall error:', err)
      return false
    } finally {
      setIsUninstalling(false)
    }
  }

  const uninstallBatch = async (ids?: string[]): Promise<void> => {
    if (!window.mToolbox?.bloatware) return
    const targetIds = ids || Array.from(selectedAppIds)
    if (targetIds.length === 0) return

    setIsUninstalling(true)
    try {
      const { succeeded } = await window.mToolbox.bloatware.batchUninstall(targetIds)
      const succSet = new Set(succeeded)
      setApps((prev) => prev.filter((a) => !succSet.has(a.id)))
      setSelectedAppIds((prev) => {
        const next = new Set(prev)
        succeeded.forEach((id) => next.delete(id))
        return next
      })
    } catch (err) {
      console.error('[useBloatware] Batch uninstall error:', err)
    } finally {
      setIsUninstalling(false)
      setProgress(null)
    }
  }

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesSafety = filterSafety === 'all' || app.safety === filterSafety
      const matchesCat = filterCategory === 'all' || app.category === filterCategory
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        app.displayName.toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q)

      return matchesSafety && matchesCat && matchesSearch
    })
  }, [apps, filterSafety, filterCategory, searchQuery])

  const safeCount = useMemo(() => apps.filter((a) => a.safety === 'safe').length, [apps])
  const optionalCount = useMemo(() => apps.filter((a) => a.safety === 'optional').length, [apps])
  const cautionCount = useMemo(() => apps.filter((a) => a.safety === 'caution').length, [apps])

  return {
    apps,
    filteredApps,
    loading,
    isUninstalling,
    selectedAppIds,
    progress,
    filterSafety,
    setFilterSafety,
    filterCategory,
    setFilterCategory,
    searchQuery,
    setSearchQuery,
    safeCount,
    optionalCount,
    cautionCount,
    scan,
    toggleSelect,
    selectAllSafe,
    clearSelection,
    uninstallSingle,
    uninstallBatch
  }
}
