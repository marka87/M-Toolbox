import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  AdvancedToolItem,
  StartupItem,
  HostsEntry,
  HostsFileContent,
  ToolCategory
} from '@shared/types'

export function useAdvancedTools() {
  const [tools, setTools] = useState<AdvancedToolItem[]>([])
  const [loadingTools, setLoadingTools] = useState<boolean>(true)
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [launchingId, setLaunchingId] = useState<string | null>(null)

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

  // Load tools catalog
  const loadTools = useCallback(async () => {
    try {
      setLoadingTools(true)
      const data = await window.mToolbox.advanced.getTools()
      setTools(data)
    } catch (err) {
      console.error('Failed to load tools:', err)
      showToast('Fehler beim Laden der Tools.', 'error')
    } finally {
      setLoadingTools(false)
    }
  }, [])

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
    loadTools()
    loadStartupItems()
    loadHostsFile()
  }, [loadTools, loadStartupItems, loadHostsFile])

  // Launch a Windows tool
  const launchTool = useCallback(async (toolId: string) => {
    try {
      setLaunchingId(toolId)
      const res = await window.mToolbox.advanced.launchTool(toolId)
      showToast(res.message, res.success ? 'success' : 'error')
    } catch (err: any) {
      showToast(`Fehler beim Starten: ${err?.message || 'Unbekannt'}`, 'error')
    } finally {
      setLaunchingId(null)
    }
  }, [])

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

  // Filtered tools
  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      const matchesCategory = activeCategory === 'all' || t.category === activeCategory
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.command.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [tools, activeCategory, searchQuery])

  return {
    tools: filteredTools,
    allTools: tools,
    loadingTools,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    launchingId,
    launchTool,
    startupItems,
    loadingStartup,
    loadStartupItems,
    deleteStartupItem,
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

