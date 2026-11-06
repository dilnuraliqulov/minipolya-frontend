import { CircleAlert, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

interface NoticeProps {
  /** `danger`: something was refused. `warning`: try again later (nothing happened). */
  tone?: 'danger' | 'warning'
  children: ReactNode
  className?: string
}

/** An inline alert under a form or a payment: icon + text on a soft status fill. */
export function Notice({ tone = 'danger', children, className }: NoticeProps) {
  const Icon = tone === 'warning' ? Clock : CircleAlert
  return (
    <div
      role="alert"
      data-tone={tone}
      className={cx(
        'flex gap-3 rounded-xl border p-3 text-sm',
        tone === 'warning'
          ? 'border-warning-text bg-warning-soft text-warning-text'
          : 'border-danger-text bg-danger-soft text-danger-text',
        className,
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  )
}
