import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { remainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import { LogoMark, RemainderCard } from '../components'
import { BookingStatusBadge } from './BookingStatusBadge'
import { bookingWhen } from './when'

/**
 * The design's Booking Card. The booking carries no stadium photo yet (R31),
 * so the tile shows the mark. A booking that still owes shows the remainder (E10).
 */
export function BookingCard({ booking }: { booking: Booking }) {
  const state = remainderState(booking)
  const owes = state === 'remainder' || state === 'notPaid'
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="flex min-h-22 items-center gap-3 rounded-2xl border border-border bg-background p-3"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-surface text-secondary">
        <LogoMark size={28} className="opacity-40" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <h2 className="w-full truncate text-md font-semibold text-primary">
          {booking.stadiumName}
        </h2>
        <span className="text-sm text-secondary">{bookingWhen(booking)}</span>
        <span className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={booking.status} />
        </span>
        {owes && <RemainderCard amount={booking.remainingAmount} variant="compact" />}
      </span>
      <ChevronRight size={20} className="shrink-0 text-secondary" aria-hidden />
    </Link>
  )
}
