import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cx } from './cx'
import { FilterSheet } from './FilterSheet'
import { CARD_ROWS, useMediaQuery } from './useMediaQuery'

const field =
  'flex h-9 items-center gap-2 rounded-md border bg-background text-base focus-within:border-accent'

/**
 * A row of filters with an optional "Tozalash" (clear) link on the right.
 *
 * Below 768px there is no room for a row: the search field stays where it is
 * and the rest move into a "Filtrlar" sheet, with a count of how many are set
 * so nothing is hidden silently.
 */
export function FilterBar({
  children,
  search,
  activeCount = 0,
  onClear,
}: {
  children: ReactNode
  /** The search field: shown on its own line on a phone, never hidden. */
  search?: ReactNode
  /** How many of `children` are set, for the badge on the Filtrlar button. */
  activeCount?: number
  onClear?: () => void
}) {
  const narrow = useMediaQuery(CARD_ROWS)
  const [sheet, setSheet] = useState(false)

  if (narrow) {
    return (
      <div className="flex flex-col gap-2.5">
        {search && <div className="[&>label]:w-full">{search}</div>}
        <button
          type="button"
          onClick={() => setSheet(true)}
          className={cx(
            'flex h-11 items-center justify-center gap-2 rounded-md border text-base font-medium',
            'focus-visible:outline-2 focus-visible:outline-accent',
            activeCount > 0
              ? 'border-accent bg-accent-soft text-link-text'
              : 'border-border bg-background text-primary',
          )}
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filtrlar
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-px text-xs font-semibold text-on-accent">
              {activeCount}
            </span>
          )}
        </button>
        <FilterSheet open={sheet} onClose={() => setSheet(false)} onClear={onClear}>
          {children}
        </FilterSheet>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {search}
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
        selected ? 'border-accent bg-accent-soft text-link-text' : 'border-border text-primary',
      )}
    >
      <span className="whitespace-nowrap">
        {label}: {options.find((option) => option.value === value)?.label}
      </span>
      <ChevronDown size={16} aria-hidden className={selected ? 'text-link' : 'text-secondary'} />
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
