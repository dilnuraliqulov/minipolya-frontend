/**
 * DEVELOPMENT ONLY — the sample adapter for endpoints the backend has not
 * shipped (`MISSING_ENDPOINTS` in ../missing.ts). It is imported dynamically
 * behind `import.meta.env.DEV`, so none of it reaches a production build.
 *
 * It keeps an in-memory copy of the sample data, so actions (approve, block,
 * retry…) change what the next request returns until the page is reloaded.
 */
import type { RefundAlerts } from '../stats'

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

const failedRefunds = [{ createdAt: hoursAgo(3) }]

export function refundAlerts(): RefundAlerts {
  const oldest = failedRefunds.map((r) => r.createdAt).sort()[0]
  return { failedRefunds: failedRefunds.length, oldestFailedRefundAt: oldest }
}
