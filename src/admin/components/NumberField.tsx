import { useId } from 'react'
import { formatNumber } from '../../shared/format'
import { cx } from './cx'

/** Keeps the digits only: "25 000 so'm" → "25000". */
function digitsOnly(text: string): string {
  return text.replace(/\D/g, '')
}

/**
 * Keeps a decimal number as typed, with a dot: "1,5 %" → "1.5". At most
 * `decimals` digits after the separator; a comma or a dot both work.
 */
function decimalOnly(text: string, decimals: number): string {
  const [whole = '', ...rest] = text
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')
    .split('.')
  return rest.length ? `${whole}.${rest.join('').slice(0, decimals)}` : whole
}

/** "1.5" → "1,5", the whole part grouped. */
function showDecimal(value: string): string {
  const [whole = '', fraction] = value.split('.')
  const grouped = whole === '' ? '' : formatNumber(Number(whole))
  return fraction === undefined ? grouped : `${grouped},${fraction}`
}

/**
 * A number input with a unit after it ("%", "so'm"). Shows the number grouped
 * ("25 000") while it is typed; `value` and `onChange` are digits only — or,
 * with `decimals`, digits with one dot ("1.5", shown "1,5").
 */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  helper,
  error,
  maxLength = 12,
  decimals = 0,
}: {
  label: string
  value: string
  onChange: (digits: string) => void
  suffix: string
  helper?: string
  error?: string
  maxLength?: number
  /** Digits allowed after the decimal separator; 0 for a whole number. */
  decimals?: number
}) {
  const id = useId()
  const described = `${id}-help`
  const shown = decimals ? showDecimal(value) : value === '' ? '' : formatNumber(Number(value))
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
          inputMode={decimals ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={shown}
          onChange={(event) =>
            onChange(
              decimals
                ? decimalOnly(event.target.value, decimals).slice(0, maxLength)
                : digitsOnly(event.target.value).slice(0, maxLength),
            )
          }
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
