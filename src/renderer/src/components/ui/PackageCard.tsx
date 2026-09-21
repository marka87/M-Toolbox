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

interface PackageCardProps {
  pkg: SoftwarePackage
  isSelected: boolean
  isOperating: boolean
  isCurrentActive: boolean
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
  onToggleSelect,
  onInstall,
  onUninstall,
  onUpgrade
}) => {
  const Icon = CATEGORY_ICONS[pkg.category] || Wrench

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
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            {pkg.status === 'not_installed' && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(pkg.id)}
                disabled={isOperating}
                className="w-4 h-4 rounded border-fluent-border text-fluent-accent focus:ring-fluent-accent/40 bg-fluent-bg cursor-pointer"
              />
            )}
            <div className="w-10 h-10 rounded-lg bg-fluent-bg/80 border border-fluent-border/50 flex items-center justify-center shrink-0 text-fluent-accent">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{pkg.name}</h4>
              <p className="text-[11px] text-fluent-muted truncate">{pkg.publisher || pkg.id}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {pkg.status === 'installed' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-status-green/15 text-fluent-status-green border border-fluent-status-green/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>v{pkg.installedVersion || 'installiert'}</span>
              </span>
            )}
            {pkg.status === 'update_available' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-status-yellow/15 text-fluent-status-yellow border border-fluent-status-yellow/20">
                <ArrowUpCircle className="w-3 h-3" />
                <span>Update: v{pkg.latestVersion}</span>
              </span>
            )}
            {pkg.status === 'not_installed' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-fluent-border/50 text-fluent-muted border border-fluent-border/40">
                Bereit
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
      <div className="pt-2 border-t border-fluent-border/40 flex items-center justify-between">
        <span className="text-[10px] text-fluent-muted truncate">
          {pkg.id}
        </span>

        <div>
          {isCurrentActive ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-fluent-accent/40 text-white cursor-wait"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verarbeite...</span>
            </button>
          ) : pkg.status === 'update_available' ? (
            <button
              onClick={() => onUpgrade(pkg.id)}
              disabled={isOperating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-fluent-status-yellow/20 hover:bg-fluent-status-yellow/30 text-fluent-status-yellow border border-fluent-status-yellow/30 transition-colors disabled:opacity-50"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Update</span>
            </button>
          ) : pkg.status === 'installed' ? (
            <button
              onClick={() => onUninstall(pkg.id)}
              disabled={isOperating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-fluent-muted hover:text-fluent-status-red hover:bg-fluent-status-red/10 border border-transparent hover:border-fluent-status-red/30 transition-colors disabled:opacity-50"
              title="Deinstallieren"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deinstallieren</span>
            </button>
          ) : (
            <button
              onClick={() => onInstall(pkg.id)}
              disabled={isOperating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-fluent-accent hover:bg-fluent-accent-hover text-white shadow-fluent-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installieren</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

