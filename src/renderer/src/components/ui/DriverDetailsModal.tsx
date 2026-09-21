import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  Download,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Cpu
} from 'lucide-react'
import type { DeviceItem } from '@shared/types'

interface DriverDetailsModalProps {
  device: DeviceItem | null
  onClose: () => void
  onExport: (infName: string) => void
  onRestart: (instanceId: string) => void
  isExporting?: boolean
}

export const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({
  device,
  onClose,
  onExport,
  onRestart,
  isExporting
}) => {
  const [copied, setCopied] = useState(false)

  if (!device) return null

  const handleCopyInstanceId = () => {
    navigator.clipboard.writeText(device.instanceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isProblem = device.status === 'Problem' || Boolean(device.problemCode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-fluent-card border border-fluent-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-fluent-border bg-fluent-card-subtle/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-fluent-accent/10 border border-fluent-accent/20 text-fluent-accent">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-fluent-text truncate">
                {device.deviceDescription}
              </h3>
              <p className="text-xs text-fluent-muted truncate">
                {device.manufacturerName} • Klasse: {device.className}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-fluent-muted hover:text-fluent-text hover:bg-fluent-card-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Problem Banner if present */}
          {isProblem && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Fehlerstatus: {device.problemCode ? `Problem-Code ${device.problemCode}` : 'Gerätefehler'}</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">
                {device.problemDescription || 'Windows hat ein Problem mit diesem Gerät gemeldet.'}
              </p>
            </div>
          )}

          {/* Gerätedetails */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fluent-muted mb-3">
              Hardware-Identifikation
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Gerätename:</span>
                <span className="text-sm font-medium text-fluent-text select-all">
                  {device.deviceDescription}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Hersteller:</span>
                <span className="text-sm font-medium text-fluent-text select-all">
                  {device.manufacturerName}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Geräteklasse & GUID:</span>
                <span className="text-xs font-mono text-fluent-text break-all">
                  {device.className} ({device.classGuid || 'N/A'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Status:</span>
                <span className="text-sm font-medium text-fluent-text">
                  {device.status} {device.isThirdParty ? '• Drittanbieter / OEM' : '• Windows Standard'}
                </span>
              </div>
            </div>

            {/* Instance ID with Copy button */}
            <div className="mt-3 p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs text-fluent-muted block mb-1">Geräteinstanz-Pfad (Instance ID):</span>
                <span className="text-xs font-mono text-fluent-text break-all select-all">
                  {device.instanceId}
                </span>
              </div>
              <button
                onClick={handleCopyInstanceId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover transition-colors shrink-0"
                title="Instanz-ID in die Zwischenablage kopieren"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-fluent-muted" />
                    Kopieren
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Treiberdetails */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-fluent-muted mb-3">
              Treiberpaket-Informationen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Treiberdatei (INF):</span>
                <span className="text-sm font-mono font-medium text-fluent-accent select-all">
                  {device.driverName || 'Kein Treiber zugeordnet'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Treiber-Anbieter:</span>
                <span className="text-sm font-medium text-fluent-text select-all">
                  {device.driverProvider || device.manufacturerName}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Treiberversion:</span>
                <span className="text-sm font-medium text-fluent-text">
                  {device.driverVersion || 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60">
                <span className="text-xs text-fluent-muted block mb-1">Treiberdatum:</span>
                <span className="text-sm font-medium text-fluent-text">
                  {device.driverDate || 'N/A'}
                </span>
              </div>
            </div>

            {/* Digitale Signatur / WHQL */}
            {device.signerName && (
              <div className="mt-3 p-3 rounded-xl bg-fluent-card-subtle/70 border border-fluent-border/60 flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-fluent-muted block">Digitale Signatur / Zertifikat:</span>
                  <span className="text-xs font-medium text-fluent-text select-all">
                    {device.signerName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-fluent-border bg-fluent-card-subtle/50">
          <div className="flex items-center gap-2">
            {device.driverName && device.driverName.toLowerCase().includes('.inf') && (
              <button
                onClick={() => onExport(device.driverName)}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Treiber exportieren
              </button>
            )}

            <button
              onClick={() => onRestart(device.instanceId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-fluent-card border border-fluent-border hover:bg-fluent-card-hover transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-fluent-muted" />
              Gerät neu starten
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-fluent-text bg-fluent-card-subtle hover:bg-fluent-card-hover transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
