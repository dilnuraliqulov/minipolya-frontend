import { ChevronDown, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

const field =
  'flex h-9 items-center gap-2 rounded-md border bg-background text-base focus-within:border-accent'

/** A row of filters with an optional "Tozalash" (clear) link on the right. */
export function FilterBar({ children, onClear }: { children: ReactNode; onClear?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {children}
      <span className="flex-1" />
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xs text-base font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Tozalash
        </button>
      )}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Accessible name; defaults to the placeholder. */
  label?: string
}) {
  return (
    <label className={cx(field, 'w-70 border-border px-3')}>
      <Search size={16} aria-hidden className="shrink-0 text-secondary" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-secondary"
      />
    </label>
  )
}

export interface FilterOption {
  value: string
  label: string
}

/**
 * A native select styled as the design's dropdown ("Tuman: Barchasi"). The
 * first option is the "all" choice; a different value highlights the field.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}) {
  const selected = value !== (options[0]?.value ?? '')
  return (
    <label
      className={cx(
        field,
        'relative pr-2.5 pl-3',
        selected ? 'border-accent bg-accent-soft text-accent' : 'border-border text-primary',
      )}
    >
      <span className="whitespace-nowrap">
        {label}: {options.find((option) => option.value === value)?.label}
      </span>
      <ChevronDown size={16} aria-hidden className={selected ? 'text-accent' : 'text-secondary'} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
