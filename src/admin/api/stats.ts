import { api, type Page } from '../../shared/api'
import { viaSample } from './missing'
import type { AdminStadium, PlatformRevenue, PlatformStats } from './types'

export function getPlatformStats(): Promise<PlatformStats> {
  return api.get<PlatformStats>('/api/admin/stats')
}

export function getPlatformRevenue(): Promise<PlatformRevenue> {
  return api.get<PlatformRevenue>('/api/admin/stats/revenue')
}

/** Failed refunds waiting for an admin: the sidebar badge and the overview to-do. */
export interface RefundAlerts {
  failedRefunds: number
  /** UTC; absent when there are none. */
  oldestFailedRefundAt?: string
}

/** Two new fields on `GET /api/admin/stats` — request R8. */
export const REFUND_ALERTS = 'GET /api/admin/stats → failedRefunds, oldestFailedRefundAt'

export function getRefundAlerts(): Promise<RefundAlerts> {
  return viaSample(
    REFUND_ALERTS,
    async () => {
      const stats = await getPlatformStats()
      return {
        failedRefunds: stats.failedRefunds ?? 0,
        oldestFailedRefundAt: stats.oldestFailedRefundAt,
      }
    },
    (sample) => sample.refundAlerts(),
  )
}

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
