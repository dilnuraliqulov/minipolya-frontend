import { Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '../format'
import { Button } from './Button'

interface RemainderCardProps {
  /** Tiyin, straight from the API (`remainingAmount`). */
  amount: number
  /** Opens paying in the app; without it there is no button. */
  onPay?: () => void
  /** Takes the button's place, e.g. while a payment is being confirmed. */
  status?: ReactNode
  /** `compact` is label + amount only, in phrasing markup: it goes inside a link. */
  variant?: 'full' | 'compact'
}

/**
 * What is still owed, everywhere a remainder shows: the normal card surface
 * with a slim warning edge, the amount as the main number, "Ilovada toʻlash",
 * and paying in cash at the pitch as the second way.
 */
export function RemainderCard({ amount, onPay, status, variant = 'full' }: RemainderCardProps) {
  const { t } = useTranslation()
  const labelId = useId()
  const money = formatMoney(amount)

  if (variant === 'compact') {
    return (
      <span className="flex w-full items-baseline justify-between gap-2 border-l-2 border-l-warning-text pl-2">
        <span className="text-xs text-secondary">{t('booking.remaining')}</span>
        <span className="text-base font-bold text-primary tabular-nums">{money}</span>
      </span>
    )
  }

  return (
    <section
      aria-labelledby={labelId}
      className="flex flex-col gap-3 rounded-2xl border border-border border-l-4 border-l-warning-text bg-background p-4"
    >
      {/* The label the region is announced by: the same words, with the amount. */}
      <span id={labelId} className="sr-only">
        {t('booking.remainderTitle', { amount: money })}
      </span>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm text-secondary">{t('booking.remaining')}</p>
          <p className="text-4xl font-bold text-primary tabular-nums">{money}</p>
        </div>
        <Wallet size={24} className="shrink-0 text-warning-text" aria-hidden />
      </div>
      {status ??
        (onPay && (
          <Button haptic onClick={onPay}>
            {t('booking.payRest')}
          </Button>
        ))}
      <p className="text-center text-sm text-secondary">{t('booking.cashNote')}</p>
    </section>
  )
}
