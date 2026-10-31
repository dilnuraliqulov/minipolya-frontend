import { api, type Page } from '../../shared/api'
import type { AdminStadium, DailyBookingCount, PlatformStats } from './types'

export function getPlatformStats(): Promise<PlatformStats> {
  return api.get<PlatformStats>('/api/admin/stats')
}

export function getDailyBookings(): Promise<DailyBookingCount[]> {
  return api.get<DailyBookingCount[]>('/api/admin/stats/bookings-daily')
}

/** The previous-period fields on the stats — request R3. */
export const KPI_COMPARISONS =
  'GET /api/admin/stats → todayBookingsLastWeek, previousMonthRevenueToDate, newUsersPrevious7Days, approvedStadiumsWeekAgo'

/** `failedRefunds` / `oldestFailedRefundAt` on the stats — request R8 (the refunds are R17). */
export const REFUND_ALERTS = 'GET /api/admin/stats → failedRefunds, oldestFailedRefundAt'

/**
 * The stadium list is ordered newest first, so the oldest pending stadium is
 * the last element: one request for the count, one for that item.
 */
export async function getOldestPendingStadium(): Promise<AdminStadium | null> {
  const query = { status: 'pending', size: 1 }
  const first = await api.get<Page<AdminStadium>>('/api/admin/stadiums', {
    query: { ...query, page: 0 },
  })
  if (first.totalElements <= 1) return first.content[0] ?? null
  const last = await api.get<Page<AdminStadium>>('/api/admin/stadiums', {
    query: { ...query, page: first.totalElements - 1 },
  })
  return last.content[0] ?? null
}
