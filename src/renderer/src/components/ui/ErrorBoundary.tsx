import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center bg-fluent-bg text-fluent-text">
          <div className="max-w-md p-6 rounded-fluent-lg bg-fluent-card/90 border border-fluent-status-red-border/60 shadow-fluent space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Anzeigefehler aufgetreten</h2>
              <p className="text-xs text-fluent-muted mt-1">
                Ein unerwarteter Fehler hat das Laden dieser Ansicht verhindert.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 rounded-fluent bg-black/40 border border-white/5 text-left font-mono text-[11px] text-red-300 break-all select-text">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-fluent bg-fluent-accent text-white text-xs font-medium hover:bg-fluent-accent-hover transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Erneut versuchen
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-fluent bg-fluent-card border border-fluent-border text-slate-200 text-xs font-medium hover:bg-fluent-card/80 transition-colors"
              >
                App neu laden
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
