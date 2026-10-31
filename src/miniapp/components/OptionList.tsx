import { CircleCheck } from 'lucide-react'
import { haptic } from '../telegram'

interface Option<T extends string> {
  value: T
  label: string
}

/** The design's sheet options: 52px rows, a check on the chosen one, an empty circle on the rest. */
export function OptionList<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: ReadonlyArray<Option<T>>
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => {
              haptic.selection()
              onChange(option.value)
            }}
            className="flex min-h-13 items-center gap-3 text-left disabled:opacity-60"
          >
            <span className="flex-1 text-md font-medium text-primary">{option.label}</span>
            {checked ? (
              <CircleCheck size={22} className="text-accent" aria-hidden />
            ) : (
              <span className="size-5.5 rounded-full border border-border" aria-hidden />
            )}
          </button>
        )
      })}
    </div>
  )
}
