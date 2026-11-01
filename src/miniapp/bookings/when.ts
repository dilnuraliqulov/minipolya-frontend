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
