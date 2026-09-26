import React from 'react'
import { Download, X, Loader2 } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface BatchActionBarProps {
  selectedCount: number
  isOperating: boolean
  onClear: () => void
  onInstallSelected: () => void
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  isOperating,
  onClear,
  onInstallSelected
}) => {
  const { t } = useTranslation()

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-5 py-3 rounded-xl bg-fluent-card border border-fluent-accent/40 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-fluent-accent text-white text-xs font-bold">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-slate-200">
          {selectedCount === 1 ? t.software.batchSelectedOne : t.software.batchSelectedMany}
        </span>
      </div>

      <div className="h-4 w-px bg-fluent-border" />

      <button
        onClick={onClear}
        disabled={isOperating}
        className="inline-flex items-center gap-1.5 text-xs text-fluent-muted hover:text-slate-200 transition-colors disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
        <span>{t.software.batchReset}</span>
      </button>

      <button
        onClick={onInstallSelected}
        disabled={isOperating}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fluent-accent hover:bg-fluent-accent-hover text-white text-xs font-semibold shadow-fluent-sm transition-all disabled:opacity-50"
      >
        {isOperating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{t.software.batchInstalling}</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>{t.software.batchInstallSelected}</span>
          </>
        )}
      </button>
    </div>
  )
}

