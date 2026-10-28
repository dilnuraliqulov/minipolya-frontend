import type { KpiDelta } from '../../components/KpiCard'

/**
 * Sample data is shown in development only. A production build shows nothing
 * in its place rather than made-up numbers.
 */
export const SHOW_SAMPLE_DATA: boolean = import.meta.env.DEV

/**
 * SAMPLE DATA — values the design shows but the backend does not provide.
 *
 * Everything here is shown with a visible "Namuna" tag and has an entry in
 * docs/backend-requests.md. Replace each one with the real field when the
 * backend ships it, then delete it from this file.
 */

/**
 * KPI comparisons with the previous period ("+12% oʻtgan haftaga nisbatan").
 * The stats endpoint has no previous-period figures — request R3.
 */
export const SAMPLE_KPI_DELTAS = {
  todayBookings: { trend: 'up', text: '+12% oʻtgan haftaga nisbatan', sampleRequest: 'R3' },
  monthRevenue: { trend: 'up', text: '+8% oʻtgan oyga nisbatan', sampleRequest: 'R3' },
  newUsers: { trend: 'down', text: '−4% oʻtgan haftaga nisbatan', sampleRequest: 'R3' },
  approvedStadiums: { trend: 'flat', text: 'Oʻzgarish yoʻq', sampleRequest: 'R3' },
} satisfies Record<string, KpiDelta>
