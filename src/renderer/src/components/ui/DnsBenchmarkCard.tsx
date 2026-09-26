import React from 'react'
import { Globe, RefreshCw, Trophy, Zap, AlertTriangle } from 'lucide-react'
import type { DnsBenchmarkItem } from '@shared/types'
import { useTranslation } from '../../i18n/LanguageContext'

interface DnsBenchmarkCardProps {
  results: DnsBenchmarkItem[]
  isBenchmarking: boolean
  testDomain: string
  onTestDomainChange: (domain: string) => void
  onRunBenchmark: () => void
}

export const DnsBenchmarkCard: React.FC<DnsBenchmarkCardProps> = ({
  results,
  isBenchmarking,
  testDomain,
  onTestDomainChange,
  onRunBenchmark
}) => {
  const { t } = useTranslation()

  return (
    <div className="p-5 rounded-2xl bg-fluent-card/50 border border-fluent-border/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fluent-text">
              {t.network.dnsTitle}
            </h3>
            <p className="text-xs text-fluent-muted">
              {t.network.dnsSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testDomain}
            onChange={(e) => onTestDomainChange(e.target.value)}
            placeholder="google.com"
            className="w-36 px-2.5 py-1.5 rounded-lg bg-fluent-bg/70 border border-fluent-border/60 text-xs text-fluent-text font-mono placeholder:text-fluent-muted/60 focus:outline-none focus:border-fluent-accent"
          />
          <button
            onClick={onRunBenchmark}
            disabled={isBenchmarking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
            {isBenchmarking ? t.network.dnsTestingBtn : t.network.dnsStartBenchmarkBtn}
          </button>
        </div>
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <div className="py-10 text-center space-y-2 bg-fluent-bg/40 rounded-xl border border-dashed border-fluent-border/60">
          <Globe className="w-8 h-8 text-fluent-muted/60 mx-auto" />
          <p className="text-xs text-fluent-muted">
            {t.network.dnsEmptyPrompt.replace('{domain}', testDomain || 'google.com')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((item, index) => {
            const isWinner = index === 0 && item.status === 'success'
            const maxLatency = Math.max(...results.filter((r) => r.status === 'success').map((r) => r.latencyMs), 100)
            const pct = item.status === 'success' ? Math.max(12, Math.round((item.latencyMs / maxLatency) * 100)) : 0

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  isWinner
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-fluent-bg/50 border-fluent-border/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isWinner
                        ? 'bg-amber-400 text-black'
                        : 'bg-fluent-card text-fluent-muted border border-fluent-border/60'
                    }`}
                  >
                    {isWinner ? <Trophy className="w-3.5 h-3.5" /> : index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-fluent-text">
                        {item.name}
                      </span>
                      {item.server !== 'System' && (
                        <span className="text-[11px] font-mono text-fluent-muted">
                          ({item.server})
                        </span>
                      )}
                      {isWinner && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {t.network.dnsFastestBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {item.status === 'success' ? (
                    <div className="flex items-center gap-2 text-right">
                      <div className="w-24 hidden sm:block h-1.5 bg-fluent-border/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isWinner ? 'bg-emerald-400' : 'bg-fluent-accent'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold font-mono text-fluent-text">
                        {item.latencyMs}{' '}
                        <span className="text-[10px] text-fluent-muted font-normal">ms</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {item.errorMessage || 'Timeout'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
