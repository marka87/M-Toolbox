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
                {action.title}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-fluent-muted">
                  <Clock className="w-3 h-3" />
                  {action.estimatedDuration}
                </span>

                {action.requiresAdmin && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                      isAdmin
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}
                    title={isAdmin ? 'Administratorrechte vorhanden' : 'UAC-Bestätigung erforderlich'}
                  >
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}

                {action.riskLevel === 'caution' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    Neustart
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-fluent-muted leading-relaxed mb-4">
          {action.description}
        </p>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-fluent-border/60 flex items-center justify-between gap-2">
        <span className="text-[11px] text-fluent-muted">
          {isRunning ? (
            <span className="text-fluent-accent font-medium animate-pulse">
              Wird ausgeführt...
            </span>
          ) : action.requiresAdmin && !isAdmin ? (
            <span className="text-amber-400/90">UAC-Dialog erforderlich</span>
          ) : (
            <span className="text-emerald-400">Bereit</span>
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
              Läuft...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Reparieren
            </>
          )}
        </button>
      </div>
    </div>
  )
}
