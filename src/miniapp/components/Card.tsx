import type { HTMLAttributes } from 'react'
import { cx } from './cx'

/** A card: background, 1px border, radius 12 — the design's list and content container. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('overflow-hidden rounded-xl border border-border bg-background', className)}
      {...rest}
    />
  )
}
