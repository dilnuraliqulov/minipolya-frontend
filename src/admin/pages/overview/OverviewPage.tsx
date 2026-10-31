import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Calendar,
  CircleCheck,
  LandPlot,
  ReceiptText,
  type LucideIcon,
  Users,
  Wallet,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { formatNumber, formatSomParts } from '../../../shared/format'
import { isAvailable } from '../../api/missing'
import { getDailyBookings, getOldestPendingStadium, KPI_COMPARISONS } from '../../api/stats'
import { BarChart } from '../../components/BarChart'
import { CARD, interactiveCard, rise } from '../../components/card'
import { cx } from '../../components/cx'
import { KpiCard } from '../../components/KpiCard'
import { useReducedMotion } from '../../components/motion'
import { Skeleton } from '../../components/Skeleton'
import { ErrorState } from '../../components/States'
import { formatAgo, tashkentToday } from '../../format'
import { adminKeys, useFailedRefunds, useStats } from '../../queries'
import { CHART_HEIGHT, dailyBookingBars } from './chartData'
import { comparison } from './comparison'

const card = CARD
const KPI_GRID = 'grid grid-cols-2 gap-4 xl:grid-cols-4'
const LAST_WEEK = 'oʻtgan haftaga nisbatan'

const TILE_TONES = {
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

function TodoTile({
  icon: Icon,
  tone,
  title,
  count,
  oldest,
  to,
  className,
  style,
}: {
  icon: LucideIcon
  tone: keyof typeof TILE_TONES
  title: string
  count: number
  /** UTC timestamp of the oldest waiting item; undefined while loading or unknown. */
  oldest: { createdAt?: string; loading: boolean }
  to: string
  className?: string
  style?: CSSProperties
}) {
  const reducedMotion = useReducedMotion()
  return (
    <Link
      to={to}
      className={cx(
        interactiveCard(reducedMotion),
        'flex min-w-0 flex-1 items-center gap-4 p-5',
        className,
      )}
      style={style}
    >
      <span
        className={cx(
          'flex size-12 shrink-0 items-center justify-center rounded-xl',
          TILE_TONES[tone],
        )}
      >
        <Icon size={22} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-base font-medium text-secondary">{title}</p>
        <p className="text-6xl font-semibold tracking-display text-primary">
          {formatNumber(count)}
        </p>
        {oldest.loading ? (
          <Skeleton className="mt-1 h-2.5 w-36" />
        ) : (
          oldest.createdAt && (
            <p className="text-sm text-secondary">eng eskisi {formatAgo(oldest.createdAt)}</p>
          )
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-base font-medium text-link">
        Koʻrib chiqish
        <ArrowRight
          size={16}
          aria-hidden
          className={cx(
            !reducedMotion && 'transition-transform duration-150 group-hover:translate-x-0.5',
          )}
        />
      </span>
    </Link>
  )
}

function OverviewSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-38" />
        <div className="flex gap-4">
          {[0, 1].map((i) => (
            <div key={i} className={`${card} flex flex-1 items-center gap-4 p-5`}>
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-30" />
                <Skeleton className="h-7.5 w-12" />
                <Skeleton className="h-2.5 w-38" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className={KPI_GRID}>
        {[0, 1, 2, 3].map((i) => (
          <KpiCard key={i} label="" loading />
        ))}
      </div>
      <div className={`${card} flex flex-col gap-4 p-5`}>
        <Skeleton className="h-3.5 w-50" />
        <Skeleton className="w-full" style={{ height: CHART_HEIGHT }} />
      </div>
    </div>
  )
}

export function OverviewPage() {
  const reducedMotion = useReducedMotion()
  const stats = useStats()
  const daily = useQuery({ queryKey: adminKeys.dailyBookings, queryFn: getDailyBookings })
  const refunds = useFailedRefunds()
  const failedRefunds = refunds?.count ?? 0
  const pendingStadiums = stats.data?.pendingStadiumApprovals ?? 0
  const oldestStadium = useQuery({
    queryKey: adminKeys.oldestStadium,
    queryFn: getOldestPendingStadium,
    enabled: pendingStadiums > 0,
  })

  if (stats.isError || daily.isError) {
    return (
      <div className={card}>
        <ErrorState
          onRetry={() => {
            void stats.refetch()
            void daily.refetch()
          }}
        />
      </div>
    )
  }
  if (!stats.data || !daily.data) return <OverviewSkeleton />

  const s = stats.data
  const bars = dailyBookingBars(daily.data, tashkentToday())
  const total = bars.reduce((sum, bar) => sum + bar.value, 0)
  const money = formatSomParts(s.monthRevenue)
  const compare = isAvailable(KPI_COMPARISONS)

  // Entrance order: the to-do tiles first, then the KPI cards.
  let order = 0
  const enter = () => rise(order++, reducedMotion)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-labelledby="todo-title">
        <h2 id="todo-title" className="text-lg font-semibold text-primary">
          Kutilayotgan ishlar
        </h2>
        {failedRefunds === 0 && pendingStadiums === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3.5 py-2.5 text-base font-medium text-success">
            <CircleCheck size={16} aria-hidden />
            Hammasi bajarilgan, kutilayotgan ish yoʻq
          </p>
        ) : (
          <div className="flex gap-4">
            {failedRefunds > 0 && (
              <TodoTile
                icon={ReceiptText}
                tone="danger"
                title="Muvaffaqiyatsiz qaytarishlar"
                count={failedRefunds}
                oldest={{ createdAt: refunds?.oldestAt, loading: false }}
                to="/tolovlar?tab=qaytarishlar"
                {...enter()}
              />
            )}
            {pendingStadiums > 0 && (
              <TodoTile
                icon={LandPlot}
                tone="warning"
                title="Yangi maydonlar"
                count={pendingStadiums}
                oldest={{
                  createdAt: oldestStadium.data?.createdAt,
                  loading: oldestStadium.isPending,
                }}
                to="/maydonlar"
                {...enter()}
              />
            )}
          </div>
        )}
      </section>

      <section className={KPI_GRID} aria-label="Asosiy koʻrsatkichlar">
        <KpiCard
          icon={Calendar}
          label="Bugungi bronlar"
          value={formatNumber(s.todayBookings)}
          delta={
            compare ? comparison(s.todayBookings, s.todayBookingsLastWeek, LAST_WEEK) : undefined
          }
          to="/bronlar"
          {...enter()}
        />
        <KpiCard
          icon={Wallet}
          label="Shu oy ilova orqali toʻlovlar"
          value={money.amount}
          unit={money.unit}
          delta={
            compare
              ? comparison(s.monthRevenue, s.previousMonthRevenueToDate, 'oʻtgan oyga nisbatan')
              : undefined
          }
          to="/tolovlar"
          {...enter()}
        />
        <KpiCard
          icon={Users}
          label="Yangi foydalanuvchilar"
          sublabel="Oxirgi 7 kun"
          value={formatNumber(s.newUsersLast7Days)}
          delta={
            compare
              ? comparison(s.newUsersLast7Days, s.newUsersPrevious7Days, 'oldingi 7 kunga nisbatan')
              : undefined
          }
          to="/foydalanuvchilar"
          {...enter()}
        />
        <KpiCard
          icon={LandPlot}
          label="Faol maydonlar"
          value={formatNumber(s.approvedStadiums)}
          delta={
            compare
              ? comparison(s.approvedStadiums, s.approvedStadiumsWeekAgo, LAST_WEEK)
              : undefined
          }
          to="/maydonlar"
          {...enter()}
        />
      </section>

      <section className={`${card} flex flex-col`} aria-labelledby="chart-title">
        <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
          <h2 id="chart-title" className="flex-1 text-lg font-semibold text-primary">
            Bronlar soni, oxirgi 30 kun
          </h2>
          <span className="text-sm text-secondary">jami {formatNumber(total)}</span>
        </div>
        <div className="px-5 pt-2 pb-4">
          <BarChart
            data={bars}
            height={CHART_HEIGHT}
            highlight={bars.length - 1}
            label={`Bronlar soni, oxirgi 30 kun: jami ${formatNumber(total)}`}
            formatValue={(value) => `${formatNumber(value)} ta bron`}
          />
        </div>
      </section>
    </div>
  )
}
