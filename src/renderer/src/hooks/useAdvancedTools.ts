import { useState, useEffect, useCallback } from 'react'
import type {
  StartupItem,
  HostsEntry,
  HostsFileContent
} from '@shared/types'

export function useAdvancedTools() {
  // Startup Manager State
  const [startupItems, setStartupItems] = useState<StartupItem[]>([])
  const [loadingStartup, setLoadingStartup] = useState<boolean>(false)

  // Hosts Editor State
  const [hostsData, setHostsData] = useState<HostsFileContent | null>(null)
  const [loadingHosts, setLoadingHosts] = useState<boolean>(false)
  const [savingHosts, setSavingHosts] = useState<boolean>(false)

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type })
  }

  useEffect(() => {
    if (!toastMessage) return
    const t = setTimeout(() => setToastMessage(null), 4000)
    return () => clearTimeout(t)
  }, [toastMessage])

  // Load Startup items
  const loadStartupItems = useCallback(async () => {
    try {
      setLoadingStartup(true)
      const items = await window.mToolbox.advanced.getStartupItems()
      setStartupItems(items)
    } catch (err) {
      console.error('Failed to load startup items:', err)
      showToast('Fehler beim Laden der Autostart-Programme.', 'error')
    } finally {
      setLoadingStartup(false)
    }
  }, [])

  // Load Hosts file
  const loadHostsFile = useCallback(async () => {
    try {
      setLoadingHosts(true)
      const file = await window.mToolbox.advanced.getHostsFile()
      setHostsData(file)
    } catch (err) {
      console.error('Failed to load hosts file:', err)
      showToast('Fehler beim Laden der Hosts-Datei.', 'error')
    } finally {
      setLoadingHosts(false)
    }
  }, [])

  useEffect(() => {
    loadStartupItems()
    loadHostsFile()
  }, [loadStartupItems, loadHostsFile])

  // Delete a startup item
  const deleteStartupItem = useCallback(async (itemId: string) => {
    try {
      const res = await window.mToolbox.advanced.deleteStartupItem(itemId)
      if (res.success) {
        showToast(res.message, 'success')
        await loadStartupItems()
      } else {
        showToast(res.message, 'error')
      }
    } catch (err: any) {
      showToast(`Fehler beim Entfernen: ${err?.message || 'Unbekannt'}`, 'error')
    }
  }, [loadStartupItems])

  // Enable or disable a startup item without removing it
  const toggleStartupItem = useCallback(async (itemId: string, enabled: boolean) => {
    try {
      const res = await window.mToolbox.advanced.setStartupItemEnabled(itemId, enabled)
      if (res.success) {
        showToast(res.message, 'success')
        await loadStartupItems()
      } else {
        showToast(res.message, 'error')
      }
    } catch (err: any) {
      showToast(`Fehler beim Ändern: ${err?.message || 'Unbekannt'}`, 'error')
    }
  }, [loadStartupItems])

  // Toggle or modify hosts entry
  const saveHostsEntries = useCallback(async (newEntries: HostsEntry[]) => {
    try {
      setSavingHosts(true)
      const res = await window.mToolbox.advanced.saveHostsFile(newEntries)
      if (res.success) {
        showToast(res.message, 'success')
        await loadHostsFile()
      } else {
        showToast(res.message, 'error')
      }
    } catch (err: any) {
      showToast(`Fehler beim Speichern: ${err?.message || 'Unbekannt'}`, 'error')
    } finally {
      setSavingHosts(false)
    }
  }, [loadHostsFile])

  const toggleHostsEntry = useCallback((entryId: string) => {
    if (!hostsData) return
    const updated = hostsData.entries.map((e) =>
      e.id === entryId ? { ...e, isEnabled: !e.isEnabled } : e
    )
    saveHostsEntries(updated)
  }, [hostsData, saveHostsEntries])

  const addHostsEntry = useCallback((ip: string, host: string, comment?: string) => {
    if (!hostsData) return
    const newEntry: HostsEntry = {
      id: `entry_${Date.now()}`,
      ip: ip.trim(),
      host: host.trim(),
      comment: comment?.trim() || undefined,
      isEnabled: true,
      rawLine: `${ip.trim()} ${host.trim()}`
    }
    const updated = [...hostsData.entries, newEntry]
    saveHostsEntries(updated)
  }, [hostsData, saveHostsEntries])

  const deleteHostsEntry = useCallback((entryId: string) => {
    if (!hostsData) return
    const updated = hostsData.entries.filter((e) => e.id !== entryId)
    saveHostsEntries(updated)
  }, [hostsData, saveHostsEntries])

  return {
    startupItems,
    loadingStartup,
    loadStartupItems,
    deleteStartupItem,
    toggleStartupItem,
    hostsData,
    loadingHosts,
    savingHosts,
    loadHostsFile,
    toggleHostsEntry,
    addHostsEntry,
    deleteHostsEntry,
    toastMessage
  }
}

