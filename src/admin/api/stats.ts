import { api, type Page } from '../../shared/api'
import type { AdminStadium, OwnerApplication, PlatformRevenue, PlatformStats } from './types'

export function getPlatformStats(): Promise<PlatformStats> {
  return api.get<PlatformStats>('/api/admin/stats')
}

export function getPlatformRevenue(): Promise<PlatformRevenue> {
  return api.get<PlatformRevenue>('/api/admin/stats/revenue')
}

/** The pending list is ordered oldest first, so the first item is the oldest. */
export async function getOldestPendingApplication(): Promise<OwnerApplication | null> {
  const page = await api.get<Page<OwnerApplication>>('/api/admin/owner-applications/pending', {
    query: { page: 0, size: 1 },
  })
  return page.content[0] ?? null
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
