import { ChevronDown, Send } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, cx, Header, Screen } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { SectionLabel } from '../profile/ProfileSections'
import { openSupport, supportUsername } from '../telegram'

const FAQ = ['booking', 'cancel', 'cash', 'teams', 'stadium'] as const

/** Profil → Yordam: the support chat (VITE_TELEGRAM_SUPPORT_USERNAME) and five answers. */
export function HelpPage() {
  const { t } = useTranslation()
  const goBack = useGoBack('/profile')
  const support = supportUsername()
  const [open, setOpen] = useState<string | null>(FAQ[0])
  return (
    <Screen header={<Header title={t('help.title')} onBack={goBack} />}>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-md font-semibold text-primary">{t('help.supportTitle')}</p>
        <p className="text-sm text-secondary">
          {support ? t('help.supportText') : t('help.supportSoon')}
        </p>
        {support && (
          <Button haptic onClick={openSupport}>
            <Send size={18} aria-hidden />
            {t('help.write', { username: support })}
          </Button>
        )}
      </Card>
      <SectionLabel>{t('help.faq')}</SectionLabel>
      <Card>
        {FAQ.map((key) => (
          <FaqItem
            key={key}
            question={t(`help.q.${key}`)}
            answer={t(`help.a.${key}`)}
            open={open === key}
            onToggle={() => setOpen(open === key ? null : key)}
          />
        ))}
      </Card>
    </Screen>
  )
}

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
}) {
  const panelId = useId()
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left active:bg-hover"
      >
        <span className="flex-1 text-md font-medium text-primary">{question}</span>
        <ChevronDown
          size={18}
          className={cx('shrink-0 text-secondary transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <p id={panelId} className="px-4 pb-4 text-sm text-secondary">
          {answer}
        </p>
      )}
    </div>
  )
}
