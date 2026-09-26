import React from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface ExplorerRestartBannerProps {
  isRestarting: boolean
  onRestart: () => void
}

export const ExplorerRestartBanner: React.FC<ExplorerRestartBannerProps> = ({
  isRestarting,
  onRestart
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
          <RefreshCw className={`w-5 h-5 ${isRestarting ? 'animate-spin' : ''}`} />
        </div>
        <div className="text-left">
          <h4 className="text-sm font-semibold text-blue-100">
            {t.tweaks.restartBannerTitle}
          </h4>
          <p className="text-xs text-blue-300/80">
            {t.tweaks.restartBannerDesc}
          </p>
        </div>
      </div>

      <button
        onClick={onRestart}
        disabled={isRestarting}
        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
        {isRestarting ? t.tweaks.restartBannerRestarting : t.tweaks.restartBannerBtn}
      </button>
    </div>
  )
}
