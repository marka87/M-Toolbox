import React from 'react'
import {
  Download,
  Trash2,
  ArrowUpCircle,
  CheckCircle2,
  Loader2,
  Globe,
  Code2,
  Wrench,
  Film,
  MessageSquare,
  Gamepad2,
  Layers
} from 'lucide-react'
import type { SoftwarePackage, SoftwareCategory } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

export type SoftwareViewMode = 'normal' | 'compact' | 'icons'

interface PackageCardProps {
  pkg: SoftwarePackage
  isSelected: boolean
  isOperating: boolean
  isCurrentActive: boolean
  viewMode?: SoftwareViewMode
  onToggleSelect: (id: string) => void
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  onUpgrade: (id: string) => void
}

const CATEGORY_ICONS: Record<SoftwareCategory, React.ComponentType<{ className?: string }>> = {
  all: Layers,
  browser: Globe,
  dev: Code2,
  utilities: Wrench,
  media: Film,
  communication: MessageSquare,
  gaming: Gamepad2,
  runtimes: Layers
}

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  isSelected,
  isOperating,
  isCurrentActive,
  viewMode = 'normal',
  onToggleSelect,
  onInstall,
  onUninstall,
  onUpgrade
}) => {
  const { t } = useTranslation()
  const Icon = CATEGORY_ICONS[pkg.category] || Wrench

  // Action button renderer
  const renderActionButtons = (size: 'sm' | 'md' = 'md', isIconTile = false) => {
    if (isCurrentActive) {
      return (
        <button
          disabled
          className={`${
            isIconTile
              ? 'w-full justify-center px-1.5 py-1 text-[10px]'
              : size === 'sm'
              ? 'px-2 py-1 text-[11px]'
              : 'px-3 py-1.5 text-xs'
          } inline-flex items-center gap-1.5 rounded font-medium bg-fluent-accent/40 text-white cursor-wait shrink-0`}
        >
          <Loader2 className={`${size === 'sm' || isIconTile ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin shrink-0`} />
          <span className="truncate">{isIconTile ? t.software.runningShort : t.software.processingBtn}</span>
        </button>
      )
    }

    if (pkg.status === 'update_available') {
      return (
        <button
          onClick={() => onUpgrade(pkg.id)}
          disabled={isOperating}
          className={`${
            isIconTile
              ? 'w-full justify-center px-1.5 py-1 text-[10px]'
              : size === 'sm'
              ? 'px-2 py-1 text-[11px]'
              : 'px-3 py-1.5 text-xs'
          } inline-flex items-center gap-1.5 rounded font-medium bg-fluent-status-yellow/20 hover:bg-fluent-status-yellow/30 text-fluent-status-yellow border border-fluent-status-yellow/30 transition-colors disabled:opacity-50 shrink-0`}
          title={t.software.statusUpdateAvailable}
        >
          <ArrowUpCircle className={`${size === 'sm' || isIconTile ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
          <span className="truncate">{t.software.updateBtn}</span>
        </button>
      )
    }

    if (pkg.status === 'installed') {
      return (
        <button
          onClick={() => onUninstall(pkg.id)}
          disabled={isOperating}
          className={`${
            isIconTile
              ? 'w-full justify-center px-1.5 py-1 text-[10px]'
              : size === 'sm'
              ? 'px-2 py-1 text-[11px]'
              : 'px-2.5 py-1.5 text-xs'
          } inline-flex items-center gap-1.5 rounded font-medium text-fluent-muted hover:text-fluent-status-red hover:bg-fluent-status-red/10 border border-transparent hover:border-fluent-status-red/30 transition-colors disabled:opacity-50 shrink-0`}
          title={t.software.uninstallBtn}
        >
          <Trash2 className={`${size === 'sm' || isIconTile ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
          <span className="truncate">{isIconTile ? t.software.uninstallShort : t.software.uninstallBtn}</span>
        </button>
      )
    }

    return (
      <button
        onClick={() => onInstall(pkg.id)}
        disabled={isOperating}
        className={`${
          isIconTile
            ? 'w-full justify-center px-1.5 py-1 text-[10px]'
            : size === 'sm'
            ? 'px-2.5 py-1 text-[11px]'
            : 'px-3 py-1.5 text-xs'
        } inline-flex items-center gap-1.5 rounded font-medium bg-fluent-accent hover:bg-fluent-accent-hover text-white shadow-fluent-sm transition-colors disabled:opacity-50 shrink-0`}
        title={t.software.installBtn}
      >
        <Download className={`${size === 'sm' || isIconTile ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
        <span className="truncate">{t.software.installBtn}</span>
      </button>
    )
  }

  // --- View Mode 1: Icons / Tile ---
  if (viewMode === 'icons') {
    return (
      <div
        className={`p-3 rounded-xl border transition-all duration-200 flex flex-col items-center justify-between text-center relative bg-fluent-card/70 hover:bg-fluent-card min-h-[145px] ${
          isSelected
            ? 'border-fluent-accent ring-1 ring-fluent-accent'
            : 'border-fluent-border/70 hover:border-fluent-border'
        }`}
      >
        <div className="w-full flex items-center justify-between">
          {pkg.status === 'not_installed' ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(pkg.id)}
              disabled={isOperating}
              className="w-3.5 h-3.5 rounded border-fluent-border text-fluent-accent focus:ring-fluent-accent/40 bg-fluent-bg cursor-pointer shrink-0"
            />
          ) : (
            <div className="w-3.5 h-3.5 shrink-0" />
          )}

          {pkg.status === 'installed' && (
            <span className="w-2 h-2 rounded-full bg-fluent-status-green shrink-0" title={`${t.software.statusInstalled} (v${pkg.installedVersion || ''})`} />
          )}
          {pkg.status === 'update_available' && (
            <span className="w-2 h-2 rounded-full bg-fluent-status-yellow animate-pulse shrink-0" title={t.software.statusUpdateVersion.replace('{version}', pkg.latestVersion || '')} />
          )}
          {pkg.status === 'not_installed' && (
            <span className="w-1.5 h-1.5 rounded-full bg-fluent-muted/40 shrink-0" />
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-fluent-bg/90 border border-fluent-border/50 flex items-center justify-center text-fluent-accent my-1 shadow-sm shrink-0">
          <Icon className="w-5 h-5" />
        </div>

        <div className="w-full min-w-0 px-1">
          <h4 className="text-xs font-semibold text-slate-100 truncate" title={pkg.name}>
            {pkg.name}
          </h4>
          <p className="text-[10px] text-fluent-muted truncate mt-0.5">
            {pkg.status === 'installed'
              ? `v${pkg.installedVersion || t.software.statusInstalled}`
              : pkg.status === 'update_available'
              ? t.software.statusUpdateVersion.replace('{version}', pkg.latestVersion || '')
              : pkg.publisher || pkg.category}
          </p>
        </div>

        <div className="w-full mt-2">
          {renderActionButtons('sm', true)}
        </div>
      </div>
    )
  }

  // --- View Mode 2: Compact List Row ---
  if (viewMode === 'compact') {
    return (
      <div
        className={`p-2.5 px-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 bg-fluent-card/70 hover:bg-fluent-card ${
          isSelected
            ? 'border-fluent-accent ring-1 ring-fluent-accent'
            : 'border-fluent-border/70 hover:border-fluent-border'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {pkg.status === 'not_installed' ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(pkg.id)}
              disabled={isOperating}
              className="w-4 h-4 rounded border-fluent-border text-fluent-accent focus:ring-fluent-accent/40 bg-fluent-bg cursor-pointer shrink-0"
            />
          ) : (
            <div className="w-4 shrink-0" />
          )}

          <div className="w-8 h-8 rounded-lg bg-fluent-bg/80 border border-fluent-border/50 flex items-center justify-center shrink-0 text-fluent-accent">
            <Icon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-100 truncate">{pkg.name}</span>
              <span className="text-[10px] text-fluent-muted truncate hidden md:inline">
                {pkg.publisher || pkg.id}
              </span>
            </div>
            <p className="text-[11px] text-fluent-subtext truncate max-w-xl hidden sm:block">
              {pkg.description}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 flex items-center gap-3">
          <div>
            {pkg.status === 'installed' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-status-green/15 text-fluent-status-green border border-fluent-status-green/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>v{pkg.installedVersion || t.software.statusInstalled}</span>
              </span>
            )}
            {pkg.status === 'update_available' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-status-yellow/15 text-fluent-status-yellow border border-fluent-status-yellow/20">
                <ArrowUpCircle className="w-3 h-3" />
                <span>{t.software.statusUpdateVersion.replace('{version}', pkg.latestVersion || '')}</span>
              </span>
            )}
            {pkg.status === 'not_installed' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-border/50 text-fluent-muted border border-fluent-border/40">
                {t.software.statusReady}
              </span>
            )}
          </div>

          <div>{renderActionButtons('sm')}</div>
        </div>
      </div>
    )
  }

  // --- View Mode 3: Normal Card ---
  return (
    <div
      className={`p-4 rounded-fluent border transition-all duration-200 flex flex-col justify-between relative bg-fluent-card/70 hover:bg-fluent-card ${
        isSelected
          ? 'border-fluent-accent ring-1 ring-fluent-accent'
          : 'border-fluent-border/70 hover:border-fluent-border'
      }`}
    >
      {/* Top row: Checkbox, Icon, Title, Publisher */}
      <div>
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {pkg.status === 'not_installed' && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(pkg.id)}
                disabled={isOperating}
                className="w-4 h-4 rounded border-fluent-border text-fluent-accent focus:ring-fluent-accent/40 bg-fluent-bg cursor-pointer shrink-0"
              />
            )}
            <div className="w-10 h-10 rounded-lg bg-fluent-bg/80 border border-fluent-border/50 flex items-center justify-center shrink-0 text-fluent-accent">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-100 truncate" title={pkg.name}>
                {pkg.name}
              </h4>
              <p className="text-[11px] text-fluent-muted truncate" title={pkg.publisher || pkg.id}>
                {pkg.publisher || pkg.id}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0 ml-1">
            {pkg.status === 'installed' && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-status-green/15 text-fluent-status-green border border-fluent-status-green/20 max-w-[130px] truncate"
                title={`v${pkg.installedVersion || t.software.statusInstalled}`}
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">v{pkg.installedVersion || t.software.statusInstalled}</span>
              </span>
            )}
            {pkg.status === 'update_available' && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-status-yellow/15 text-fluent-status-yellow border border-fluent-status-yellow/20 max-w-[135px] truncate"
                title={t.software.statusUpdateVersion.replace('{version}', pkg.latestVersion || '')}
              >
                <ArrowUpCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">{t.software.statusUpdateVersion.replace('{version}', pkg.latestVersion || '')}</span>
              </span>
            )}
            {pkg.status === 'not_installed' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-border/50 text-fluent-muted border border-fluent-border/40">
                {t.software.statusReady}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-fluent-subtext line-clamp-2 mb-4 leading-relaxed">
          {pkg.description}
        </p>
      </div>

      {/* Action Button Footer */}
      <div className="pt-2 border-t border-fluent-border/40 flex items-center justify-between gap-2">
        <span className="text-[10px] text-fluent-muted truncate min-w-0 flex-1" title={pkg.id}>
          {pkg.id}
        </span>

        <div className="shrink-0">{renderActionButtons('md')}</div>
      </div>
    </div>
  )
}
