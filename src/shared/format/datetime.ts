/**
 * The only place UTC timestamps from the API are turned into Tashkent
 * wall-clock values. Never format an API timestamp with ad-hoc Date methods.
 */

export const DISPLAY_TIME_ZONE = 'Asia/Tashkent'

/** A moment as seen on a clock in Tashkent. */
export interface TashkentParts {
  year: number
  /** 1–12. */
  month: number
  day: number
  /** 0–23. */
  hour: number
  minute: number
  /** 0 = Monday … 6 = Sunday — the backend's convention, not `Date.getDay()`. */
  dayOfWeek: number
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Parses an ISO-8601 timestamp from the API. Throws on an invalid value. */
export function parseUtc(iso: string): Date {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid timestamp: ${iso}`)
  }
  return date
}

export function toTashkentParts(value: string | Date): TashkentParts {
  const date = typeof value === 'string' ? parseUtc(value) : value
  const parts: Record<string, string> = {}
  for (const part of partsFormatter.formatToParts(date)) parts[part.type] = part.value
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dayOfWeek: WEEKDAYS.indexOf(parts.weekday ?? ''),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's calendar date in Tashkent, `"YYYY-MM-DD"` (a backend `LocalDate`). */
export function tashkentToday(now: Date = new Date()): string {
  const { year, month, day } = toTashkentParts(now)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** `"2026-11-02T15:00:00Z"` → `"02.11.2026"` */
export function formatDate(value: string | Date): string {
  const p = toTashkentParts(value)
  return `${pad(p.day)}.${pad(p.month)}.${p.year}`
}

/** `"2026-11-02T15:00:00Z"` → `"20:00"` */
export function formatTime(value: string | Date): string {
  const p = toTashkentParts(value)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** `"2026-11-02T15:00:00Z"` → `"02.11.2026 20:00"` */
export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} ${formatTime(value)}`
}

/** `("2026-11-02T15:00:00Z", "2026-11-02T17:00:00Z")` → `"20:00–22:00"` */
export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)}–${formatTime(end)}`
}

/**
 * A Tashkent wall-clock date and time → the ISO UTC instant, for request
 * bodies: `("2026-11-06", "20:00")` → `"2026-11-06T15:00:00.000Z"`. The offset
 * comes from `Intl`, not a hard-coded +5.
 */
export function tashkentToUtc(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  if (
    y === undefined ||
    mo === undefined ||
    d === undefined ||
    h === undefined ||
    mi === undefined ||
    [y, mo, d, h, mi].some(Number.isNaN)
  ) {
    throw new RangeError(`Invalid Tashkent date or time: ${date} ${time}`)
  }
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  const offsetAt = (instant: number) => {
    const p = toTashkentParts(new Date(instant))
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - instant
  }
  let instant = wall - offsetAt(wall)
  instant = wall - offsetAt(instant)
  return new Date(instant).toISOString()
}
