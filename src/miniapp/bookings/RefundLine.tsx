import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Booking } from '../api/bookings'
import { formatMoney } from '../format'

/** The API's refund figure, never recomputed (`refundIfCancelledNow`). */
export function RefundLine({ booking }: { booking: Booking }) {
  const { t } = useTranslation()
  const refund = booking.refundIfCancelledNow
  if (refund !== undefined && refund > 0) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm text-success-text">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
        {/* Cash taken at the pitch never comes back through the app. */}
        {(booking.paidInCash ?? 0) > 0
          ? t('booking.refundNowCash', { amount: formatMoney(refund) })
          : t('booking.refundNow', { amount: formatMoney(refund) })}
      </p>
    )
  }
  if (booking.paidAmount > 0) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning-text">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
        {t('booking.noRefundNow')}
      </p>
    )
  }
  return null
}
