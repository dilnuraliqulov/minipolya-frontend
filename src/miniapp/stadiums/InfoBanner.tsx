import { ShieldCheck, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** The design's Info Banner on Bosh sahifa: "Toʻlov xavfsiz · Bekor qilish shartlari aniq", closable. */
export function InfoBanner({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-10 items-center gap-2 rounded-xl bg-accent-soft pr-1 pl-3">
      <ShieldCheck size={18} className="shrink-0 text-link" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
        {t('stadiums.bannerText')}
      </p>
      {/* A 32px box, inside a 44px hit area. */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('stadiums.bannerClose')}
        className="-mx-1.5 -my-0.5 flex size-11 shrink-0 items-center justify-center text-secondary"
      >
        <span className="flex size-8 items-center justify-center">
          <X size={16} aria-hidden />
        </span>
      </button>
    </div>
  )
}
