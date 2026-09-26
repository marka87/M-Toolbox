import React, { useState } from 'react'
import {
  FileCode,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react'
import type { HostsFileContent } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface HostsEditorCardProps {
  data: HostsFileContent | null
  loading: boolean
  saving: boolean
  onRefresh: () => void
  onToggle: (id: string) => void
  onAdd: (ip: string, host: string, comment?: string) => void
  onDelete: (id: string) => void
}

export const HostsEditorCard: React.FC<HostsEditorCardProps> = ({
  data,
  loading,
  saving,
  onRefresh,
  onToggle,
  onAdd,
  onDelete
}) => {
  const { t } = useTranslation()
  const [newIp, setNewIp] = useState('127.0.0.1')
  const [newHost, setNewHost] = useState('')
  const [newComment, setNewComment] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIp.trim() || !newHost.trim()) return
    onAdd(newIp.trim(), newHost.trim(), newComment.trim() || undefined)
    setNewHost('')
    setNewComment('')
  }

  const entries = data?.entries || []

  return (
    <div className="p-5 rounded-2xl bg-fluent-card/50 border border-fluent-border/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fluent-text">
              {t.advanced.hostsTitle}
            </h3>
            <p className="text-xs text-fluent-muted">
              {t.advanced.hostsSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-fluent-muted bg-fluent-bg px-2 py-1 rounded border border-fluent-border/40">
            {data?.filePath || 'C:\\Windows\\System32\\drivers\\etc\\hosts'}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading || saving}
            className="p-1.5 rounded-lg bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/30 text-fluent-muted hover:text-fluent-text transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || saving ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add New Entry Form */}
      <form
        onSubmit={handleAdd}
        className="p-3.5 rounded-xl bg-fluent-bg/60 border border-fluent-border/40 space-y-2.5"
      >
        <span className="text-[11px] font-semibold text-fluent-text block">
          {t.advanced.hostsAddTitle}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder={t.advanced.hostsIpPlaceholder}
            className="px-3 py-1.5 rounded-lg bg-fluent-card/70 border border-fluent-border/60 text-xs text-fluent-text font-mono placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent"
          />
          <input
            type="text"
            value={newHost}
            onChange={(e) => setNewHost(e.target.value)}
            placeholder={t.advanced.hostsDomainPlaceholder}
            className="px-3 py-1.5 rounded-lg bg-fluent-card/70 border border-fluent-border/60 text-xs text-fluent-text font-mono placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t.advanced.hostsCommentPlaceholder}
              className="flex-1 px-3 py-1.5 rounded-lg bg-fluent-card/70 border border-fluent-border/60 text-xs text-fluent-text placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent"
            />
            <button
              type="submit"
              disabled={saving || !newIp.trim() || !newHost.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-fluent-accent hover:bg-fluent-accent/90 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.advanced.hostsAddBtn}
            </button>
          </div>
        </div>
      </form>

      {/* Entries List */}
      {loading ? (
        <div className="py-12 text-center space-y-2 bg-fluent-bg/30 rounded-xl border border-fluent-border/30">
          <RefreshCw className="w-5 h-5 text-fluent-accent animate-spin mx-auto" />
          <p className="text-xs text-fluent-muted">{t.advanced.hostsReading}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-xs text-fluent-muted bg-fluent-bg/30 rounded-xl border border-fluent-border/30">
          {t.advanced.hostsEmpty}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                entry.isEnabled
                  ? 'bg-fluent-bg/60 border-fluent-border/40 hover:border-fluent-border/70'
                  : 'bg-fluent-bg/30 border-fluent-border/20 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={entry.isEnabled}
                  onChange={() => onToggle(entry.id)}
                  title={entry.isEnabled ? t.advanced.hostsEnabledTitle : t.advanced.hostsDisabledTitle}
                  className="rounded border-fluent-border/80 text-fluent-accent focus:ring-fluent-accent w-4 h-4 cursor-pointer"
                />

                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-fluent-text w-28">
                    {entry.ip}
                  </span>
                  <span className="font-mono text-xs text-fluent-accent font-medium">
                    {entry.host}
                  </span>
                  {entry.comment && (
                    <span className="text-xs text-fluent-muted italic truncate">
                      # {entry.comment}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                    entry.isEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                  }`}
                >
                  {entry.isEnabled ? t.advanced.hostsActiveBadge : t.advanced.hostsCommentedBadge}
                </span>

                <button
                  onClick={() => onDelete(entry.id)}
                  disabled={saving}
                  title={t.advanced.hostsDeleteTooltip}
                  className="p-1.5 rounded-lg text-fluent-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
