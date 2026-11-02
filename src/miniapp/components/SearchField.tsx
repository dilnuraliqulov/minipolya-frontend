import { CircleX, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** The design's Search Field: 44px, search icon, clear button once there is text. */
export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
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
          className="-mr-2 flex size-11 shrink-0 items-center justify-center text-secondary"
        >
          <CircleX size={20} aria-hidden />
        </button>
      )}
    </div>
  )
}
