import React from 'react'
import { Minus, Square, X, Wrench, Gauge } from 'lucide-react'

export const Titlebar: React.FC = () => {
  const handleMinimize = () => {
    window.mToolbox?.system?.minimize()
  }

  const handleMaximize = () => {
    window.mToolbox?.system?.maximize()
  }

  const handleClose = () => {
    window.mToolbox?.system?.close()
  }

  const handleToggleWidget = () => {
    window.mToolbox?.widget?.toggle()
  }

  return (
    <header className="titlebar-drag-region h-10 w-full bg-fluent-sidebar/95 border-b border-fluent-border flex items-center justify-between px-3 select-none z-50 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded bg-fluent-accent flex items-center justify-center text-white shadow-sm">
          <Wrench className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-100 tracking-wide">M-TOOLBOX</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-fluent-border text-fluent-muted font-medium">v{__APP_VERSION__}</span>
        </div>
      </div>

      <div className="titlebar-no-drag flex items-center">
        <button
          onClick={handleToggleWidget}
          className="w-10 h-10 flex items-center justify-center text-fluent-muted hover:text-cyan-400 hover:bg-white/5 transition-colors"
          title="Desktop Mini-HUD Widget (Overlay) ein-/ausblenden"
        >
          <Gauge className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMinimize}
          className="w-10 h-10 flex items-center justify-center text-fluent-muted hover:text-white hover:bg-white/5 transition-colors"
          title="Minimieren"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-10 flex items-center justify-center text-fluent-muted hover:text-white hover:bg-white/5 transition-colors"
          title="Maximieren"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center text-fluent-muted hover:text-white hover:bg-red-600 transition-colors"
          title="Schließen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  )
}

