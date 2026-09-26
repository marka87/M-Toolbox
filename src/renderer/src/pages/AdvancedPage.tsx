import React, { useState } from 'react'
import {
  Wrench,
  Search,
  Sliders,
  Layers,
  FileCode,
  Activity,
  HardDrive,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'
import { useAdvancedTools } from '../hooks/useAdvancedTools'
import { ToolLauncherCard } from '../components/ui/ToolLauncherCard'
import { StartupManagerCard } from '../components/ui/StartupManagerCard'
import { HostsEditorCard } from '../components/ui/HostsEditorCard'
import type { ToolCategory } from '@shared/types'
import { useTranslation } from '../i18n/LanguageContext'

type ActiveTab = 'tools' | 'startup' | 'hosts'

export const AdvancedPage: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ActiveTab>('tools')

  const toolCategoryTabs: { id: ToolCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: t.advanced.catAll, icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'control', label: t.advanced.catControl, icon: <Sliders className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'diagnostics', label: t.advanced.catDiagnostics, icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'management', label: t.advanced.catManagement, icon: <FolderKanban className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'storage_security', label: t.advanced.catStorageSecurity, icon: <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> }
  ]

  const {
    tools,
    allTools,
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
  } = useAdvancedTools()

  const getToolCategoryCount = (cat: ToolCategory) => {
    if (cat === 'all') return allTools.length
    return allTools.filter((t) => t.category === cat).length
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fluent-text">{t.advanced.title}</h1>
            <p className="text-xs text-fluent-muted">
              {t.advanced.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs font-medium animate-in fade-in duration-150 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('tools')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center gap-3.5 ${
            activeTab === 'tools'
              ? 'bg-fluent-card/70 border-fluent-accent/40 shadow-sm'
              : 'bg-fluent-card/40 border-fluent-border/40 hover:bg-fluent-card/60'
          }`}
        >
          <div className="p-2.5 rounded-lg bg-fluent-accent/10 border border-fluent-accent/20 text-fluent-accent">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-fluent-text">
              {t.advanced.kpiTools.replace('{count}', String(allTools.length))}
            </div>
            <div className="text-xs text-fluent-muted">{t.advanced.kpiToolsDesc}</div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('startup')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center gap-3.5 ${
            activeTab === 'startup'
              ? 'bg-fluent-card/70 border-fluent-accent/40 shadow-sm'
              : 'bg-fluent-card/40 border-fluent-border/40 hover:bg-fluent-card/60'
          }`}
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-fluent-text">
              {t.advanced.kpiStartup.replace('{count}', String(startupItems.length))}
            </div>
            <div className="text-xs text-fluent-muted">{t.advanced.kpiStartupDesc}</div>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('hosts')}
          className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-center gap-3.5 ${
            activeTab === 'hosts'
              ? 'bg-fluent-card/70 border-fluent-accent/40 shadow-sm'
              : 'bg-fluent-card/40 border-fluent-border/40 hover:bg-fluent-card/60'
          }`}
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-fluent-text">
              {t.advanced.kpiHosts.replace('{count}', String(hostsData?.entries.length || 0))}
            </div>
            <div className="text-xs text-fluent-muted">{t.advanced.kpiHostsDesc}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-fluent-border/40 pb-2">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'tools'
              ? 'bg-fluent-accent text-white shadow-sm'
              : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          {t.advanced.tabTools}
        </button>

        <button
          onClick={() => setActiveTab('startup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'startup'
              ? 'bg-fluent-accent text-white shadow-sm'
              : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          {t.advanced.tabStartup}
        </button>

        <button
          onClick={() => setActiveTab('hosts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'hosts'
              ? 'bg-fluent-accent text-white shadow-sm'
              : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          {t.advanced.tabHosts}
        </button>
      </div>

      {/* Tab: Tools Launcher */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          {/* Controls: Category Filter + Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {toolCategoryTabs.map((tab) => {
                const isActive = activeCategory === tab.id
                const count = getToolCategoryCount(tab.id)
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-fluent-accent text-white shadow-sm'
                        : 'bg-fluent-card/50 text-fluent-muted hover:text-fluent-text hover:bg-fluent-card border border-fluent-border/40'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-fluent-bg/80 text-fluent-muted'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-4 h-4 text-fluent-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.advanced.searchPlaceholder}
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-fluent-card/50 border border-fluent-border/60 text-xs text-fluent-text placeholder:text-fluent-muted/70 focus:outline-none focus:border-fluent-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fluent-muted hover:text-fluent-text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tools Grid */}
          {tools.length === 0 ? (
            <div className="p-12 text-center text-xs text-fluent-muted bg-fluent-card/20 rounded-2xl border border-fluent-border/30">
              {t.advanced.noToolsFound.replace('{query}', searchQuery)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {tools.map((tool) => (
                <ToolLauncherCard
                  key={tool.id}
                  tool={tool}
                  isLaunching={launchingId === tool.id}
                  onLaunch={launchTool}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Startup Manager */}
      {activeTab === 'startup' && (
        <StartupManagerCard
          items={startupItems}
          loading={loadingStartup}
          onRefresh={loadStartupItems}
          onDelete={deleteStartupItem}
        />
      )}

      {/* Tab: Hosts Editor */}
      {activeTab === 'hosts' && (
        <HostsEditorCard
          data={hostsData}
          loading={loadingHosts}
          saving={savingHosts}
          onRefresh={loadHostsFile}
          onToggle={toggleHostsEntry}
          onAdd={addHostsEntry}
          onDelete={deleteHostsEntry}
        />
      )}
    </div>
  )
}
