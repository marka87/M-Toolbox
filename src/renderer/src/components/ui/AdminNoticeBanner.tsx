import React from 'react'
import { ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

interface AdminNoticeBannerProps {
  isAdmin: boolean
  onRestartAsAdmin: () => void
}

export const AdminNoticeBanner: React.FC<AdminNoticeBannerProps> = ({
  isAdmin,
  onRestartAsAdmin
}) => {
  const { t } = useTranslation()

  if (isAdmin) {
    return (
      <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>{t.repair.adminBannerActiveTitle} </strong>{t.repair.adminBannerActiveDesc}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold block text-amber-300">
            {t.repair.adminBannerUserTitle}
          </span>
          <span className="text-amber-200/80">
            {t.repair.adminBannerUserDesc}
          </span>
        </div>
      </div>

      <button
        onClick={onRestartAsAdmin}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black transition-colors shrink-0"
        title={t.repair.restartAsAdminTooltip}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {t.repair.restartAsAdminBtn}
      </button>
    </div>
  )
}

