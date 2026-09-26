import React from 'react'
import {
  Crown,
  Sliders,
  Laptop,
  Activity,
  Gauge,
  Layers,
  Cpu,
  Info,
  Database,
  ShieldAlert,
  FolderKanban,
  Cog,
  CalendarClock,
  FileText,
  HardDrive,
  ShieldCheck,
  FileKey,
  ExternalLink,
  Shield,
  RefreshCw
} from 'lucide-react'
import type { AdvancedToolItem } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface ToolLauncherCardProps {
  tool: AdvancedToolItem
  isLaunching: boolean
  onLaunch: (toolId: string) => void
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Crown: <Crown className="w-5 h-5 text-amber-400" />,
  Sliders: <Sliders className="w-5 h-5 text-blue-400" />,
  Laptop: <Laptop className="w-5 h-5 text-cyan-400" />,
  Activity: <Activity className="w-5 h-5 text-emerald-400" />,
  Gauge: <Gauge className="w-5 h-5 text-purple-400" />,
  Layers: <Layers className="w-5 h-5 text-indigo-400" />,
  Cpu: <Cpu className="w-5 h-5 text-rose-400" />,
  Info: <Info className="w-5 h-5 text-blue-400" />,
  Database: <Database className="w-5 h-5 text-amber-500" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5 text-red-400" />,
  FolderKanban: <FolderKanban className="w-5 h-5 text-sky-400" />,
  Cog: <Cog className="w-5 h-5 text-teal-400" />,
  CalendarClock: <CalendarClock className="w-5 h-5 text-orange-400" />,
  FileText: <FileText className="w-5 h-5 text-yellow-400" />,
  HardDrive: <HardDrive className="w-5 h-5 text-indigo-400" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
  FileKey: <FileKey className="w-5 h-5 text-purple-400" />
}

export const ToolLauncherCard: React.FC<ToolLauncherCardProps> = ({
  tool,
  isLaunching,
  onLaunch
}) => {
  const { t } = useTranslation()
  const toolName = (t.advanced as Record<string, string>)[`tool_${tool.id}_title`] || tool.name
  const toolDesc = (t.advanced as Record<string, string>)[`tool_${tool.id}_desc`] || tool.description

  return (
    <div
      onClick={() => !isLaunching && onLaunch(tool.id)}
      className="group p-4 rounded-xl bg-fluent-card/40 border border-fluent-border/60 hover:bg-fluent-card/70 hover:border-fluent-accent/50 transition-all duration-200 cursor-pointer flex flex-col justify-between select-none"
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="p-2.5 rounded-lg bg-fluent-bg/60 border border-fluent-border/40 group-hover:bg-fluent-accent/10 group-hover:border-fluent-accent/30 transition-colors shrink-0">
            {TOOL_ICONS[tool.iconName] || <Cog className="w-5 h-5 text-fluent-muted" />}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {tool.requiresAdmin && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Shield className="w-2.5 h-2.5" /> {t.advanced.adminBadge}
              </span>
            )}
            <span className="font-mono text-[10px] text-fluent-muted px-1.5 py-0.5 rounded bg-fluent-bg/80 border border-fluent-border/40">
              {tool.command.split(' ')[0]}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-fluent-text group-hover:text-fluent-accent transition-colors">
            {toolName}
          </h4>
          <p className="text-xs text-fluent-muted line-clamp-2 mt-1 leading-relaxed">
            {toolDesc}
          </p>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-fluent-border/30 flex items-center justify-between">
        <span className="text-[11px] text-fluent-muted group-hover:text-fluent-text transition-colors">
          {t.advanced.clickToLaunch}
        </span>
        <button
          type="button"
          disabled={isLaunching}
          onClick={(e) => {
            e.stopPropagation()
            onLaunch(tool.id)
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-fluent-accent/15 border border-fluent-accent/30 hover:bg-fluent-accent text-fluent-accent hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
        >
          {isLaunching ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <ExternalLink className="w-3 h-3" />
          )}
          {isLaunching ? t.advanced.launching : t.advanced.open}
        </button>
      </div>
    </div>
  )
}


