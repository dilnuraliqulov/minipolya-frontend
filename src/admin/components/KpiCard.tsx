import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cx } from './cx'
import { SampleTag } from './SampleTag'
import { Skeleton } from './Skeleton'

export interface KpiDelta {
  trend: 'up' | 'down' | 'flat'
  text: string
  /** Set when the delta is sample data; names the backend request. */
  sampleRequest?: string
}

const TRENDS = {
  up: { icon: TrendingUp, className: 'text-success' },
  down: { icon: TrendingDown, className: 'text-danger' },
  flat: { icon: Minus, className: 'text-secondary' },
}

export interface KpiCardProps {
  label: string
  value?: string
  delta?: KpiDelta
  loading?: boolean
}

export function KpiCard({ label, value, delta, loading = false }: KpiCardProps) {
  if (loading) {
    return (
      <div
        aria-busy
        className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-5"
      >
        <Skeleton className="h-3 w-30" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-2.5 w-40" />
      </div>
    )
  }

  const trend = delta ? TRENDS[delta.trend] : null
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-xl border border-border bg-background p-5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-secondary">{label}</p>
        {/* Up here so the comparison line keeps its full width. */}
        {delta?.sampleRequest && <SampleTag request={delta.sampleRequest} />}
      </div>
      <p className="truncate text-5xl font-semibold tracking-display text-primary">{value}</p>
      {delta && trend && (
        <p className={cx('flex items-center gap-1 text-xs font-medium', trend.className)}>
          <trend.icon size={14} aria-hidden className="shrink-0" />
          <span className="truncate" title={delta.text}>
            {delta.text}
          </span>
        </p>
      )}
    </div>
  )
}
