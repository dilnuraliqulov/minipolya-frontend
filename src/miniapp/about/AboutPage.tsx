import { FileText, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Card, Header, ListRow, LogoMark, Screen } from '../components'
import { useGoBack } from '../lib/useGoBack'

/** Profil → Ilova haqida: logo, version, and the two text pages. */
export function AboutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useGoBack('/profile')
  return (
    <Screen header={<Header title={t('about.title')} onBack={goBack} />}>
      <div className="flex flex-col items-center gap-3 py-6">
        <LogoMark size={64} />
        <p className="text-3xl font-bold text-primary">{t('app.name')}</p>
        <p className="text-sm text-secondary">{t('about.version', { version: __APP_VERSION__ })}</p>
      </div>
      <Card>
        <ListRow
          icon={FileText}
          label={t('about.terms')}
          onClick={() => navigate('/profile/about/terms')}
        />
        <ListRow
          icon={Shield}
          label={t('about.privacy')}
          onClick={() => navigate('/profile/about/privacy')}
        />
      </Card>
      <p className="text-center text-xs text-secondary">{t('about.copyright')}</p>
    </Screen>
  )
}

const TERMS = ['general', 'booking', 'cancel', 'owners', 'changes'] as const
const PRIVACY = ['collect', 'use', 'share', 'keep', 'contact'] as const

/** Each page's sections as [title key, text key]. */
const SECTIONS = {
  terms: TERMS.map((s) => [`legal.terms.${s}.title`, `legal.terms.${s}.text`] as const),
  privacy: PRIVACY.map((s) => [`legal.privacy.${s}.title`, `legal.privacy.${s}.text`] as const),
}

/** "Foydalanish shartlari" / "Maxfiylik siyosati": headings and paragraphs from i18n. */
export function LegalPage({ page }: { page: keyof typeof SECTIONS }) {
  const { t } = useTranslation()
  const goBack = useGoBack('/profile/about')
  return (
    <Screen header={<Header title={t(`about.${page}`)} onBack={goBack} />}>
      {SECTIONS[page].map(([title, text], index) => (
        <section key={title} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-primary">
            {index + 1}. {t(title)}
          </h2>
          <p className="text-base text-secondary">{t(text)}</p>
        </section>
      ))}
    </Screen>
  )
}
