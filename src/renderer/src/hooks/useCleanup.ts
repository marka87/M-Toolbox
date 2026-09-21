import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  CleanupCategoryItem,
  DiskStorageInfo,
  CleanupProgressEvent,
  CleanupResult
} from '@shared/types'

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function useCleanup() {
  const [categories, setCategories] = useState<CleanupCategoryItem[]>([])
  const [disks, setDisks] = useState<DiskStorageInfo[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isScanning, setIsScanning] = useState<boolean>(true)
  const [isCleaning, setIsCleaning] = useState<boolean>(false)
  const [progress, setProgress] = useState<CleanupProgressEvent | null>(null)
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null)
  const [showResultModal, setShowResultModal] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Scan ausführen
  const scan = useCallback(async () => {
    setIsScanning(true)
    setError(null)
    try {
      const res = await window.mToolbox.cleanup.scan()
      setCategories(res.categories || [])
      setDisks(res.disks || [])

      // Initial alle Kategorien mit gefundenen Daten markieren
      const initialSelected = new Set<string>()
      for (const cat of res.categories || []) {
        if (cat.sizeBytes > 0) {
          initialSelected.add(cat.id)
        }
      }
      setSelectedIds(initialSelected)
    } catch (err: any) {
      console.error('[useCleanup] Fehler beim Scan:', err)
      setError(err?.message || 'Fehler beim Scannen des Speicherplatzes.')
    } finally {
      setIsScanning(false)
    }
  }, [])

  useEffect(() => {
    scan()
  }, [scan])

  // Progress Listener
  useEffect(() => {
    const unsubscribe = window.mToolbox.cleanup.onProgress((event) => {
      setProgress(event)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Checkbox Toggle
  const toggleCategory = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Alle / Keine auswählen
  const selectAll = useCallback(() => {
    const all = new Set<string>()
    for (const c of categories) {
      if (c.sizeBytes > 0) {
        all.add(c.id)
      }
    }
    setSelectedIds(all)
  }, [categories])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Berechnete Summen für ausgewählte Kategorien
  const { selectedTotalSize, selectedTotalFiles } = useMemo(() => {
    let size = 0
    let files = 0
    for (const c of categories) {
      if (selectedIds.has(c.id)) {
        size += c.sizeBytes
        files += c.fileCount
      }
    }
    return { selectedTotalSize: size, selectedTotalFiles: files }
  }, [categories, selectedIds])

  // Gesamtpotenzial aller Kategorien
  const { totalScanSize, totalScanFiles } = useMemo(() => {
    let size = 0
    let files = 0
    for (const c of categories) {
      size += c.sizeBytes
      files += c.fileCount
    }
    return { totalScanSize: size, totalScanFiles: files }
  }, [categories])

  // Bereinigung starten
  const clean = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsCleaning(true)
    setProgress({
      categoryId: 'start',
      currentAction: 'Starte Bereinigung...',
      freedBytes: 0,
      percent: 0
    })

    try {
      const result = await window.mToolbox.cleanup.clean(Array.from(selectedIds))
      setLastResult(result)
      setShowResultModal(true)
      // Nach Abschluss neu scannen
      await scan()
    } catch (err: any) {
      console.error('[useCleanup] Bereinigungsfehler:', err)
      setError(err?.message || 'Fehler beim Ausführen der Bereinigung.')
    } finally {
      setIsCleaning(false)
      setProgress(null)
    }
  }, [selectedIds, scan])

  // Storage Sense aufrufen
  const openStorageSense = useCallback(async () => {
    await window.mToolbox.cleanup.openStorageSense()
  }, [])

  return {
    categories,
    disks,
    selectedIds,
    selectedTotalSize,
    selectedTotalFiles,
    totalScanSize,
    totalScanFiles,
    isScanning,
    isCleaning,
    progress,
    lastResult,
    showResultModal,
    setShowResultModal,
    error,
    scan,
    clean,
    toggleCategory,
    selectAll,
    deselectAll,
    openStorageSense
  }
}

