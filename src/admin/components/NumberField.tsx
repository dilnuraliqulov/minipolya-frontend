import { useId } from 'react'
import { formatNumber } from '../../shared/format'
import { cx } from './cx'

/** Keeps the digits only: "25 000 so'm" → "25000". */
function digitsOnly(text: string): string {
  return text.replace(/\D/g, '')
}

/**
 * A whole-number input with a unit after it ("%", "so'm"). Shows the number
 * grouped ("25 000") while it is typed; `value` and `onChange` are digits only.
 */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  helper,
  error,
  maxLength = 12,
}: {
  label: string
  value: string
  onChange: (digits: string) => void
  suffix: string
  helper?: string
  error?: string
  maxLength?: number
}) {
  const id = useId()
  const described = `${id}-help`
  const shown = value === '' ? '' : formatNumber(Number(value))
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-medium text-primary">
        {label}
      </label>
      <div
        className={cx(
          'flex h-10 w-55 items-center gap-2 rounded-md border bg-background px-3',
          error ? 'border-danger' : 'border-border focus-within:border-accent',
        )}
      >
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={shown}
          onChange={(event) => onChange(digitsOnly(event.target.value).slice(0, maxLength))}
          aria-invalid={error ? true : undefined}
          aria-describedby={helper || error ? described : undefined}
          className="min-w-0 flex-1 bg-transparent text-md font-medium text-primary outline-none"
        />
        <span className="text-base text-secondary">{suffix}</span>
      </div>
      {(error || helper) && (
        <p id={described} className={cx('text-sm', error ? 'text-danger' : 'text-secondary')}>
          {error ?? helper}
        </p>
      )}
    </div>
  )
}
