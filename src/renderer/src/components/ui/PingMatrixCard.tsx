import React, { useState } from 'react'
import { Activity, RefreshCw, Plus, WifiOff } from 'lucide-react'
import type { PingResultItem } from '@shared/types'

interface PingMatrixCardProps {
  results: PingResultItem[]
  isPinging: boolean
  onRefresh: (customHost?: string) => void
}

export const PingMatrixCard: React.FC<PingMatrixCardProps> = ({
  results,
  isPinging,
  onRefresh
}) => {
  const [customHost, setCustomHost] = useState('')

  const handleCustomPing = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customHost.trim()) return
    onRefresh(customHost.trim())
  }

  const getStatusColor = (status: PingResultItem['status']) => {
    switch (status) {
      case 'excellent':
        return {
          bar: 'bg-emerald-500',
          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          label: 'Ausgezeichnet'
        }
      case 'good':
        return {
          bar: 'bg-cyan-500',
          badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          label: 'Gut'
        }
      case 'moderate':
        return {
          bar: 'bg-amber-500',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          label: 'Mäßig'
        }
      case 'high':
        return {
          bar: 'bg-rose-500',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          label: 'Hohe Latenz'
        }
      default:
        return {
          bar: 'bg-neutral-600',
          badge: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
          label: 'Nicht erreichbar'
        }
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-fluent-card/50 border border-fluent-border/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-fluent-accent/15 border border-fluent-accent/30 text-fluent-accent">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fluent-text">
              Latenz- & Ping-Monitor
            </h3>
            <p className="text-xs text-fluent-muted">
              Echtzeit-Verzögerungsmessung zu primären Internet- und Gateway-Gegenstellen
            </p>
          </div>
        </div>

        <button
          onClick={() => onRefresh(customHost || undefined)}
          disabled={isPinging}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fluent-accent/10 border border-fluent-accent/20 hover:bg-fluent-accent/20 text-fluent-accent text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
          {isPinging ? 'Prüfe...' : 'Jetzt messen'}
        </button>
      </div>

      {/* Target Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {results.map((item) => {
          const cfg = getStatusColor(item.status)
          const pct = item.isAlive ? Math.min(100, Math.max(10, 100 - item.latencyMs * 0.8)) : 0

          return (
            <div
              key={item.target}
              className="p-3.5 rounded-xl bg-fluent-bg/60 border border-fluent-border/40 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-fluent-text">
                    {item.name}
                  </h4>
                  <p className="text-[11px] font-mono text-fluent-muted">
                    {item.target}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {item.isAlive ? (
                      <span className="text-sm font-bold font-mono text-fluent-text">
                        {item.latencyMs} <span className="text-[10px] text-fluent-muted">ms</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-neutral-400 flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Offline
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border mt-0.5 ${cfg.badge}`}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Ping Visual Bar */}
              <div className="w-full h-1.5 rounded-full bg-fluent-border/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Min/Max/Loss */}
              {item.isAlive && item.minMs !== undefined && (
                <div className="flex items-center justify-between text-[10px] text-fluent-muted pt-0.5">
                  <span>Min: {item.minMs}ms</span>
                  <span>Max: {item.maxMs}ms</span>
                  <span>Verlust: {item.packetLossPercent}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Custom Host Ping Input */}
      <form
        onSubmit={handleCustomPing}
        className="flex items-center gap-2 pt-1 border-t border-fluent-border/30"
      >
        <input
          type="text"
          value={customHost}
          onChange={(e) => setCustomHost(e.target.value)}
          placeholder="Eigene Adresse testen (z. B. 1.0.0.1 oder speedtest.net)..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-fluent-bg/70 border border-fluent-border/60 text-xs text-fluent-text placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent transition-colors font-mono"
        />
        <button
          type="submit"
          disabled={isPinging || !customHost.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fluent-card border border-fluent-border/60 hover:bg-fluent-border/40 text-fluent-text text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          Ziel anpingen
        </button>
      </form>
    </div>
  )
}
