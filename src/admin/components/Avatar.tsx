import { cx } from './cx'
import { initials } from './initials'

const SIZES = {
  sm: 'size-6 text-2xs',
  md: 'size-8 text-xs',
  lg: 'size-9 text-sm',
}

export function Avatar({ name, size = 'md' }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-surface font-semibold text-primary',
        SIZES[size],
      )}
    >
      {initials(name)}
    </span>
  )
}
