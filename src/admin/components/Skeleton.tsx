import { cx } from './cx'

/** A grey placeholder block. Size it with width/height classes. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-testid="skeleton"
      className={cx('block animate-pulse rounded-xs bg-skeleton', className)}
    />
  )
}
