import { ChartColumn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAvailable } from '../api/missing'
import { OWNER_UNPAID, type OwnerStadium } from '../api/owner'
import { Card, cx, EmptyState, ErrorState, SkeletonList } from '../components'
import { formatMoney } from '../format'
import { ratingLabel } from '../stadiums/labels'
import { OwnerTabScreen } from './OwnerTabScreen'
import { useOwnerStats } from './queries'
import { WithOwnerStadium } from './StadiumPicker'

const PERIODS = ['today', 'week', 'month'] as const
type Period = (typeof PERIODS)[number]

/** Hisobot: the stadium's totals per period, straight from `…/stats`. */
export function OwnerReportPage() {
  const { t } = useTranslation()
  return (
    <OwnerTabScreen title={t('owner.tabs.report')}>
      <WithOwnerStadium>
        {(stadium) => <Report key={stadium.id} stadium={stadium} />}
      </WithOwnerStadium>
    </OwnerTabScreen>
  )
}

function Report({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('today')
  const stats = useOwnerStats(stadium.id)
  if (stats.isPending) return <SkeletonList count={3} />
  if (stats.isError) return <ErrorState onRetry={() => void stats.refetch()} />
  const s = stats.data
  if (s.totalBookings === 0) {
    return <EmptyState icon={ChartColumn} title={t('bookings.emptyTitle')} />
  }
  const bookings = { today: s.todayBookings, week: s.weekBookings, month: s.monthBookings }[period]
  const revenue = { today: s.todayRevenue, week: s.weekRevenue, month: s.monthRevenue }[period]
  return (
    <>
      <div
        role="tablist"
        aria-label={t('owner.report.periods')}
        className="flex rounded-xl bg-surface p-1"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={cx(
              'flex min-h-11 flex-1 items-center justify-center rounded-lg text-base font-medium',
              period === p ? 'bg-background text-primary shadow-sm' : 'text-secondary',
            )}
          >
            {t(`owner.report.${p}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('owner.report.bookings')} value={String(bookings)} />
        <Stat label={t('owner.report.revenue')} value={formatMoney(revenue)} />
        <Stat
          label={t('owner.report.rating')}
          value={s.reviewCount > 0 ? `★ ${ratingLabel(s.averageRating)} (${s.reviewCount})` : '—'}
        />
        <Stat label={t('owner.report.occupancy')} value={`${Math.round(s.occupancyPercent)}%`} />
      </div>
      <Card className="flex flex-col gap-1 p-4">
        <h3 className="text-lg font-semibold text-primary">{t('owner.report.unpaid')}</h3>
        {!isAvailable(OWNER_UNPAID) && (
          <p className="text-sm text-secondary">{t('owner.soonDetail')}</p>
        )}
      </Card>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-sm text-secondary">{label}</span>
      <span className="text-xl font-bold text-primary">{value}</span>
    </Card>
  )
}
