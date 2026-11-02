import { CircleCheck, CreditCard } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Booking } from '../api/bookings'
import { Badge, Card } from '../components'
import { formatMoney } from '../format'

/** The design's "Toʻlov" card: Narx, Toʻlangan, Qolgan summa — straight from the booking. */
export function PaymentSummary({ booking, children }: { booking: Booking; children?: ReactNode }) {
  const { t } = useTranslation()
  // A cancelled or expired booking is not 'paid' any more, whatever paidAmount says.
  const ended = booking.status === 'expired' || booking.status.startsWith('cancelled')
  const paidInFull = booking.paymentStatus === 'paid' && !ended
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
            {paidInFull && <CircleCheck size={16} className="text-success" aria-hidden />}
          </dd>
        </div>
        {booking.remainingAmount > 0 && !ended ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-secondary">{t('booking.remaining')}</dt>
            <dd className="flex items-center gap-2 font-semibold text-primary">
              {formatMoney(booking.remainingAmount)}
              <Badge tone="warning">{t('booking.unpaid')}</Badge>
            </dd>
          </div>
        ) : (
          paidInFull && (
            <div className="flex justify-end">
              <Badge tone="success">{t('booking.paidInFull')}</Badge>
            </div>
          )
        )}
      </dl>
      {children}
    </Card>
  )
}
