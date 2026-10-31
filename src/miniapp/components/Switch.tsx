import { haptic } from '../telegram'
import { cx } from './cx'

interface SwitchProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** The design's Switch (48×28, knob 24). The 44px touch target wraps it. */
export function Switch({ label, checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic.light()
        onChange(!checked)
      }}
      className="flex size-11 shrink-0 items-center justify-center disabled:opacity-50"
    >
      <span
        className={cx(
          'flex h-7 w-12 items-center rounded-xl p-1 transition-colors',
          checked ? 'bg-accent' : 'bg-border',
        )}
      >
        <span
          className={cx(
            'size-5 rounded-full bg-on-accent shadow-sm transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
