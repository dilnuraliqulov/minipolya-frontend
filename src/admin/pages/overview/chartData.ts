import type { DailyBookingCount } from '../../api/types'
import type { BarDatum } from '../../components/BarChart'
import { formatDayMonth, formatDayMonthShort, lastDays } from '../../format'

export const CHART_DAYS = 30
/** Plot height in px — low enough not to dominate the page when there is little data. */
export const CHART_HEIGHT = 200

/**
 * One bar per day for the last 30 days ending `today` (Tashkent). The
 * endpoint sends every day; a day it does not send is shown as 0. No values
 * are computed — only placed on the calendar.
 */
export function dailyBookingBars(daily: DailyBookingCount[], today: string): BarDatum[] {
  const byDate = new Map(daily.map((day) => [day.date, day.bookingCount]))
  return lastDays(today, CHART_DAYS).map((date) => ({
    key: date,
    label: formatDayMonthShort(date),
    title: formatDayMonth(date),
    value: byDate.get(date) ?? 0,
  }))
}
