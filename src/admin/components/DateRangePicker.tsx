import { Calendar, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatLocalDate, lastDays, monthStart, tashkentToday } from '../format'
import { Button } from './Button'
import { cx } from './cx'

/** Tashkent calendar days (`LocalDate` strings), both inclusive; either may be open. */
export interface DateRange {
  from?: string
  to?: string
}

function rangeLabel({ from, to }: DateRange): string | null {
  if (from && to)
    return from === to ? formatLocalDate(from) : `${formatLocalDate(from)} – ${formatLocalDate(to)}`
  if (from) return `${formatLocalDate(from)} dan`
  if (to) return `${formatLocalDate(to)} gacha`
  return null
}

function presets(today: string): Array<{ label: string; range: DateRange }> {
  return [
    { label: 'Bugun', range: { from: today, to: today } },
    { label: 'Oxirgi 7 kun', range: { from: lastDays(today, 7)[0], to: today } },
    { label: 'Oxirgi 30 kun', range: { from: lastDays(today, 30)[0], to: today } },
    { label: 'Shu oy', range: { from: monthStart(today), to: today } },
  ]
}

const dateInput =
  'h-9 rounded-md border border-border bg-background px-2.5 text-base text-primary outline-none focus:border-accent [color-scheme:inherit]'

/**
 * The design's date-range chip ("01.10.2026 – 23.10.2026"). Opens a small
 * panel with quick presets and two date fields; changes apply on "Qoʻllash".
 */
export function DateRangePicker({
  value,
  onChange,
  label = 'Sana',
}: {
  value: DateRange
  onChange: (range: DateRange) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>(value)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const today = tashkentToday()
  const selected = Boolean(value.from || value.to)
  const invalid = Boolean(draft.from && draft.to && draft.to < draft.from)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const apply = (range: DateRange) => {
    onChange(range)
    setOpen(false)
    button.current?.focus()
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${rangeLabel(value) ?? 'Barchasi'}`}
        onClick={() => {
          setDraft(value)
          setOpen((current) => !current)
        }}
        className={cx(
          'flex h-9 items-center gap-2 rounded-md border pr-2.5 pl-3 text-base whitespace-nowrap',
          'focus-visible:outline-2 focus-visible:outline-accent',
          selected
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-border bg-background text-primary',
        )}
      >
        <Calendar size={16} aria-hidden className={selected ? 'text-accent' : 'text-secondary'} />
        {rangeLabel(value) ?? `${label}: Barchasi`}
        <ChevronDown
          size={16}
          aria-hidden
          className={selected ? 'text-accent' : 'text-secondary'}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="absolute top-full left-0 z-30 mt-1.5 flex w-80 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-lg"
        >
          <div className="flex flex-wrap gap-1.5">
            {presets(today).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => apply(preset.range)}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-sm font-medium text-primary hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1 text-sm font-medium text-secondary">
              Dan
              <input
                type="date"
                value={draft.from ?? ''}
                max={today}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, from: event.target.value || undefined }))
                }
                className={dateInput}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-secondary">
              Gacha
              <input
                type="date"
                value={draft.to ?? ''}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, to: event.target.value || undefined }))
                }
                className={dateInput}
              />
            </label>
          </div>
          {invalid && (
            <p role="alert" className="text-sm text-danger">
              Tugash sanasi boshlanishidan oldin boʻlishi mumkin emas
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="text" onClick={() => apply({})}>
              Tozalash
            </Button>
            <Button disabled={invalid} onClick={() => apply(draft)}>
              Qoʻllash
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
