import React, { useState } from 'react'
import {
  Wifi,
  Network,
  Radio,
  Check,
  Copy
} from 'lucide-react'
import type { NetworkAdapterInfo } from '@shared/types'

interface NetworkAdapterCardProps {
  adapter: NetworkAdapterInfo
}

export const NetworkAdapterCard: React.FC<NetworkAdapterCardProps> = ({ adapter }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyToClipboard = (key: string, text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const isWifi =
    adapter.name.toLowerCase().includes('wi-fi') ||
    adapter.name.toLowerCase().includes('wlan') ||
    adapter.description.toLowerCase().includes('wireless') ||
    adapter.description.toLowerCase().includes('802.11')

  const isEthernet =
    adapter.name.toLowerCase().includes('ethernet') ||
    adapter.description.toLowerCase().includes('ethernet') ||
    adapter.description.toLowerCase().includes('gigabit') ||
    adapter.description.toLowerCase().includes('i219')

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        adapter.status === 'Up'
          ? 'bg-fluent-card/70 border-fluent-border/60 hover:border-fluent-accent/40'
          : 'bg-fluent-card/30 border-fluent-border/30 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`p-2.5 rounded-lg border mt-0.5 shrink-0 ${
              adapter.status === 'Up'
                ? adapter.isPrimary
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-fluent-accent/15 border-fluent-accent/30 text-fluent-accent'
                : 'bg-fluent-bg/60 border-fluent-border/40 text-fluent-muted'
            }`}
          >
            {isWifi ? (
              <Wifi className="w-5 h-5" />
            ) : isEthernet ? (
              <Network className="w-5 h-5" />
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-fluent-text truncate">
                {adapter.name}
              </h4>
              {adapter.isPrimary && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Standard-Route
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  adapter.status === 'Up'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    adapter.status === 'Up' ? 'bg-emerald-400' : 'bg-neutral-400'
                  }`}
                />
                {adapter.status === 'Up' ? 'Verbunden' : 'Getrennt'}
              </span>
            </div>

            <p className="text-xs text-fluent-muted truncate mt-0.5">
              {adapter.description}
            </p>
          </div>
        </div>

        {adapter.linkSpeed && adapter.linkSpeed !== '0 bps' && (
          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-fluent-text bg-fluent-card px-2 py-1 rounded-md border border-fluent-border/40">
              {adapter.linkSpeed}
            </span>
          </div>
        )}
      </div>

      {/* Detail Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-fluent-border/30 text-xs">
        {/* IPv4 Address */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-fluent-bg/50 border border-fluent-border/20">
          <span className="text-fluent-muted">IPv4:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-medium text-fluent-text">
              {adapter.ipv4Address || 'Keine IP zugewiesen'}
            </span>
            {adapter.ipv4Address && (
              <button
                onClick={() => copyToClipboard('ipv4', adapter.ipv4Address)}
                title="IPv4 kopieren"
                className="p-1 text-fluent-muted hover:text-fluent-accent transition-colors"
              >
                {copiedKey === 'ipv4' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Gateway */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-fluent-bg/50 border border-fluent-border/20">
          <span className="text-fluent-muted">Gateway:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-medium text-fluent-text">
              {adapter.gateway || '-'}
            </span>
            {adapter.gateway && (
              <button
                onClick={() => copyToClipboard('gw', adapter.gateway)}
                title="Gateway kopieren"
                className="p-1 text-fluent-muted hover:text-fluent-accent transition-colors"
              >
                {copiedKey === 'gw' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* DNS Servers */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-fluent-bg/50 border border-fluent-border/20">
          <span className="text-fluent-muted">DNS:</span>
          <span className="font-mono font-medium text-fluent-text truncate max-w-[180px]">
            {adapter.dnsServers.length > 0 ? adapter.dnsServers.join(', ') : '-'}
          </span>
        </div>

        {/* MAC Address */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-fluent-bg/50 border border-fluent-border/20">
          <span className="text-fluent-muted">MAC:</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-fluent-text">
              {adapter.macAddress}
            </span>
            {adapter.macAddress && adapter.macAddress !== '-' && (
              <button
                onClick={() => copyToClipboard('mac', adapter.macAddress)}
                title="MAC-Adresse kopieren"
                className="p-1 text-fluent-muted hover:text-fluent-accent transition-colors"
              >
                {copiedKey === 'mac' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
