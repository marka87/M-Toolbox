import React from 'react'
import {
  Trash2,
  HardDrive,
  RefreshCw,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Globe,
  CheckCircle2
} from 'lucide-react'
import type { CleanupCategoryItem } from '@shared/types'
import { formatBytes } from '../../hooks/useCleanup'
import { useTranslation } from '../../i18n/LanguageContext'

interface CleanupCategoryRowProps {
  category: CleanupCategoryItem
  isSelected: boolean
  onToggle: (id: string) => void
  disabled?: boolean
}

function getCategoryIcon(id: string) {
  switch (id) {
    case 'recycle_bin':
      return <Trash2 className="w-5 h-5 text-emerald-400" />
    case 'windows_update_cache':
      return <RefreshCw className="w-5 h-5 text-sky-400" />
    case 'crash_dumps':
      return <AlertCircle className="w-5 h-5 text-amber-400" />
    case 'system_logs':
      return <FileText className="w-5 h-5 text-indigo-400" />
    case 'thumbnail_cache':
      return <ImageIcon className="w-5 h-5 text-purple-400" />
    case 'browser_chrome':
    case 'browser_edge':
    case 'browser_firefox':
      return <Globe className="w-5 h-5 text-blue-400" />
    default:
      return <HardDrive className="w-5 h-5 text-fluent-accent" />
  }
}

export const CleanupCategoryRow: React.FC<CleanupCategoryRowProps> = ({
  category,
  isSelected,
  onToggle,
  disabled
}) => {
  const { t, language } = useTranslation()
  const hasData = category.sizeBytes > 0

  return (
    <div
      onClick={() => {
        if (!disabled && hasData) {
          onToggle(category.id)
        }
      }}
      className={`group flex items-center justify-between p-4 rounded-xl border transition-all select-none ${
        disabled || !hasData
          ? 'opacity-60 bg-fluent-card/40 border-fluent-border/40 cursor-default'
          : isSelected
          ? 'bg-fluent-card border-fluent-accent/50 shadow-sm cursor-pointer hover:border-fluent-accent'
          : 'bg-fluent-card/70 border-fluent-border hover:bg-fluent-card hover:border-fluent-border-hover cursor-pointer'
      }`}
    >
      {/* Left: Checkbox + Icon + Details */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          disabled={disabled || !hasData}
          className="w-4 h-4 rounded border-fluent-border text-fluent-accent focus:ring-0 cursor-pointer disabled:opacity-30 shrink-0"
        />

        <div className="p-2.5 rounded-xl bg-fluent-card-subtle shrink-0">
          {getCategoryIcon(category.id)}
        </div>

        <div className="min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`text-sm font-semibold truncate ${
                isSelected ? 'text-fluent-text' : 'text-fluent-text/90'
              }`}
            >
              {category.name}
            </h4>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              {t.cleanup.safeBadge}
            </span>
          </div>
          <p className="text-xs text-fluent-muted truncate mt-0.5" title={category.description}>
            {category.description}
          </p>
        </div>
      </div>

      {/* Right: Size & File Count Badges */}
      <div className="flex items-center gap-4 shrink-0 text-right">
        <div className="hidden sm:block">
          <span className="text-xs text-fluent-muted block">
            {category.fileCount.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')} {category.fileCount === 1 ? t.cleanup.fileOne : t.cleanup.fileMany}
          </span>
        </div>

        <div className="w-24 text-right">
          <span
            className={`text-sm font-bold block ${
              hasData ? 'text-fluent-text' : 'text-fluent-muted font-normal'
            }`}
          >
            {formatBytes(category.sizeBytes)}
          </span>
        </div>
      </div>
    </div>
  )
}
