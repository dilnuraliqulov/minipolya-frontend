import type { ReactNode } from 'react'
import { cx } from './cx'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent'

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-secondary',
  accent: 'bg-accent text-on-accent',
}

/** Badge / Success · Warning · Danger · Neutral · Accent (11 semibold, radius 6). */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-sm px-2 py-1 text-2xs font-semibold',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
