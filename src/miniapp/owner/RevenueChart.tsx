import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getOwnerRevenue, revenueKey } from '../api/owner'
import { Card, cx, ErrorState, SkeletonBlock } from '../components'
import { formatLongDate, formatMoney } from '../format'

const WINDOWS = [7, 30] as const
type Window = (typeof WINDOWS)[number]

/** `"2026-11-05"` read as a Tashkent calendar day (noon UTC stays on that date). */
const day = (date: string) => `${date}T12:00:00Z`

/**
 * Hisobot's daily revenue for the last 7 or 30 days (R43: every day of the
 * window, zero days included). One series, so no legend; tap or hover a bar
 * for its day; the numbers are also in a screen-reader table.
 */
export function RevenueChart({ stadiumId }: { stadiumId: string }) {
  const { t } = useTranslation()
  const [days, setDays] = useState<Window>(7)
  const [active, setActive] = useState<number | null>(null)
  const revenue = useQuery({
    queryKey: revenueKey(stadiumId, days),
    queryFn: () => getOwnerRevenue(stadiumId, days),
  })
  const points = revenue.data?.dailyRevenue ?? []
  const max = Math.max(0, ...points.map((p) => p.revenue))
  const total = points.reduce((sum, p) => sum + p.revenue, 0)
  const shown = active !== null ? points[active] : undefined

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-primary">{t('owner.report.chartTitle')}</h3>
        <div
          role="tablist"
          aria-label={t('owner.report.chartWindow')}
          className="flex rounded-lg bg-surface p-0.5"
        >
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={days === w}
              onClick={() => {
                setDays(w)
                setActive(null)
              }}
              className={cx(
                'flex min-h-11 items-center rounded-md px-3 text-sm font-medium',
                days === w ? 'bg-background text-primary shadow-sm' : 'text-secondary',
              )}
            >
              {t('owner.report.days', { count: w })}
            </button>
          ))}
        </div>
      </div>
      {revenue.isPending ? (
        <SkeletonBlock />
      ) : revenue.isError ? (
        <ErrorState onRetry={() => void revenue.refetch()} />
      ) : (
        <>
          <p className="min-h-10 text-sm text-secondary" aria-live="polite">
            {shown ? (
              <>
                {formatLongDate(day(shown.date))}
                <br />
                <span className="text-base font-semibold text-primary">
                  {formatMoney(shown.revenue)}
                </span>
                {' · '}
                {t('owner.report.bookingCount', { count: shown.bookingCount })}
              </>
            ) : (
              <>
                {t('owner.report.chartTotal')}
                <br />
                <span className="text-base font-semibold text-primary">{formatMoney(total)}</span>
              </>
            )}
          </p>
          <div
            className="flex h-32 items-end gap-0.5 border-b border-border"
            aria-hidden
            onMouseLeave={() => setActive(null)}
          >
            {points.map((point, index) => (
              <div
                key={point.date}
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(active === index ? null : index)}
                className="flex h-full min-w-0 flex-1 cursor-pointer items-end"
              >
                <div
                  className={cx(
                    'w-full rounded-t-xs',
                    point.revenue > 0 ? 'bg-accent' : 'bg-border',
                    active !== null && active !== index && 'opacity-40',
                  )}
                  style={{
                    height:
                      point.revenue > 0 && max > 0
                        ? `${Math.max(4, (point.revenue / max) * 100)}%`
                        : '2px',
                  }}
                />
              </div>
            ))}
          </div>
          {points.length > 0 && (
            <div className="flex justify-between text-xs text-secondary" aria-hidden>
              <span>{formatLongDate(day(points[0]!.date))}</span>
              <span>{formatLongDate(day(points[points.length - 1]!.date))}</span>
            </div>
          )}
          <table className="sr-only">
            <caption>{t('owner.report.chartTitle')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('owner.report.date')}</th>
                <th scope="col">{t('owner.report.revenue')}</th>
                <th scope="col">{t('owner.report.bookings')}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <td>{formatLongDate(day(point.date))}</td>
                  <td>{formatMoney(point.revenue)}</td>
                  <td>{point.bookingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  )
}
