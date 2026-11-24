import { CircleX, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from './cx'

/**
 * The design's Search Field: 44px, search icon, clear button once there is
 * text, and an optional `action` inside the field on the right — the home
 * page's filter button, so search and filters are one row.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  action,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** A 44px control inside the field, after the clear button. */
  action?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-accent">
      <Search size={20} className="shrink-0 text-secondary" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        className="h-full min-w-0 flex-1 bg-transparent text-lg text-primary outline-none placeholder:text-secondary [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('common.clear')}
          className={cx(
            'flex size-11 shrink-0 items-center justify-center text-secondary',
            action === undefined && '-mr-2',
          )}
        >
          <CircleX size={20} aria-hidden />
        </button>
      )}
      {action !== undefined && <span className="-mr-2 flex shrink-0 items-center">{action}</span>}
    </div>
  )
}
