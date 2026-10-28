import { Hourglass } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import { EmptyState } from './States'

export const SOON = 'Tez orada'

/**
 * Wraps a disabled control so its reason still shows: a disabled button gets
 * no hover or focus of its own, so the wrapper carries the tooltip and can be
 * reached with Tab, where the reason is read out.
 */
export function DisabledHint({
  hint,
  children,
  className,
}: {
  hint: string
  children: ReactNode
  className?: string
}) {
  return (
    <span
      title={hint}
      tabIndex={0}
      className={cx(
        'inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-accent',
        className,
      )}
    >
      {children}
      <span className="sr-only">{hint}</span>
    </span>
  )
}

/** A section whose endpoint the backend has not shipped, in a production build. */
export function SoonSection({ title, className }: { title?: string; className?: string }) {
  return (
    <section
      aria-label={title}
      className={cx('rounded-xl border border-border bg-background', className)}
    >
      {title && <h2 className="px-5 pt-3.5 text-lg font-semibold text-primary">{title}</h2>}
      <EmptyState
        icon={Hourglass}
        title={SOON}
        description="Bu maʼlumot keyingi yangilanishda qoʻshiladi"
        className="py-8"
      />
    </section>
  )
}
