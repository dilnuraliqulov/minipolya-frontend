import { formatTimeRange } from '../../shared/format'
import type { Booking } from '../api/bookings'
import { dayTitle, tashkentToday } from '../stadiums/dates'

/** U+2060 WORD JOINER: invisible, forbids a line break on either side. */
const WJ = '\u2060'

/**
 * `"Juma, 6-noyabr · 20:00–21:00"` in Tashkent time. The time range never
 * wraps at its dash on a narrow screen (word joiners around the `–`).
 */
export function bookingWhen(booking: Pick<Booking, 'startsAt' | 'endsAt'>): string {
  const range = formatTimeRange(booking.startsAt, booking.endsAt).replace('–', `${WJ}–${WJ}`)
  return `${dayTitle(tashkentToday(new Date(booking.startsAt)))} · ${range}`
}

/**
 * Whether an API deadline (`cancellationDeadline`) is still ahead. Only decides
 * whether to print the date; the refund itself always comes from the API.
 */
export function isAhead(iso: string | undefined, now = Date.now()): iso is string {
  return iso !== undefined && new Date(iso).getTime() > now
}
