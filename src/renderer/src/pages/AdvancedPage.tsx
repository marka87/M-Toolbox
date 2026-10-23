import React, { useState } from 'react'
import {
  Wrench,
  Layers,
  FileCode,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useAdvancedTools } from '../hooks/useAdvancedTools'
import { StartupManagerCard } from '../components/ui/StartupManagerCard'
import { HostsEditorCard } from '../components/ui/HostsEditorCard'
import { useTranslation } from '../i18n/LanguageContext'

type ActiveTab = 'startup' | 'hosts'

export const AdvancedPage: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ActiveTab>('startup')

  const {
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
  } = useAdvancedTools()

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Tab: Startup Manager */}
      {activeTab === 'startup' && (
        <StartupManagerCard
          items={startupItems}
          loading={loadingStartup}
          onRefresh={loadStartupItems}
          onDelete={deleteStartupItem}
          onToggle={toggleStartupItem}
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
