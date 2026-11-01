import { toTashkentParts } from '../../shared/format'
import { MONTH_KEYS } from '../format'
import i18n from '../i18n'

/**
 * The booking date strip. The backend accepts availability dates from today
 * (Tashkent) to 4 weeks ahead (`app.booking.max-weeks-ahead`, inclusive), and
 * answers 400 outside it.
 */
export const BOOKING_WINDOW_DAYS = 28

export interface StripDate {
  /** `"2026-11-02"` — what the availability endpoint takes. */
  iso: string
  day: number
  /** 0 = Monday … 6 = Sunday (the backend's convention). */
  dayOfWeek: number
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's calendar date in Tashkent, `"YYYY-MM-DD"`. */
export function tashkentToday(now: Date = new Date()): string {
  const { year, month, day } = toTashkentParts(now)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Calendar maths on a plain date (no time zone involved). */
function addDays(iso: string, days: number): StripDate {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return {
    iso: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    day: date.getUTCDate(),
    dayOfWeek: (date.getUTCDay() + 6) % 7,
  }
}

/** Today and the next 28 days. */
export function bookingDates(today: string): StripDate[] {
  return Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => addDays(today, i))
}

/**
 * Whether `iso` is one of the strip's days (today … 28 days ahead) — for a
 * date that arrives from outside, such as `?date=` on the stadium page.
 * Anything else (malformed, past, too far ahead, null) is false.
 */
export function isInBookingWindow(iso: string | null, today: string): boolean {
  if (iso === null || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return bookingDates(today).some((date) => date.iso === iso)
}

export const WEEKDAY_SHORT_KEYS = [
  'weekdays.short.mon',
  'weekdays.short.tue',
  'weekdays.short.wed',
  'weekdays.short.thu',
  'weekdays.short.fri',
  'weekdays.short.sat',
  'weekdays.short.sun',
] as const

const WEEKDAY_LONG_KEYS = [
  'weekdays.long.mon',
  'weekdays.long.tue',
  'weekdays.long.wed',
  'weekdays.long.thu',
  'weekdays.long.fri',
  'weekdays.long.sat',
  'weekdays.long.sun',
] as const

/** `"2026-10-22"` → `"Payshanba, 22-oktabr"`. */
export function dayTitle(iso: string): string {
  const { day, dayOfWeek } = addDays(iso, 0)
  const month = Number(iso.slice(5, 7))
  return i18n.t('format.dayTitle', {
    weekday: i18n.t(WEEKDAY_LONG_KEYS[dayOfWeek] ?? WEEKDAY_LONG_KEYS[0]),
    day,
    month: i18n.t(MONTH_KEYS[month - 1] ?? MONTH_KEYS[0]),
  })
}

/** `{ startTime: "20:00:00", endTime: "21:00:00" }` → `"20:00–21:00"` (Tashkent times from the API). */
export function slotLabel(slot: { startTime: string; endTime: string }): string {
  return `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`
}

export function nextDate(iso: string): string {
  return addDays(iso, 1).iso
}
