import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  BackupSummary,
  RestoreSelection,
  OperationLogEvent,
  InstalledPackage,
  DeviceItem,
  DriverPackage,
  DriverStats
} from '@shared/types'
import type {
  ReinstallArchiveSummary,
  ReinstallCreateOptions,
  ReinstallProgress,
  ReinstallRestoreOptions
} from '@shared/reinstall.types'

export type BackupTab = 'create' | 'restore' | 'checklist' | 'history'
export type CreateBackupType = 'quick' | 'full'

export interface UnifiedSelectedBackup {
  filePath: string
  fileName: string
  type: 'json' | 'mtoolbox'
  createdAt: string
  computerName: string
  osVersion: string
  jsonSummary?: BackupSummary
  mtbxSummary?: ReinstallArchiveSummary
}

export function useBackupMigration() {
  const [activeTab, setActiveTab] = useState<BackupTab>('create')
  const [createType, setCreateType] = useState<CreateBackupType>('quick')

  // History & Local Backups
  const [localJsonBackups, setLocalJsonBackups] = useState<BackupSummary[]>([])
  const [mtbxHistory, setMtbxHistory] = useState<Array<{ createdAt: string; status: string; details?: string }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Creation State - Full (Discovery)
  const [discoveredData, setDiscoveredData] = useState<{
    apps: InstalledPackage[]
    drivers: { devices: DeviceItem[]; packages: DriverPackage[]; stats: DriverStats } | null
    system: Record<string, unknown>
  }>({ apps: [], drivers: null, system: {} })
  const [isDiscovering, setIsDiscovering] = useState(false)

  // Selected file for restore
  const [selectedBackup, setSelectedBackup] = useState<UnifiedSelectedBackup | null>(null)

  // Restore options
  const [jsonRestoreSelection, setJsonRestoreSelection] = useState<RestoreSelection>({
    winget: true,
    explorer: true,
    fonts: true,
    wallpaper: true,
    powershellModules: true
  })

  const [mtbxRestoreOptions, setMtbxRestoreOptions] = useState<{
    restoreApps: boolean
    restoreDrivers: boolean
    restoreTweaks: boolean
    selectedAppIds: Set<string>
  }>({
    restoreApps: true,
    restoreDrivers: true,
    restoreTweaks: true,
    selectedAppIds: new Set()
  })

  // Operation progress & logs
  const [isOperating, setIsOperating] = useState(false)
  const [operationType, setOperationType] = useState<'create' | 'restore' | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [reinstallProgress, setReinstallProgress] = useState<ReinstallProgress | null>(null)
  const [operationResult, setOperationResult] = useState<{
    success: boolean
    message: string
    details?: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef(true)

  // Load history from both services
  const refreshAllHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const [jsonList, mtbxList] = await Promise.allSettled([
        window.mToolbox?.backup?.listLocalBackups() || Promise.resolve([]),
        window.mToolbox?.reinstall?.history() || Promise.resolve([])
      ])

      if (isMounted.current) {
        if (jsonList.status === 'fulfilled') {
          setLocalJsonBackups(jsonList.value)
        }
        if (mtbxList.status === 'fulfilled') {
          setMtbxHistory(mtbxList.value)
        }
      }
    } catch (err) {
      console.warn('[useBackupMigration] Failed to load history:', err)
    } finally {
      if (isMounted.current) {
        setIsLoadingHistory(false)
      }
    }
  }, [])

  // Discover drivers & apps for full reinstall bundle
  const discoverFullSystem = useCallback(async () => {
    if (!window.mToolbox?.reinstall) return
    setIsDiscovering(true)
    setError(null)
    try {
      const res = await window.mToolbox.reinstall.discover()
      if (isMounted.current) {
        setDiscoveredData({
          apps: res.apps,
          drivers: res.drivers,
          system: res.system
        })
      }
      return res
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || 'Fehler beim Erfassen von Apps und Treibern.')
      }
      return null
    } finally {
      if (isMounted.current) {
        setIsDiscovering(false)
      }
    }
  }, [])

  // Listen to progress streams
  useEffect(() => {
    isMounted.current = true
    refreshAllHistory()

    const unBackup = window.mToolbox?.backup?.onProgress((event: OperationLogEvent) => {
      setLogs((prev) => [...prev, event.line])
    })

    const unReinstall = window.mToolbox?.reinstall?.onProgress((prog: ReinstallProgress) => {
      setReinstallProgress(prog)
      if (prog.message) {
        setLogs((prev) => [...prev, prog.message])
      }
    })

    return () => {
      isMounted.current = false
      unBackup?.()
      unReinstall?.()
    }
  }, [refreshAllHistory])

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([])
    setOperationResult(null)
    setReinstallProgress(null)
    setError(null)
  }, [])

  // Create Quick JSON Backup
  const createQuickBackup = useCallback(async (chooseLocation = false) => {
    if (!window.mToolbox?.backup) return { success: false }
    setIsOperating(true)
    setOperationType('create')
    clearLogs()
    try {
      let targetPath: string | undefined = undefined
      if (chooseLocation) {
        const selected = await window.mToolbox.backup.saveBackupDialog()
        if (!selected) {
          setIsOperating(false)
          return { success: false }
        }
        targetPath = selected
      }

      const res = await window.mToolbox.backup.createBackup(targetPath)
      if (isMounted.current) {
        if (res.success) {
          setOperationResult({
            success: true,
            message: `Schnell-Backup erfolgreich erstellt: ${res.filePath}`
          })
          await refreshAllHistory()
        } else {
          setError(res.error || 'Erstellung des Backups fehlgeschlagen.')
        }
      }
      return res
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || 'Unerwarteter Fehler beim Backup.')
      }
      return { success: false }
    } finally {
      if (isMounted.current) {
        setIsOperating(false)
      }
    }
  }, [clearLogs, refreshAllHistory])

  // Create Full Reinstall Bundle (.mtoolbox)
  const createFullBundle = useCallback(async (options?: ReinstallCreateOptions) => {
    if (!window.mToolbox?.reinstall) return { success: false }
    setIsOperating(true)
    setOperationType('create')
    clearLogs()
    try {
      const savePath = await window.mToolbox.reinstall.saveDialog()
      if (!savePath) {
        setIsOperating(false)
        return { success: false }
      }

      const res = await window.mToolbox.reinstall.create(savePath, options)
      if (isMounted.current) {
        if (res.success) {
          setOperationResult({
            success: true,
            message: `Reinstall-Bundle erfolgreich erstellt: ${res.filePath || savePath}`
          })
          await refreshAllHistory()
        } else {
          setError(res.error || 'Erstellung des Reinstall-Bundles fehlgeschlagen.')
        }
      }
      return res
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || 'Unerwarteter Fehler beim Reinstall-Bundle.')
      }
      return { success: false }
    } finally {
      if (isMounted.current) {
        setIsOperating(false)
      }
    }
  }, [clearLogs, refreshAllHistory])

  // Select any backup file (.json or .mtoolbox)
  const selectAnyBackupFile = useCallback(async () => {
    if (!window.mToolbox?.backup) return
    try {
      const filePath = await window.mToolbox.backup.selectBackupFile()
      if (!filePath) return

      await loadAndPreviewFile(filePath)
    } catch (err: any) {
      setError(err?.message || 'Fehler beim Öffnen der Sicherungsdatei.')
    }
  }, [])

  // Load and preview a specific file path
  const loadAndPreviewFile = useCallback(async (filePath: string) => {
    const ext = filePath.toLowerCase().split('.').pop()
    const fileName = filePath.split(/[/\\]/).pop() || 'Sicherung'
    setError(null)
    setOperationResult(null)

    if (ext === 'json') {
      try {
        const summary = await window.mToolbox.backup.previewBackup(filePath)
        setSelectedBackup({
          filePath: summary.filePath || filePath,
          fileName,
          type: 'json',
          createdAt: summary.createdAt,
          computerName: summary.computerName,
          osVersion: summary.osVersion,
          jsonSummary: summary
        })
        setActiveTab('restore')
      } catch (err: any) {
        setError(err?.message || 'Konnte JSON-Backup nicht analysieren.')
      }
    } else if (ext === 'mtoolbox' || ext === 'zip') {
      try {
        const summary = await window.mToolbox.reinstall.preview(filePath)
        if (summary) {
          setSelectedBackup({
            filePath: summary.filePath || filePath,
            fileName,
            type: 'mtoolbox',
            createdAt: summary.manifest?.createdAt || new Date().toISOString(),
            computerName: summary.manifest?.computerName || 'Windows-PC',
            osVersion: summary.manifest?.windowsVersion || 'Windows 11',
            mtbxSummary: summary
          })

          // Preselect all apps
          if (summary.apps && summary.apps.length > 0) {
            setMtbxRestoreOptions((prev) => ({
              ...prev,
              selectedAppIds: new Set(summary.apps!.map((a) => a.id))
            }))
          }
          setActiveTab('restore')
        }
      } catch (err: any) {
        setError(err?.message || 'Konnte Reinstall-Archiv nicht analysieren.')
      }
    } else {
      setError(`Nicht unterstütztes Format: .${ext}. Bitte wählen Sie eine .json oder .mtoolbox Datei.`)
    }
  }, [])

  // Restore Active Selected Backup
  const restoreActive = useCallback(async () => {
    if (!selectedBackup) return { success: false }
    setIsOperating(true)
    setOperationType('restore')
    clearLogs()

    try {
      if (selectedBackup.type === 'json') {
        const res = await window.mToolbox.backup.restoreBackup(
          selectedBackup.filePath,
          jsonRestoreSelection
        )
        if (isMounted.current) {
          if (res.success) {
            setOperationResult({
              success: true,
              message: 'Wiederherstellung aus JSON-Sicherung erfolgreich abgeschlossen!'
            })
          } else {
            setError(res.error || 'Fehler bei der JSON-Wiederherstellung.')
          }
        }
        return res
      } else {
        const reinstallOpts: ReinstallRestoreOptions = {
          drivers: mtbxRestoreOptions.restoreDrivers,
          tweaks: mtbxRestoreOptions.restoreTweaks,
          apps: mtbxRestoreOptions.restoreApps,
          selectedAppIds: Array.from(mtbxRestoreOptions.selectedAppIds)
        }
        const res = await window.mToolbox.reinstall.restore(
          selectedBackup.filePath,
          reinstallOpts
        )
        if (isMounted.current) {
          if (res.success) {
            const details: string[] = []
            if (res.installedApps !== undefined) details.push(`${res.installedApps} Apps installiert`)
            if (res.installedDrivers !== undefined) details.push(`${res.installedDrivers} Treiber installiert`)
            if (res.appliedTweaks !== undefined) details.push(`${res.appliedTweaks} Tweaks angewendet`)
            setOperationResult({
              success: true,
              message: 'Wiederherstellung aus Reinstall-Bundle erfolgreich abgeschlossen!',
              details: details.length > 0 ? details : undefined
            })
            await refreshAllHistory()
          } else {
            setError(res.error || 'Fehler beim Wiederherstellen des Reinstall-Bundles.')
          }
        }
        return res
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || 'Unerwarteter Fehler bei der Wiederherstellung.')
      }
      return { success: false }
    } finally {
      if (isMounted.current) {
        setIsOperating(false)
      }
    }
  }, [selectedBackup, jsonRestoreSelection, mtbxRestoreOptions, clearLogs, refreshAllHistory])

  // Toggle JSON Restore Category
  const toggleJsonCategory = useCallback((key: keyof RestoreSelection) => {
    setJsonRestoreSelection((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }, [])

  // Toggle Mtbx App
  const toggleMtbxApp = useCallback((appId: string) => {
    setMtbxRestoreOptions((prev) => {
      const next = new Set(prev.selectedAppIds)
      if (next.has(appId)) {
        next.delete(appId)
      } else {
        next.add(appId)
      }
      return { ...prev, selectedAppIds: next }
    })
  }, [])

  // Toggle All Mtbx Apps
  const toggleAllMtbxApps = useCallback((allIds: string[]) => {
    setMtbxRestoreOptions((prev) => {
      const next = new Set(prev.selectedAppIds)
      if (next.size === allIds.length) {
        next.clear()
      } else {
        allIds.forEach((id) => next.add(id))
      }
      return { ...prev, selectedAppIds: next }
    })
  }, [])

  return {
    activeTab,
    setActiveTab,
    createType,
    setCreateType,
    localJsonBackups,
    mtbxHistory,
    isLoadingHistory,
    discoveredData,
    isDiscovering,
    selectedBackup,
    jsonRestoreSelection,
    mtbxRestoreOptions,
    setMtbxRestoreOptions,
    isOperating,
    operationType,
    logs,
    reinstallProgress,
    operationResult,
    error,
    refreshAllHistory,
    discoverFullSystem,
    createQuickBackup,
    createFullBundle,
    selectAnyBackupFile,
    loadAndPreviewFile,
    restoreActive,
    toggleJsonCategory,
    toggleMtbxApp,
    toggleAllMtbxApps,
    clearLogs
  }
}

