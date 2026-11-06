import { Banknote, CircleCheck, CreditCard } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { remainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import { Badge, Card } from '../components'
import { formatMoney } from '../format'

/**
 * The design's "Toʻlov" card: Narx, Toʻlangan, Qolgan summa — straight from the
 * booking — and how it was settled (E10): "Toʻliq toʻlangan", or "Maydonda naqd
 * toʻlangan" when cash arrived at the pitch.
 */
export function PaymentSummary({ booking, children }: { booking: Booking; children?: ReactNode }) {
  const { t } = useTranslation()
  const state = remainderState(booking)
  const settled = state === 'paidInFull' || state === 'cashReceived'
  // A cancelled or expired booking owes nothing, whatever remainingAmount says.
  const ended = booking.status === 'expired' || booking.status.startsWith('cancelled')
  const owes = booking.remainingAmount > 0 && !ended
  const cash = booking.paidInCash ?? 0
  return (
    <Card className="flex flex-col gap-3 p-4" role="region" aria-labelledby="booking-payment">
      <h3
        id="booking-payment"
        className="flex items-center gap-2 text-lg font-semibold text-primary"
      >
        <CreditCard size={18} className="text-link" aria-hidden />
        {t('booking.payment')}
      </h3>
      <dl className="flex flex-col gap-2 text-base">
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">{t('booking.price')}</dt>
          <dd className="text-primary">{formatMoney(booking.price)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">{t('booking.paid')}</dt>
          <dd className="flex items-center gap-1 text-primary">
            {formatMoney(booking.paidAmount)}
            {settled && <CircleCheck size={16} className="text-success" aria-hidden />}
          </dd>
        </div>
        {owes ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-secondary">{t('booking.remaining')}</dt>
            <dd className="flex items-center gap-2 font-semibold text-primary">
              {formatMoney(booking.remainingAmount)}
              <Badge tone="warning">{t('booking.unpaid')}</Badge>
            </dd>
          </div>
        ) : (
          state === 'paidInFull' && (
            <div className="flex justify-end">
              <Badge tone="success">{t('booking.paidInFull')}</Badge>
            </div>
          )
        )}
      </dl>
      {state === 'cashReceived' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-semibold text-success">
            <Banknote size={16} className="shrink-0" aria-hidden />
            {t('booking.paidCash')}
          </p>
          {cash > 0 && cash < booking.paidAmount && (
            <p className="text-sm text-secondary">
              {t('booking.cashSplit', {
                app: formatMoney(booking.paidAmount - cash),
                cash: formatMoney(cash),
              })}
            </p>
          )}
          <p className="text-sm text-secondary">{t('booking.cashNoRefund')}</p>
        </div>
      )}
      {children}
    </Card>
  )
}
