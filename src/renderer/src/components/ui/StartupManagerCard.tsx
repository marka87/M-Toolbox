import React, { useState } from 'react'
import {
  Layers,
  RefreshCw,
  Trash2,
  User,
  Shield,
  FolderOpen
} from 'lucide-react'
import type { StartupItem } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface StartupManagerCardProps {
  items: StartupItem[]
  loading: boolean
  onRefresh: () => void
  onDelete: (itemId: string) => void
}

export const StartupManagerCard: React.FC<StartupManagerCardProps> = ({
  items,
  loading,
  onRefresh,
  onDelete
}) => {
  const { t } = useTranslation()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'User' | 'System' | 'Folder'>('all')

  const handleDelete = (item: StartupItem) => {
    if (window.confirm(t.advanced.startupConfirmDelete.replace('{name}', item.name))) {
      setDeletingId(item.id)
      onDelete(item.id)
      setTimeout(() => setDeletingId(null), 1500)
    }
  }

  const filteredItems = items.filter((item) => filter === 'all' || item.scope === filter)

  return (
    <div className="p-5 rounded-2xl bg-fluent-card/50 border border-fluent-border/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fluent-text">
              {t.advanced.startupTitle}
            </h3>
            <p className="text-xs text-fluent-muted">
              {t.advanced.startupSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Filter */}
          <div className="flex items-center gap-1 bg-fluent-bg/60 p-1 rounded-lg border border-fluent-border/40 text-[11px]">
            {(['all', 'User', 'System', 'Folder'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  filter === f
                    ? 'bg-fluent-accent text-white'
                    : 'text-fluent-muted hover:text-fluent-text'
                }`}
              >
                {f === 'all'
                  ? t.advanced.startupFilterAll
                  : f === 'User'
                  ? t.advanced.startupFilterUser
                  : f === 'System'
                  ? t.advanced.startupFilterSystem
                  : t.advanced.startupFilterFolder}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-muted hover:text-fluent-text transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center space-y-2 bg-fluent-bg/30 rounded-xl border border-fluent-border/30">
          <RefreshCw className="w-5 h-5 text-fluent-accent animate-spin mx-auto" />
          <p className="text-xs text-fluent-muted">{t.advanced.startupReading}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-10 text-center text-xs text-fluent-muted bg-fluent-bg/30 rounded-xl border border-fluent-border/30">
          {t.advanced.startupEmpty}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-fluent-bg/60 border border-fluent-border/40 hover:border-fluent-border/70 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-fluent-card border border-fluent-border/40 mt-0.5 shrink-0">
                  {item.scope === 'User' ? (
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  ) : item.scope === 'System' ? (
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-fluent-text truncate">
                      {item.name}
                    </h4>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                        item.scope === 'User'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : item.scope === 'System'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {item.location}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-fluent-muted truncate mt-0.5 max-w-xl">
                    {item.command}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  title={t.advanced.startupDeleteTooltip}
                  className="p-1.5 rounded-lg text-fluent-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
