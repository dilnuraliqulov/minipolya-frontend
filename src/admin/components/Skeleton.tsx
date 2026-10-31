import type { CSSProperties } from 'react'
import { cx } from './cx'

/**
 * A grey placeholder block. Size it with width/height classes; a `rounded-*`
 * class replaces the default 4 px radius (two radius utilities would clash).
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  const ownRadius = /(^|\s)rounded-/.test(className ?? '')
  return (
    <span
      aria-hidden
      data-testid="skeleton"
      style={style}
      className={cx('block animate-pulse bg-skeleton', !ownRadius && 'rounded-xs', className)}
    />
  )
}
