import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  hint?: string
  /** Replaces the hint and turns the border red. */
  error?: string
  trailing?: ReactNode
  className?: string
}

/** The design's Input: label 13 medium, 48px field (radius 12), hint or error 12. */
export function Input({ label, hint, error, trailing, className, id, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const noteId = `${inputId}-note`
  const note = error ?? hint
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-secondary">
        {label}
      </label>
      <div
        className={cx(
          'flex h-12 items-center gap-2 rounded-xl border bg-background px-4',
          'focus-within:border-accent',
          error ? 'border-danger' : 'border-border',
        )}
      >
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-lg text-primary outline-none placeholder:text-secondary disabled:opacity-60"
          {...rest}
        />
        {trailing}
      </div>
      {note && (
        <p id={noteId} className={cx('text-xs', error ? 'text-danger' : 'text-secondary')}>
          {note}
        </p>
      )}
    </div>
  )
}
