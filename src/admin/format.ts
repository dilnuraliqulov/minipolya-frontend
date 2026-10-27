import { parseUtc, toTashkentParts } from '../shared/format'

/** Uzbek (Latin) month names, index 0 = January. Admin panel only — no i18n there. */
const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
]
const MONTHS_SHORT = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
]

function parseLocalDate(date: string): { month: number; day: number } {
  const [, month, day] = date.split('-').map(Number)
  return { month: month ?? 1, day: day ?? 1 }
}

/** A backend `LocalDate` ("2026-10-14") → "14 oktabr". No time zone involved. */
export function formatDayMonth(date: string): string {
  const { month, day } = parseLocalDate(date)
  return `${day} ${MONTHS[month - 1]}`
}

/** A backend `LocalDate` ("2026-10-14") → "14 okt". */
export function formatDayMonthShort(date: string): string {
  const { month, day } = parseLocalDate(date)
  return `${day} ${MONTHS_SHORT[month - 1]}`
}

/** Today's date in Tashkent as a `LocalDate` string, e.g. "2026-10-27". */
export function tashkentToday(now: Date = new Date()): string {
  const p = toTashkentParts(now)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** The `count` dates ending with `last` (inclusive), oldest first: LocalDate strings. */
export function lastDays(last: string, count: number): string[] {
  const [year, month, day] = last.split('-').map(Number)
  const end = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  )
}

/** How long ago a UTC timestamp was: "5 daqiqa oldin", "3 soat oldin", "2 kun oldin". */
export function formatAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - parseUtc(iso).getTime()) / 60_000))
  if (minutes < 1) return 'hozirgina'
  if (minutes < 60) return `${minutes} daqiqa oldin`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} soat oldin`
  return `${Math.floor(hours / 24)} kun oldin`
}
