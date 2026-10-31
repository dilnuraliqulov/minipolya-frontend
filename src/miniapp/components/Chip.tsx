import type { ButtonHTMLAttributes } from 'react'
import { haptic } from '../telegram'
import { cx } from './cx'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
}

/**
 * Format Chip / Format Chip Selected: a pill filter. The design draws it 40px
 * tall; it is 44px here to keep the touch target.
 */
export function Chip({ selected = false, className, onClick, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(event) => {
        haptic.selection()
        onClick?.(event)
      }}
      className={cx(
        'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-base font-medium',
        selected ? 'bg-accent text-on-accent' : 'bg-surface text-primary',
        className,
      )}
      {...rest}
    />
  )
}
