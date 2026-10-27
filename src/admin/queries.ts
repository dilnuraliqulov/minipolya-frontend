import { useQuery } from '@tanstack/react-query'
import { getPlatformStats } from './api/stats'

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  revenue: ['admin', 'stats', 'revenue'] as const,
  oldestApplication: ['admin', 'owner-applications', 'oldest-pending'] as const,
  oldestStadium: ['admin', 'stadiums', 'oldest-pending'] as const,
}

/** Platform stats — the overview and the sidebar badges share this one request. */
export function useStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: getPlatformStats,
    // Keeps the sidebar's waiting counts current while the panel is open.
    refetchInterval: 60_000,
  })
}
