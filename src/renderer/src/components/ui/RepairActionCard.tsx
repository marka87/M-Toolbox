import React from 'react'
import {
  Wrench,
  RefreshCw,
  Wifi,
  Printer,
  Layout,
  ShoppingBag,
  Shield,
  Clock,
  Play,
  AlertTriangle
} from 'lucide-react'
import type { RepairActionItem, RepairCategory } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface RepairActionCardProps {
  action: RepairActionItem
  isRunning: boolean
  isAnyRunning: boolean
  isAdmin: boolean
  onRun: (actionId: string) => void
}

function getCategoryIcon(cat: RepairCategory) {
  switch (cat) {
    case 'system':
      return <Wrench className="w-5 h-5 text-fluent-accent" />
    case 'update':
      return <RefreshCw className="w-5 h-5 text-sky-400" />
    case 'network':
      return <Wifi className="w-5 h-5 text-emerald-400" />
    case 'spooler':
      return <Printer className="w-5 h-5 text-indigo-400" />
    case 'explorer':
      return <Layout className="w-5 h-5 text-amber-400" />
    case 'store':
      return <ShoppingBag className="w-5 h-5 text-purple-400" />
    default:
      return <Wrench className="w-5 h-5 text-fluent-accent" />
  }
}

export const RepairActionCard: React.FC<RepairActionCardProps> = ({
  action,
  isRunning,
  isAnyRunning,
  isAdmin,
  onRun
}) => {
  const { t, language } = useTranslation()

  const actionI18nMap: Record<string, { title: string; desc: string; dur: string }> = {
    sfc_scannow: {
      title: t.repair.act_sfc_title,
      desc: t.repair.act_sfc_desc,
      dur: language === 'de' ? '5-15 Min.' : '5-15 min.'
    },
    dism_restorehealth: {
      title: t.repair.act_dism_restore_title,
      desc: t.repair.act_dism_restore_desc,
      dur: language === 'de' ? '5-20 Min.' : '5-20 min.'
    },
    dism_scanhealth: {
      title: t.repair.act_dism_scan_title,
      desc: t.repair.act_dism_scan_desc,
      dur: language === 'de' ? '3-10 Min.' : '3-10 min.'
    },
    windows_update_reset: {
      title: t.repair.act_wu_reset_title,
      desc: t.repair.act_wu_reset_desc,
      dur: language === 'de' ? '1-2 Min.' : '1-2 min.'
    },
    network_dns_flush: {
      title: t.repair.act_dns_flush_title,
      desc: t.repair.act_dns_flush_desc,
      dur: language === 'de' ? '< 5 Sek.' : '< 5 sec.'
    },
    network_winsock_reset: {
      title: t.repair.act_winsock_reset_title,
      desc: t.repair.act_winsock_reset_desc,
      dur: language === 'de' ? '10 Sek.' : '10 sec.'
    },
    network_ip_renew: {
      title: t.repair.act_ip_renew_title,
      desc: t.repair.act_ip_renew_desc,
      dur: language === 'de' ? '10-20 Sek.' : '10-20 sec.'
    },
    spooler_repair: {
      title: t.repair.act_spooler_repair_title,
      desc: t.repair.act_spooler_repair_desc,
      dur: language === 'de' ? '10-15 Sek.' : '10-15 sec.'
    },
    explorer_restart: {
      title: t.repair.act_explorer_restart_title,
      desc: t.repair.act_explorer_restart_desc,
      dur: language === 'de' ? '< 5 Sek.' : '< 5 sec.'
    },
    wsearch_restart: {
      title: t.repair.act_wsearch_restart_title,
      desc: t.repair.act_wsearch_restart_desc,
      dur: language === 'de' ? '10 Sek.' : '10 sec.'
    },
    store_reset: {
      title: t.repair.act_store_reset_title,
      desc: t.repair.act_store_reset_desc,
      dur: language === 'de' ? '15-30 Sek.' : '15-30 sec.'
    },
    appx_re_register: {
      title: t.repair.act_appx_rereg_title,
      desc: t.repair.act_appx_rereg_desc,
      dur: language === 'de' ? '1-3 Min.' : '1-3 min.'
    }
  }

  const i18nInfo = actionI18nMap[action.id]
  const displayTitle = i18nInfo?.title ?? action.title
  const displayDesc = i18nInfo?.desc ?? action.description
  const displayDur = i18nInfo?.dur ?? action.estimatedDuration

  return (
    <div className="flex flex-col justify-between p-4 rounded-xl border border-fluent-border bg-fluent-card hover:border-fluent-border-hover transition-all">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-fluent-card-subtle shrink-0">
              {getCategoryIcon(action.category)}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-fluent-text truncate">
                {displayTitle}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-fluent-muted">
                  <Clock className="w-3 h-3" />
                  {displayDur}
                </span>

                {action.requiresAdmin && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                      isAdmin
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}
                    title={isAdmin ? t.repair.actionAdminPresentTooltip : t.repair.actionUacRequiredTooltip}
                  >
                    <Shield className="w-3 h-3" />
                    {t.repair.actionAdminBadge}
                  </span>
                )}

                {action.riskLevel === 'caution' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    {t.repair.actionRestartBadge}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-fluent-muted leading-relaxed mb-4">
          {displayDesc}
        </p>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-fluent-border/60 flex items-center justify-between gap-2">
        <span className="text-[11px] text-fluent-muted">
          {isRunning ? (
            <span className="text-fluent-accent font-medium animate-pulse">
              {t.repair.actionExecuting}
            </span>
          ) : action.requiresAdmin && !isAdmin ? (
            <span className="text-amber-400/90">{t.repair.actionUacPromptRequired}</span>
          ) : (
            <span className="text-emerald-400">{t.repair.actionReady}</span>
          )}
        </span>

        <button
          onClick={() => onRun(action.id)}
          disabled={isRunning || isAnyRunning}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
            isRunning
              ? 'bg-fluent-accent/50 text-white cursor-wait'
              : 'bg-fluent-accent text-white hover:bg-fluent-accent-hover disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {t.repair.actionRunningBtn}
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              {t.repair.actionRepairBtn}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
