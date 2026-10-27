import type { DailyRevenue } from '../../api/types'
import type { BarDatum } from '../../components/BarChart'
import { formatDayMonth, formatDayMonthShort, lastDays } from '../../format'

export const CHART_DAYS = 30

/**
 * One bar per day for the last 30 days ending `today` (Tashkent). The
 * endpoint omits days without data; those are shown as 0. No values are
 * computed — only placed on the calendar.
 */
export function dailyBookingBars(daily: DailyRevenue[], today: string): BarDatum[] {
  const byDate = new Map(daily.map((day) => [day.date, day.bookingCount]))
  return lastDays(today, CHART_DAYS).map((date) => ({
    key: date,
    label: formatDayMonthShort(date),
    title: formatDayMonth(date),
    value: byDate.get(date) ?? 0,
  }))
}
