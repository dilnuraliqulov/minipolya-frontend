import { useTranslation } from 'react-i18next'

export function PlaceholderPage() {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-page p-6 text-center">
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-background px-6 py-5 shadow-sm">
        <h1 className="text-xl font-semibold text-primary">{t('app.name')}</h1>
        <p className="text-base text-secondary">{t('app.tagline')}</p>
      </div>
    </main>
  )
}
