import { ChevronRight, Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { CARD, interactiveCard } from './card'
import { cx } from './cx'
import { useReducedMotion } from './motion'
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

/**
 * Each card spans rows of the grid it sits in (icon, label, value, comparison),
 * so those rows line up across a row of cards however the labels wrap.
 * Outside a grid it is a plain stack.
 */
const SUBGRID = 'grid min-w-0 grid-rows-subgrid content-start gap-y-3 p-5'

export interface KpiCardProps {
  label: string
  /** Small secondary line under the label, e.g. the period. */
  sublabel?: string
  icon?: LucideIcon
  value?: string
  /** Shown smaller and in the secondary colour after the value, e.g. "so'm". */
  unit?: string
  delta?: KpiDelta
  /** The page the card opens. Without it the card is not clickable and has no hover. */
  to?: string
  loading?: boolean
  className?: string
  style?: CSSProperties
}

export function KpiCard({
  label,
  sublabel,
  icon: Icon,
  value,
  unit,
  delta,
  to,
  loading = false,
  className,
  style,
}: KpiCardProps) {
  const reducedMotion = useReducedMotion()

  if (loading) {
    return (
      <div aria-busy className={cx(CARD, SUBGRID, 'row-span-4', className)} style={style}>
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-3 w-30" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-2.5 w-40" />
      </div>
    )
  }

  const trend = delta ? TRENDS[delta.trend] : null
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <Icon size={18} aria-hidden className="text-link" />
          </span>
        )}
        {to && (
          <ChevronRight
            size={18}
            aria-hidden
            data-testid="kpi-chevron"
            className={cx(
              'shrink-0 text-link opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              !reducedMotion && 'transition-opacity duration-150',
            )}
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium break-words text-secondary">{label}</p>
        {sublabel && <p className="text-xs text-secondary">{sublabel}</p>}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1.5 font-semibold tracking-display text-primary">
        <span className="text-5xl">{value}</span>
        {unit && <span className="text-lg font-medium tracking-normal text-secondary">{unit}</span>}
      </p>
      {delta && trend && (
        // Inline flow, so a sample tag sits at the end of the text, wrapping only when it must.
        <p className={cx('text-xs leading-5 font-medium', trend.className)}>
          <trend.icon size={14} aria-hidden className="mr-1 inline align-[-2px]" />
          <span>{delta.text}</span>
          {delta.sampleRequest && (
            <>
              {' '}
              <SampleTag request={delta.sampleRequest} />
            </>
          )}
        </p>
      )}
    </>
  )

  const layout = cx(SUBGRID, delta ? 'row-span-4' : 'row-span-3')
  return to ? (
    <Link to={to} className={cx(interactiveCard(reducedMotion), layout, className)} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cx(CARD, layout, className)} style={style}>
      {body}
    </div>
  )
}
