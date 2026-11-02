import { CalendarClock, Check, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { formatTime, formatTimeRange } from '../../shared/format'
import type { Booking } from '../api/bookings'
import { ButtonLink, Card, Header, Screen } from '../components'
import { formatLongDate, formatMoney } from '../format'
import { dayTitle, tashkentToday } from '../stadiums/dates'
import { RefundLine } from '../bookings/RefundLine'
import { isAhead } from '../bookings/when'

/** Band qilindi! — the booking the checkout just paid, passed in the route state. */
export function BookedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const booking = (location.state as { booking?: Booking } | null)?.booking
  if (!booking) return <Navigate to="/games" replace />

  const when = `${dayTitle(tashkentToday(new Date(booking.startsAt)))} · ${formatTimeRange(
    booking.startsAt,
    booking.endsAt,
  )}`
  return (
    <Screen
      header={
        <Header title={t('booked.headerTitle')} onBack={() => navigate('/', { replace: true })} />
      }
    >
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
          <Check size={40} strokeWidth={3} aria-hidden />
        </span>
        <h2 className="text-3xl font-bold text-primary">{t('booked.title')}</h2>
        <p className="text-lg font-medium text-primary">{booking.stadiumName}</p>
        <p className="text-base text-secondary">{when}</p>
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-primary">
          <CreditCard size={18} className="text-link" aria-hidden />
          <span>{t('booked.paid', { amount: formatMoney(booking.paidAmount) })}</span>
          {booking.remainingAmount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{t('booked.remaining', { amount: formatMoney(booking.remainingAmount) })}</span>
            </>
          )}
        </p>
        {booking.remainingAmount > 0 && (
          <p className="text-sm text-secondary">{t('booked.remainderNote')}</p>
        )}
      </Card>

      {isAhead(booking.cancellationDeadline) ? (
        <p className="flex items-center justify-center gap-2 text-sm text-secondary">
          <CalendarClock size={16} aria-hidden />
          {t('booked.deadline', {
            date: formatLongDate(booking.cancellationDeadline),
            time: formatTime(booking.cancellationDeadline),
          })}
        </p>
      ) : (
        <RefundLine booking={booking} />
      )}

      <div className="flex flex-col gap-3 pt-2">
        <ButtonLink to="/games" replace>
          {t('booked.toGames')}
        </ButtonLink>
        <ButtonLink to="/" replace variant="ghost">
          {t('booked.home')}
        </ButtonLink>
      </div>
    </Screen>
  )
}
