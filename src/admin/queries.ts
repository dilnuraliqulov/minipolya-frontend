import { useQuery } from '@tanstack/react-query'
import { availability } from './api/missing'
import { getPlatformStats, getRefundAlerts, REFUND_ALERTS } from './api/stats'

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  refundAlerts: ['admin', 'stats', 'refund-alerts'] as const,
  revenue: ['admin', 'stats', 'revenue'] as const,
  oldestStadium: ['admin', 'stadiums', 'oldest-pending'] as const,
}

/** Keeps the sidebar's waiting counts current while the panel is open. */
const BADGE_REFRESH_MS = 60_000

/** Platform stats — the overview and the sidebar badges share this one request. */
export function useStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: getPlatformStats,
    refetchInterval: BADGE_REFRESH_MS,
  })
}

/**
 * Failed refunds (request R8). In a production build, while the fields are
 * missing, nothing is fetched and `sample` tells the caller to show nothing.
 */
export function useRefundAlerts() {
  const mode = availability(REFUND_ALERTS)
  const query = useQuery({
    queryKey: adminKeys.refundAlerts,
    queryFn: getRefundAlerts,
    enabled: mode !== 'soon',
    refetchInterval: BADGE_REFRESH_MS,
  })
  return { ...query, mode }
}
