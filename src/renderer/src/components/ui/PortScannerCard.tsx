import React, { useState } from 'react'
import { Search, CheckCircle2, XCircle, Play } from 'lucide-react'
import type { PortScanReport } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface PortScannerCardProps {
  report: PortScanReport | null
  isScanning: boolean
  onScan: (target: string, ports: number[]) => void
}

export const PortScannerCard: React.FC<PortScannerCardProps> = ({
  report,
  isScanning,
  onScan
}) => {
  const { t } = useTranslation()
  const [target, setTarget] = useState('127.0.0.1')
  const [selectedPreset, setSelectedPreset] = useState('common')
  const [customPortsInput, setCustomPortsInput] = useState('')

  const presetPortGroups = [
    {
      id: 'common',
      label: t.network.portProfileCommon,
      ports: [80, 443, 22, 21, 3389, 445, 135, 8080]
    },
    {
      id: 'dev',
      label: t.network.portProfileDev,
      ports: [3000, 5173, 8080, 3306, 5432, 6379, 27017]
    },
    {
      id: 'all_common',
      label: t.network.portProfileTop16,
      ports: [21, 22, 25, 53, 80, 110, 135, 139, 143, 443, 445, 1433, 3000, 3306, 3389, 8080]
    }
  ]

  const handleStartScan = (e: React.FormEvent) => {
    e.preventDefault()
    let ports: number[] = []

    if (selectedPreset === 'custom') {
      const parts = customPortsInput.split(',')
      for (const p of parts) {
        const trimmed = p.trim()
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10))
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= Math.min(end, start + 30); i++) {
              if (i > 0 && i <= 65535) ports.push(i)
            }
          }
        } else {
          const num = parseInt(trimmed, 10)
          if (!isNaN(num) && num > 0 && num <= 65535) {
            ports.push(num)
          }
        }
      }
      if (ports.length === 0) ports = [80, 443]
    } else {
      const preset = presetPortGroups.find((g) => g.id === selectedPreset)
      ports = preset ? preset.ports : [80, 443]
    }

    onScan(target || '127.0.0.1', ports)
  }

  return (
    <div className="p-5 rounded-2xl bg-fluent-card/50 border border-fluent-border/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fluent-text">
              {t.network.portScannerTitle}
            </h3>
            <p className="text-xs text-fluent-muted">
              {t.network.portScannerSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Input controls */}
      <form onSubmit={handleStartScan} className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-fluent-muted block mb-1">
              {t.network.portTargetLabel}
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="127.0.0.1 oder 192.168.1.1"
              className="w-full px-3 py-1.5 rounded-lg bg-fluent-bg/70 border border-fluent-border/60 text-xs text-fluent-text font-mono placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent"
            />
          </div>

          <div className="sm:w-60">
            <label className="text-[11px] font-medium text-fluent-muted block mb-1">
              {t.network.portProfileLabel}
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-fluent-bg/70 border border-fluent-border/60 text-xs text-fluent-text focus:outline-none focus:border-fluent-accent"
            >
              {presetPortGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label} ({g.ports.length} Ports)
                </option>
              ))}
              <option value="custom">{t.network.portProfileCustom}</option>
            </select>
          </div>

          <div className="self-end pt-1">
            <button
              type="submit"
              disabled={isScanning}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-fluent-accent hover:bg-fluent-accent/90 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? t.network.portScanningBtn : t.network.portScanBtn}
            </button>
          </div>
        </div>

        {selectedPreset === 'custom' && (
          <div>
            <label className="text-[11px] font-medium text-fluent-muted block mb-1">
              {t.network.portCustomPortsLabel}
            </label>
            <input
              type="text"
              value={customPortsInput}
              onChange={(e) => setCustomPortsInput(e.target.value)}
              placeholder="80, 443, 8080, 3000-3005"
              className="w-full px-3 py-1.5 rounded-lg bg-fluent-bg/70 border border-fluent-border/60 text-xs text-fluent-text font-mono placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent"
            />
          </div>
        )}
      </form>

      {/* Results Header */}
      {report && (
        <div className="space-y-3 pt-2 border-t border-fluent-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-fluent-muted">
              {t.network.portResultFor} <strong className="text-fluent-text font-mono">{report.target}</strong>:
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-semibold">
                {t.network.portOpenCount.replace('{count}', String(report.openCount))}
              </span>
              <span className="text-neutral-400">
                {t.network.portClosedCount.replace('{count}', String(report.scannedCount - report.openCount))}
              </span>
              <span className="text-fluent-muted font-mono text-[11px]">
                ({report.durationMs}ms)
              </span>
            </div>
          </div>

          {/* Grid of Scanned Ports */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {report.results.map((p) => {
              return (
                <div
                  key={p.port}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                    p.isOpen
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-fluent-bg/40 border-fluent-border/30 opacity-70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-fluent-text">
                      Port {p.port}
                    </div>
                    <div className="text-[10px] text-fluent-muted truncate">
                      {p.service}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {p.isOpen ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> {t.network.portOpenBadge}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-normal text-neutral-400">
                        <XCircle className="w-3 h-3" /> {t.network.portClosedBadge}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
