import type { KpiDelta } from '../../components/KpiCard'

/**
 * A KPI's comparison line from the backend's previous-period figure, e.g.
 * "+12% oʻtgan haftaga nisbatan". The backend sends both figures and leaves
 * the percentage to the panel. Without a previous figure there is nothing to
 * compare a percentage with, so no line.
 */
export function comparison(
  current: number,
  previous: number,
  period: string,
): KpiDelta | undefined {
  if (current === previous) return { trend: 'flat', text: 'Oʻzgarish yoʻq' }
  if (previous === 0) return undefined
  const percent = Math.round((Math.abs(current - previous) / previous) * 100)
  return current > previous
    ? { trend: 'up', text: `+${percent}% ${period}` }
    : { trend: 'down', text: `−${percent}% ${period}` }
}
