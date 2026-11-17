import i18n from '../i18n'
import { hourLabel, type RuleKey } from './stadiumRules'

/**
 * A stadium's weekly opening schedule, as the owner edits it. Mirrors the backend's
 * `WeeklyHoursRules` so the owner hears about a mistake before "Saqlash" — the backend
 * still decides. `dayOfWeek` is 0 = Monday … 6 = Sunday, the backend's convention.
 *
 * A `close` at or before `open` means the **next morning** (08:00–02:00 is a twenty-hour
 * day) and must be 06:00 at the latest; `close` 0 means **midnight**, the end of that same
 * day. The hours after midnight belong to the day that opened them — the *working day* —
 * which is why they are edited here and shown at the end of that day's slot list.
 */
export interface DayHours {
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number
  closed: boolean
  /** Whole hour 0–23; absent on a closed day. */
  open?: number
  /** Whole hour 0–23, 0 meaning midnight; absent on a closed day. */
  close?: number
}

/** One day of the schedule on the wire (`DayHoursResponse` / `DayHoursRequest`). */
export interface ApiDayHours {
  dayOfWeek: number
  closed: boolean
  /** `"08:00:00"`; absent on a closed day. */
  openTime?: string
  closeTime?: string
}

export const DAYS_IN_WEEK = 7

/** The latest a day may close when it closes after midnight. */
export const LATEST_AFTER_MIDNIGHT_CLOSE = 6

/** The smallest gap between one day's closing and the next day's opening, in hours. */
export const MIN_GAP_HOURS = 1

/**
 * The closing hours an owner may pick for a day opening at `open`, in the order they are
 * offered: the rest of that day, then midnight, then the small hours of the next morning
 * (06:00 at the latest). Only valid choices are listed, so the picker cannot produce a
 * week the backend would refuse.
 */
export function closingOptions(open: number): number[] {
  const sameDay = Array.from({ length: 23 - open }, (_, i) => open + 1 + i)
  const nextMorning = Array.from({ length: LATEST_AFTER_MIDNIGHT_CLOSE }, (_, i) => i + 1).filter(
    // Strictly before the opening: closing AT it would be a full 24 hours open.
    (hour) => hour < open,
  )
  // Midnight is the end of this same day; it is not a choice for a day opening at 00:00,
  // which would be 24 hours open.
  return [...sameDay, ...(open === 0 ? [] : [0]), ...nextMorning]
}

/**
 * The two-letter day names the schedule uses, Monday first: Du, Se, Ch, Pa, Ju, Sh, Ya.
 * Shorter than the date strip's `weekdays.short`, so seven rows and a summary line fit.
 */
export const DAY_KEYS = [
  'owner.hours.day.mon',
  'owner.hours.day.tue',
  'owner.hours.day.wed',
  'owner.hours.day.thu',
  'owner.hours.day.fri',
  'owner.hours.day.sat',
  'owner.hours.day.sun',
] as const

export const dayName = (dayOfWeek: number) => i18n.t(DAY_KEYS[dayOfWeek] ?? DAY_KEYS[0])

/** How many whole hours a day is open; 0 when closed. */
export function lengthHours(day: DayHours): number {
  if (day.closed || day.open === undefined || day.close === undefined) return 0
  if (day.close === 0) return 24 - day.open
  if (day.close > day.open) return day.close - day.open
  return 24 - day.open + day.close
}

/** Whether a day's closing time falls on the next morning (midnight excluded). */
export function closesNextMorning(open: number, close: number): boolean {
  return close !== 0 && close <= open
}

/** `"02:00 (ertasi kuni)"` for a closing after midnight, `"00:00"` / `"23:00"` otherwise. */
export function closingLabel(open: number, close: number): string {
  const label = hourLabel(close)
  return closesNextMorning(open, close) ? i18n.t('owner.hours.nextDay', { time: label }) : label
}

/** The same window every day — what a stadium with one pair of hours means. */
export function sameEveryDay(open: number, close: number): DayHours[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: false,
    open,
    close,
  }))
}

/** Whether every day is open with the same hours — the "Har kuni bir xil" shape. */
export function isSameEveryDay(days: DayHours[]): boolean {
  const first = days[0]
  if (first === undefined || first.closed) return false
  return days.every((day) => !day.closed && day.open === first.open && day.close === first.close)
}

/** The pair to show when switching back to "Har kuni bir xil": the first open day's. */
export function everyDaySame(days: DayHours[]): { open: number; close: number } {
  const open = days.find((day) => !day.closed && day.open !== undefined)
  return { open: open?.open ?? 8, close: open?.close ?? 0 }
}

/**
 * The backend's rules, in the order it checks them. Answers a translation key, or null
 * when the week is fine.
 */
export function checkWeeklyHours(days: DayHours[]): RuleKey | null {
  if (days.length !== DAYS_IN_WEEK) return 'owner.rules.hoursWeek'
  if (days.every((day) => day.closed)) return 'owner.rules.hoursAllClosed'

  for (const day of days) {
    if (day.closed) continue
    if (day.open === undefined || day.close === undefined) return 'owner.rules.hoursWeek'
    if (!Number.isInteger(day.open) || !Number.isInteger(day.close)) return 'owner.rules.hoursWeek'
    if (day.open < 0 || day.open > 23 || day.close < 0 || day.close > 23) {
      return 'owner.rules.hoursWeek'
    }
    if (closesNextMorning(day.open, day.close) && day.close > LATEST_AFTER_MIDNIGHT_CLOSE) {
      return 'owner.rules.closeTooLate'
    }
    // Opening and closing at the same hour is 24 hours open, and its closing time is not
    // 06:00 or earlier — the backend refuses it with the same message.
    if (day.close === day.open) return 'owner.rules.closeTooLate'
  }

  for (const day of days) {
    const next = days[(day.dayOfWeek + 1) % DAYS_IN_WEEK]
    if (day.closed || next === undefined || next.closed) continue
    if (day.open === undefined || next.open === undefined) continue
    // Both measured in hours from the day's own midnight; the next day's opening is a day
    // later, so it gets 24 added to it.
    const closes = day.open + lengthHours(day)
    const opens = 24 + next.open
    if (opens - closes < MIN_GAP_HOURS) return 'owner.rules.hoursGap'
  }

  return null
}

/**
 * One day's hours in the summary line: `"08:00–02:00"` or `"yopiq"`. Plain, with no
 * "(ertasi kuni)" — the suffix belongs to the picker, where the owner is choosing.
 */
function dayHoursLabel(day: DayHours): string {
  if (day.closed || day.open === undefined || day.close === undefined) {
    return i18n.t('owner.hours.closedShort')
  }
  return `${hourLabel(day.open)}–${hourLabel(day.close)}`
}

/** What makes two days the same shape for the summary. */
const shapeOf = (day: DayHours) => (day.closed ? 'closed' : `${day.open}-${day.close}`)

/**
 * The summary line: `"Har kuni 08:00–00:00"`, or the runs of days that differ followed by
 * `"boshqa kunlar …"` when one shape covers the rest —
 * `"Ju–Sh 08:00–02:00, boshqa kunlar 08:00–00:00"`.
 */
export function hoursSummary(days: DayHours[]): string {
  if (days.length !== DAYS_IN_WEEK) return ''
  if (isSameEveryDay(days)) {
    const first = days[0]
    return first === undefined ? '' : i18n.t('owner.hours.everyDay', { hours: dayHoursLabel(first) })
  }

  // Consecutive days sharing a shape become one group: Monday first, no wrapping, so the
  // week always reads in order.
  const groups: { from: number; to: number; day: DayHours }[] = []
  for (const day of days) {
    const last = groups[groups.length - 1]
    if (last !== undefined && shapeOf(last.day) === shapeOf(day)) {
      last.to = day.dayOfWeek
    } else {
      groups.push({ from: day.dayOfWeek, to: day.dayOfWeek, day })
    }
  }

  // The shape covering the most days becomes "boshqa kunlar", provided more than one group
  // has it or it covers more days than any named group.
  const counts = new Map<string, number>()
  for (const day of days) counts.set(shapeOf(day), (counts.get(shapeOf(day)) ?? 0) + 1)
  let rest: string | undefined
  let most = 1
  for (const [shape, count] of counts) {
    if (count > most) {
      most = count
      rest = shape
    }
  }

  const named = groups
    .filter((group) => shapeOf(group.day) !== rest)
    .map((group) => {
      const name =
        group.from === group.to
          ? dayName(group.from)
          : `${dayName(group.from)}–${dayName(group.to)}`
      return `${name} ${dayHoursLabel(group.day)}`
    })

  if (rest === undefined) return named.join(', ')
  const restDay = days.find((day) => shapeOf(day) === rest)
  const restLabel = i18n.t('owner.hours.otherDays', {
    hours: restDay === undefined ? '' : dayHoursLabel(restDay),
  })
  return [...named, restLabel].join(', ')
}

const toTime = (hour: number) => `${String(hour).padStart(2, '0')}:00:00`

/** The whole week as the API takes it; a closed day carries no times. */
export function toApi(days: DayHours[]): { days: ApiDayHours[] } {
  return {
    days: days.map((day) =>
      day.closed || day.open === undefined || day.close === undefined
        ? { dayOfWeek: day.dayOfWeek, closed: true }
        : {
            dayOfWeek: day.dayOfWeek,
            closed: false,
            openTime: toTime(day.open),
            closeTime: toTime(day.close),
          },
    ),
  }
}

/** `"08:00:00"` → `8`; a time off the hour (an older stadium) rounds down. */
const toHour = (time: string | undefined) => (time === undefined ? 0 : Number(time.slice(0, 2)) || 0)

/**
 * The API's rows, Monday first. Falls back to one pair of hours as "the same every day"
 * when the schedule is missing — a stadium saved before the weekly schedule existed.
 */
export function fromApi(
  hours: ApiDayHours[] | undefined,
  openTime?: string,
  closeTime?: string,
): DayHours[] {
  if (hours === undefined || hours.length !== DAYS_IN_WEEK) {
    return sameEveryDay(toHour(openTime), toHour(closeTime))
  }
  return [...hours]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((day) =>
      day.closed
        ? { dayOfWeek: day.dayOfWeek, closed: true }
        : {
            dayOfWeek: day.dayOfWeek,
            closed: false,
            open: toHour(day.openTime),
            close: toHour(day.closeTime),
          },
    )
}
