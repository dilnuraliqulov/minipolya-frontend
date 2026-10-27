import type { ReactNode } from 'react'
import { cx } from './cx'

/** success: approved/active · warning: waiting · danger: rejected/blocked/cancelled · neutral: finished/expired */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-secondary',
}

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.25 py-0.75 text-xs font-medium whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}
