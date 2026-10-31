import { useRef, type KeyboardEvent } from 'react'
import { formatNumber } from '../../shared/format'
import { cx } from './cx'

export interface TabItem<V extends string> {
  value: V
  label: string
  count?: number
  /** A count shown whether or not the tab is active, e.g. failed refunds in red. */
  alert?: number
}

/** Underlined tabs with an optional count pill on each. Arrow keys move between tabs. */
export function Tabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: TabItem<V>[]
  value: V
  onChange: (value: V) => void
  label: string
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + tabs.length) % tabs.length
    const tab = tabs[next]
    if (!tab) return
    onChange(tab.value)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-border">
      {tabs.map((tab, index) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-base font-medium',
              'focus-visible:outline-2 focus-visible:outline-accent',
              active
                ? 'border-accent text-accent'
                : 'border-transparent text-secondary hover:text-primary',
            )}
          >
            {tab.label}
            {active && tab.count !== undefined && (
              <span className="rounded-full bg-accent-soft px-1.5 py-px text-xs font-semibold text-accent">
                {formatNumber(tab.count)}
              </span>
            )}
            {!!tab.alert && (
              <span className="rounded-full bg-danger-soft px-1.5 py-px text-xs font-semibold text-danger">
                {formatNumber(tab.alert)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
