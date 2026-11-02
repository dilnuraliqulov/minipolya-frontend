import { formatTimeRange } from '../../shared/format'
import type { Booking } from '../api/bookings'
import { dayTitle, tashkentToday } from '../stadiums/dates'

/** `"Juma, 6-noyabr · 20:00–21:00"` in Tashkent time. */
export function bookingWhen(booking: Pick<Booking, 'startsAt' | 'endsAt'>): string {
  return `${dayTitle(tashkentToday(new Date(booking.startsAt)))} · ${formatTimeRange(
    booking.startsAt,
    booking.endsAt,
  )}`
}

/**
 * Whether an API deadline (`cancellationDeadline`) is still ahead. Only decides
 * whether to print the date; the refund itself always comes from the API.
 */
export function isAhead(iso: string | undefined, now = Date.now()): iso is string {
  return iso !== undefined && new Date(iso).getTime() > now
}
