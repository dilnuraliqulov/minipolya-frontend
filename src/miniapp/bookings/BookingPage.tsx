import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock, MapPin, Phone, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { formatTime } from '../../shared/format'
import { BOOKINGS_KEY, bookingKey, type Booking } from '../api/bookings'
import { getMyPayments } from '../api/payments'
import type { StadiumDetail } from '../api/stadiums'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  LogoMark,
  Screen,
  SkeletonList,
} from '../components'
import { formatLongDate } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { useCountdown } from '../payment/useCountdown'
import { formatLabel } from '../stadiums/labels'
import { mapLink } from '../../shared/map'
import { useStadium } from '../stadiums/queries'
import { openExternalLink } from '../telegram'
import { BookingStatusBadge } from './BookingStatusBadge'
import { CancelSheet } from './CancelSheet'
import { PaymentSummary } from './PaymentSummary'
import { PayRemainderSheet } from './PayRemainderSheet'
import { RefundLine } from './RefundLine'
import { ReviewSection } from './ReviewSection'
import { useBooking } from './queries'
import { bookingWhen, isAhead } from './when'

const CANCELLABLE = new Set(['pending', 'confirmed'])
const LIVE = new Set(['confirmed', 'completed'])

/** Bron: one booking — time and place, payment, pay the rest, cancel. */
export function BookingPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack('/games')
  const booking = useBooking(id)
  const header = <Header title={t('booking.title')} onBack={goBack} />

  if (booking.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (booking.isError) {
    const notFound =
      isApiError(booking.error) && (booking.error.status === 404 || booking.error.status === 403)
    return (
      <Screen header={header} className="justify-center">
        {notFound ? (
          <EmptyState
            icon={SearchX}
            title={t('booking.notFoundTitle')}
            description={t('booking.notFoundText')}
          />
        ) : (
          <ErrorState onRetry={() => void booking.refetch()} />
        )}
      </Screen>
    )
  }
  return (
    <Screen header={header}>
      <BookingContent booking={booking.data} />
    </Screen>
  )
}

function BookingContent({ booking }: { booking: Booking }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  // The stadium adds photo, district, address and phone; the page works without it.
  const stadium = useStadium(booking.stadiumId).data
  const [sheet, setSheet] = useState<'pay' | 'cancel' | null>(null)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: bookingKey(booking.id) })
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY })
  }
  const owesRest = booking.paymentStatus === 'partially_paid' && LIVE.has(booking.status)
  // A remainder charge still being settled must not be paid a second time.
  const [settling, setSettling] = useState(false)
  const payments = useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => getMyPayments(0),
    enabled: owesRest,
  })
  const processing = payments.data?.content.some(
    (p) => p.bookingId === booking.id && p.paymentType === 'remainder' && p.status === 'processing',
  )
  const canPayRest = owesRest && !settling && !processing && !payments.isPending
  const canCancel = CANCELLABLE.has(booking.status)

  return (
    <>
      <Head booking={booking} stadium={stadium} />
      {booking.status === 'pending' && booking.expiresAt && (
        <PendingBanner expiresAt={booking.expiresAt} />
      )}
      <Details booking={booking} stadium={stadium} />

      <PaymentSummary booking={booking}>
        {owesRest && (settling || processing) && (
          <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
            {t('checkout.checkingTitle')} · {t('checkout.checkingText')}
          </p>
        )}
        {canPayRest && (
          <>
            <Button haptic onClick={() => setSheet('pay')}>
              {t('booking.payRest')}
            </Button>
            <p className="text-center text-sm text-secondary">{t('booking.cashNote')}</p>
          </>
        )}
        {booking.status === 'pending' && booking.paymentStatus === 'unpaid' && (
          <>
            <Button disabled>{t('booking.payNow')}</Button>
            <p className="text-center text-xs text-secondary">{t('common.soon')}</p>
          </>
        )}
      </PaymentSummary>

      {booking.cancelledAt && (
        <Card className="flex flex-col gap-1 p-4 text-sm text-secondary">
          <p>
            {t('booking.cancelledAt', {
              date: formatLongDate(booking.cancelledAt),
              time: formatTime(booking.cancelledAt),
            })}
          </p>
          {booking.cancellationReason && (
            <p>{t('booking.cancelReason', { reason: booking.cancellationReason })}</p>
          )}
        </Card>
      )}

      {booking.status === 'completed' && <ReviewSection booking={booking} />}

      {canCancel && (
        <section className="flex flex-col gap-3" aria-labelledby="booking-rules">
          <h3 id="booking-rules" className="text-lg font-semibold text-primary">
            {t('booking.rules')}
          </h3>
          <p className="text-sm text-secondary">
            {isAhead(booking.cancellationDeadline)
              ? t('booking.rulesDeadline', {
                  date: formatLongDate(booking.cancellationDeadline),
                  time: formatTime(booking.cancellationDeadline),
                })
              : t('checkout.cancelNote', {
                  hours: booking.cancellationPolicy.cancellationHours,
                })}
          </p>
          <RefundLine booking={booking} />
          <Button variant="danger-outline" onClick={() => setSheet('cancel')}>
            {t('booking.cancel')}
          </Button>
        </section>
      )}

      <PayRemainderSheet
        open={sheet === 'pay'}
        booking={booking}
        onClose={(outcome) => {
          setSheet(null)
          if (outcome === 'checking') setSettling(true)
          refresh()
          void queryClient.invalidateQueries({ queryKey: ['payments', 'my'] })
        }}
        onPaid={() => {
          setSheet(null)
          refresh()
        }}
      />
      <CancelSheet
        open={sheet === 'cancel'}
        booking={booking}
        onClose={() => setSheet(null)}
        onDone={() => {
          setSheet(null)
          refresh()
        }}
      />
    </>
  )
}

function Head({ booking, stadium }: { booking: Booking; stadium?: StadiumDetail }) {
  const { t } = useTranslation()
  const photo = stadium && [...stadium.photos].sort((a, b) => a.position - b.position)[0]
  const [broken, setBroken] = useState(false)
  const meta = stadium
    ? [
        stadium.district ? t('stadium.districtName', { district: stadium.district }) : null,
        formatLabel(stadium.format),
      ]
        .filter(Boolean)
        .join(' · ')
    : null
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-secondary">
        {photo && !broken ? (
          <img
            src={photo.url}
            alt=""
            width={72}
            height={72}
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <LogoMark size={28} className="opacity-40" />
        )}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <h2 className="w-full truncate text-2xl font-bold text-primary">{booking.stadiumName}</h2>
        {meta && <p className="text-sm text-secondary">{meta}</p>}
        <BookingStatusBadge status={booking.status} />
      </div>
    </div>
  )
}

function PendingBanner({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation()
  const hold = useCountdown(expiresAt)
  return (
    <div className="flex gap-3 rounded-xl bg-warning-soft p-3 text-warning">
      <Clock size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">
          {t('booking.pendingBanner', { time: formatTime(expiresAt) })}
        </p>
        <p>
          {hold.expired
            ? t('checkout.holdExpired')
            : t('booking.pendingLeft', { left: hold.label })}
        </p>
      </div>
    </div>
  )
}

function Details({ booking, stadium }: { booking: Booking; stadium?: StadiumDetail }) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="flex items-center gap-3 text-base text-primary">
        <CalendarDays size={18} className="shrink-0 text-link" aria-hidden />
        {bookingWhen(booking)}
      </p>
      <p className="flex items-center gap-3 text-base text-primary">
        <Clock size={18} className="shrink-0 text-link" aria-hidden />
        {t('booking.hours', { count: booking.durationHours })}
      </p>
      {stadium && (
        <div className="flex items-start gap-3">
          <MapPin size={18} className="mt-0.5 shrink-0 text-link" aria-hidden />
          <div className="flex flex-col items-start gap-1">
            <p className="text-base text-primary">{stadium.address}</p>
            <button
              type="button"
              className="flex min-h-11 items-center text-sm font-semibold text-link"
              onClick={() => openExternalLink(mapLink(stadium))}
            >
              {t('booking.openMap')}
            </button>
          </div>
        </div>
      )}
      {stadium?.phone && (
        <div className="flex items-center gap-3 border-t border-border pt-3">
          <Phone size={18} className="shrink-0 text-link" aria-hidden />
          <span className="flex-1 text-base text-primary">{stadium.phone}</span>
          <a
            href={`tel:${stadium.phone}`}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-on-accent"
          >
            <Phone size={16} aria-hidden />
            {t('booking.call')}
          </a>
        </div>
      )}
    </Card>
  )
}
