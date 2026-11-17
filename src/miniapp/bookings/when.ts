import { formatTimeRange, tashkentToday } from '../../shared/format'
import type { Booking } from '../api/bookings'
import i18n from '../i18n'
import { dayTitle, weekdayOf } from '../stadiums/dates'

/** U+2060 WORD JOINER: invisible, forbids a line break on either side. */
const WJ = '\u2060'

/**
 * `"Juma, 6-noyabr · 20:00–21:00"` in Tashkent time, from the booking's REAL start — the
 * date it actually happens on. The time range never wraps at its dash on a narrow screen
 * (word joiners around the `–`).
 *
 * An hour after midnight belongs to the evening before, which the backend says with
 * `workingDate` / `afterMidnight`: it is named in brackets, "(shanba kechasi)", so the
 * player sees both the real date and the night they booked. The rule itself is never
 * derived here.
 */
export function bookingWhen(
  booking: Pick<Booking, 'startsAt' | 'endsAt'> &
    Partial<Pick<Booking, 'workingDate' | 'afterMidnight'>>,
): string {
  const range = formatTimeRange(booking.startsAt, booking.endsAt).replace('–', `${WJ}–${WJ}`)
  const when = `${dayTitle(tashkentToday(new Date(booking.startsAt)))} · ${range}`
  if (booking.afterMidnight !== true || booking.workingDate === undefined) return when
  return `${when} ${i18n.t('bookings.workingNight', {
    weekday: weekdayOf(booking.workingDate).toLocaleLowerCase(),
  })}`
}

/**
 * Whether an API deadline (`cancellationDeadline`) is still ahead. Only decides
 * whether to print the date; the refund itself always comes from the API.
 */
export function isAhead(iso: string | undefined, now = Date.now()): iso is string {
  return iso !== undefined && new Date(iso).getTime() > now
}
