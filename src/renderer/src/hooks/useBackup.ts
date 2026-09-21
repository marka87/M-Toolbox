import { useState, useEffect, useCallback } from 'react'
import type {
  BackupSummary,
  RestoreSelection,
  OperationLogEvent
} from '@shared/types'

export function useBackup() {
  const [localBackups, setLocalBackups] = useState<BackupSummary[]>([])
  const [selectedBackup, setSelectedBackup] = useState<BackupSummary | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [restoreSelection, setRestoreSelection] = useState<RestoreSelection>({
    winget: true,
    explorer: true,
    fonts: true,
    wallpaper: true,
    powershellModules: true
  })

  const loadLocalBackups = useCallback(async () => {
    if (!window.mToolbox?.backup) return
    setIsLoading(true)
    try {
      const list = await window.mToolbox.backup.listLocalBackups()
      setLocalBackups(list)
      if (list.length > 0 && !selectedBackup) {
        setSelectedBackup(list[0])
      }
    } catch (err) {
      console.error('[useBackup] loadLocalBackups error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedBackup])

  useEffect(() => {
    loadLocalBackups()

    if (!window.mToolbox?.backup) return

    const unsubscribe = window.mToolbox.backup.onProgress((event: OperationLogEvent) => {
      setLogs((prev) => [...prev, event.line])
    })

    return () => {
      unsubscribe()
    }
  }, [loadLocalBackups])

  const toggleRestoreCategory = (key: keyof RestoreSelection) => {
    setRestoreSelection((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const clearLogs = () => {
    setLogs([])
  }

  const createBackup = async (chooseLocation = false): Promise<{ success: boolean; filePath?: string }> => {
    if (!window.mToolbox?.backup) return { success: false }
    setIsCreating(true)
    try {
      let targetPath: string | undefined = undefined
      if (chooseLocation) {
        const selected = await window.mToolbox.backup.saveBackupDialog()
        if (!selected) {
          setIsCreating(false)
          return { success: false }
        }
        targetPath = selected
      }

      const res = await window.mToolbox.backup.createBackup(targetPath)
      await loadLocalBackups()
      return { success: res.success, filePath: res.filePath }
    } catch (err) {
      console.error('[useBackup] createBackup error:', err)
      return { success: false }
    } finally {
      setIsCreating(false)
    }
  }

  const selectFileAndPreview = async () => {
    if (!window.mToolbox?.backup) return
    try {
      const filePath = await window.mToolbox.backup.selectBackupFile()
      if (filePath) {
        const summary = await window.mToolbox.backup.previewBackup(filePath)
        setSelectedBackup(summary)
      }
    } catch (err) {
      console.error('[useBackup] selectFile error:', err)
    }
  }

  const restoreSelected = async (): Promise<boolean> => {
    if (!window.mToolbox?.backup || !selectedBackup?.filePath) return false
    setIsRestoring(true)
    try {
      const res = await window.mToolbox.backup.restoreBackup(
        selectedBackup.filePath,
        restoreSelection
      )
      return res.success
    } catch (err) {
      console.error('[useBackup] restore error:', err)
      return false
    } finally {
      setIsRestoring(false)
    }
  }

  return {
    localBackups,
    selectedBackup,
    setSelectedBackup,
    isCreating,
    isRestoring,
    isLoading,
    logs,
    restoreSelection,
    toggleRestoreCategory,
    clearLogs,
    createBackup,
    selectFileAndPreview,
    restoreSelected,
    refreshLocalBackups: loadLocalBackups
  }
}

