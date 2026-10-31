import { useQuery } from '@tanstack/react-query'
import { isAvailable } from './api/missing'
import { getPlatformStats, REFUND_ALERTS } from './api/stats'

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  dailyBookings: ['admin', 'stats', 'bookings-daily'] as const,
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
 * Failed refunds waiting for an admin, from the stats: the sidebar badge and
 * the overview to-do. `undefined` while loading, or while the fields are in
 * the missing list (then nothing is shown).
 */
export function useFailedRefunds(): { count: number; oldestAt?: string } | undefined {
  const { data } = useStats()
  if (!data || !isAvailable(REFUND_ALERTS)) return undefined
  return { count: data.failedRefunds, oldestAt: data.oldestFailedRefundAt }
}
