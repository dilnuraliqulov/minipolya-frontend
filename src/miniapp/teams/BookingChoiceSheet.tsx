import { ChevronRight, Swords, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BottomSheet, Button } from '../components'

/** "Qanday band qilasiz?" — a captain books alone or looks for an opposing team. */
export function BookingChoiceSheet({
  open,
  subtitle,
  priceText,
  onSelf,
  onOpponent,
  onClose,
}: {
  open: boolean
  subtitle: string
  priceText: string
  onSelf: () => void
  onOpponent: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const option = (icon: typeof User, title: string, text: string, onClick: () => void) => {
    const Icon = icon
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left"
      >
        <Icon size={22} className="shrink-0 text-link" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-md font-semibold text-primary">{title}</span>
          <span className="text-sm text-secondary">{text}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-secondary" aria-hidden />
      </button>
    )
  }
  return (
    <BottomSheet
      open={open}
      title={t('choice.title')}
      subtitle={subtitle}
      onClose={onClose}
      actions={
        <Button variant="ghost" onClick={onClose}>
          {t('choice.back')}
        </Button>
      }
    >
      {option(User, t('choice.self'), t('choice.selfText', { price: priceText }), onSelf)}
      {option(Swords, t('choice.opponent'), t('choice.opponentText'), onOpponent)}
      <p className="text-center text-xs text-secondary">{t('choice.note')}</p>
    </BottomSheet>
  )
}
