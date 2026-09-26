import React from 'react'
import {
  Folder,
  Layout,
  Shield,
  Gamepad2,
  Sliders,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import type { TweakItem, TweakCategory } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface TweakToggleCardProps {
  tweak: TweakItem
  isToggling: boolean
  onToggle: (tweakId: string, nextValue: boolean) => void
}

const CATEGORY_ICONS: Record<TweakCategory, React.ReactNode> = {
  all: <Sliders className="w-4 h-4 text-fluent-accent" />,
  explorer: <Folder className="w-4 h-4 text-blue-400" />,
  taskbar: <Layout className="w-4 h-4 text-indigo-400" />,
  privacy: <Shield className="w-4 h-4 text-emerald-400" />,
  gaming: <Gamepad2 className="w-4 h-4 text-purple-400" />,
  system: <Sliders className="w-4 h-4 text-amber-400" />
}

export const TweakToggleCard: React.FC<TweakToggleCardProps> = ({
  tweak,
  isToggling,
  onToggle
}) => {
  const { t } = useTranslation()
  const isChecked = tweak.value

  const i18nMap: Record<string, { title: string; desc: string }> = {
    classic_context_menu: { title: t.tweaks.tw_classic_context_menu_title, desc: t.tweaks.tw_classic_context_menu_desc },
    show_file_extensions: { title: t.tweaks.tw_show_file_extensions_title, desc: t.tweaks.tw_show_file_extensions_desc },
    show_hidden_files: { title: t.tweaks.tw_show_hidden_files_title, desc: t.tweaks.tw_show_hidden_files_desc },
    compact_mode: { title: t.tweaks.tw_compact_mode_title, desc: t.tweaks.tw_compact_mode_desc },
    launch_this_pc: { title: t.tweaks.tw_launch_this_pc_title, desc: t.tweaks.tw_launch_this_pc_desc },
    disable_aero_shake: { title: t.tweaks.tw_disable_aero_shake_title, desc: t.tweaks.tw_disable_aero_shake_desc },
    taskbar_align_left: { title: t.tweaks.tw_taskbar_align_left_title, desc: t.tweaks.tw_taskbar_align_left_desc },
    hide_taskbar_widgets: { title: t.tweaks.tw_hide_taskbar_widgets_title, desc: t.tweaks.tw_hide_taskbar_widgets_desc },
    hide_task_view: { title: t.tweaks.tw_hide_task_view_title, desc: t.tweaks.tw_hide_task_view_desc },
    disable_bing_search: { title: t.tweaks.tw_disable_bing_search_title, desc: t.tweaks.tw_disable_bing_search_desc },
    disable_advertising_id: { title: t.tweaks.tw_disable_advertising_id_title, desc: t.tweaks.tw_disable_advertising_id_desc },
    disable_start_suggestions: { title: t.tweaks.tw_disable_start_suggestions_title, desc: t.tweaks.tw_disable_start_suggestions_desc },
    disable_activity_history: { title: t.tweaks.tw_disable_activity_history_title, desc: t.tweaks.tw_disable_activity_history_desc },
    disable_telemetry: { title: t.tweaks.tw_disable_telemetry_title, desc: t.tweaks.tw_disable_telemetry_desc },
    enable_game_mode: { title: t.tweaks.tw_enable_game_mode_title, desc: t.tweaks.tw_enable_game_mode_desc },
    disable_game_dvr: { title: t.tweaks.tw_disable_game_dvr_title, desc: t.tweaks.tw_disable_game_dvr_desc },
    optimize_visual_effects: { title: t.tweaks.tw_optimize_visual_effects_title, desc: t.tweaks.tw_optimize_visual_effects_desc },
    prevent_auto_reboot_update: { title: t.tweaks.tw_prevent_auto_reboot_update_title, desc: t.tweaks.tw_prevent_auto_reboot_update_desc }
  }

  const title = i18nMap[tweak.id]?.title ?? tweak.title
  const description = i18nMap[tweak.id]?.desc ?? tweak.description

  const handleToggle = () => {
    if (isToggling) return
    onToggle(tweak.id, !isChecked)
  }

  return (
    <div
      onClick={handleToggle}
      className={`group relative flex items-start justify-between gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        isChecked
          ? 'bg-fluent-card/70 border-fluent-accent/40 shadow-sm hover:border-fluent-accent/60'
          : 'bg-fluent-card/30 border-fluent-border/40 hover:bg-fluent-card/50 hover:border-fluent-border/80'
      }`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div
          className={`p-2.5 rounded-lg border mt-0.5 transition-colors shrink-0 ${
            isChecked
              ? 'bg-fluent-accent/15 border-fluent-accent/30 text-fluent-accent'
              : 'bg-fluent-bg/60 border-fluent-border/40 text-fluent-muted'
          }`}
        >
          {CATEGORY_ICONS[tweak.category] || <Sliders className="w-4 h-4" />}
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-fluent-text group-hover:text-fluent-accent transition-colors">
              {title}
            </h4>

            {tweak.recommendedValue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                {t.tweaks.badgeRecommended}
              </span>
            )}

            {tweak.requiresRestart === 'explorer' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <RefreshCw className="w-2.5 h-2.5" />
                {t.tweaks.badgeRestartExplorer}
              </span>
            )}

            {tweak.requiresAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Shield className="w-2.5 h-2.5" />
                {t.tweaks.badgeAdmin}
              </span>
            )}
          </div>

          <p className="text-xs text-fluent-muted leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Modern Switch Toggle Button */}
      <div className="shrink-0 pt-0.5 pl-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          disabled={isToggling}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-fluent-accent focus:ring-offset-2 focus:ring-offset-fluent-bg ${
            isChecked ? 'bg-fluent-accent' : 'bg-fluent-border/60'
          } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
        >
          <span className="sr-only">{tweak.title}</span>
          <span
            className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isChecked ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isToggling && (
              <span className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-3 h-3 animate-spin text-neutral-800" />
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
