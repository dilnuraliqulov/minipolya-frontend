import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Search } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { getStadium, searchStadiumOptions } from '../../api/stadiums'
import { cx } from '../../components/cx'
import { useDebounced } from '../../components/useDebounced'

const ALL = { value: '', label: 'Barchasi' }

/**
 * "Maydon: …" filter for Bronlar and Toʻlovlar: a searchable list that asks
 * the backend (`GET /api/admin/stadiums?search=`) as the admin types, instead
 * of loading every stadium up front. A linked view (`?maydon=<id>`) names its
 * stadium from the stadium's own record.
 */
export function StadiumFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const search = useDebounced(text.trim())
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()

  const queryClient = useQueryClient()
  const nameKey = (id: string) => ['admin', 'stadiums', 'name', id] as const
  const selected = useQuery({
    queryKey: nameKey(value),
    queryFn: async () => (await getStadium(value)).name,
    enabled: value !== '',
    staleTime: 5 * 60_000,
  })
  const results = useQuery({
    queryKey: ['admin', 'stadiums', 'options', search],
    queryFn: () => searchStadiumOptions(search),
    enabled: open,
    staleTime: 60_000,
  })
  const options = [ALL, ...(results.data ?? []).map((s) => ({ value: s.id, label: s.name }))]
  const label = value === '' ? ALL.label : (selected.data ?? '…')

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const choose = (option: { value: string; label: string }) => {
    // The option already carries the name: no need to fetch the stadium.
    if (option.value) queryClient.setQueryData(nameKey(option.value), option.label)
    onChange(option.value)
    setOpen(false)
    setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[active]
      if (option) choose(option)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  const isSet = value !== ''
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActive(0)
          setOpen((o) => !o)
        }}
        className={cx(
          'flex h-9 items-center gap-2 rounded-md border pr-2.5 pl-3 text-base whitespace-nowrap',
          'focus-visible:outline-2 focus-visible:outline-accent',
          isSet
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-border bg-background text-primary',
        )}
      >
        Maydon: {label}
        <ChevronDown size={16} aria-hidden className={isSet ? 'text-accent' : 'text-secondary'} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 flex w-72 flex-col gap-1 rounded-lg border border-border bg-background p-2 shadow-md">
          <label className="flex h-9 items-center gap-2 rounded-md border border-border px-2.5 focus-within:border-accent">
            <Search size={16} aria-hidden className="shrink-0 text-secondary" />
            <input
              autoFocus
              role="combobox"
              aria-label="Maydon qidirish"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={`${listId}-${active}`}
              placeholder="Nomi yoki manzili"
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-secondary"
            />
          </label>
          <ul id={listId} role="listbox" aria-label="Maydon" className="max-h-64 overflow-y-auto">
            {options.map((option, i) => (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(i)}
                className={cx(
                  'cursor-pointer truncate rounded-sm px-2.5 py-2 text-base',
                  i === active ? 'bg-hover' : '',
                  option.value === value ? 'font-semibold text-accent' : 'text-primary',
                )}
              >
                {option.label}
              </li>
            ))}
            {results.isPending && (
              <li className="px-2.5 py-2 text-sm text-secondary">Yuklanmoqda…</li>
            )}
            {results.isError && (
              <li className="px-2.5 py-2 text-sm text-danger">Yuklab boʻlmadi</li>
            )}
            {results.data?.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-secondary">Hech narsa topilmadi</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
