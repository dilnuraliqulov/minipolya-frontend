import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react'
import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { CARD } from './card'
import { cx } from './cx'
import { Skeleton } from './Skeleton'
import { EmptyState, ErrorState } from './States'
import { CARD_ROWS, useMediaQuery } from './useMediaQuery'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  /** Fixed column width in px; others share the rest. */
  width?: number
  sortable?: boolean
}

export interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  /**
   * The backend has no sort parameter — every list's order is fixed
   * server-side. The table only reports clicks; the page decides what
   * sorting means (e.g. the current page only) or leaves columns unsortable.
   */
  sort?: SortState | null
  onSortChange?: (sort: SortState) => void
  onRowClick?: (row: T) => void
  selectedKey?: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  empty?: { title: string; description?: string }
  /** Skeleton rows while loading. */
  loadingRows?: number
  /** Accessible name of the table. */
  label?: string
  /**
   * The same row as a card, for screens under 768px, where a wide table
   * cannot be read. Show the three or four fields that matter and the status;
   * tapping the card does what clicking the row does.
   *
   * Without it the table stays a table and scrolls sideways with its first
   * column pinned — right for a narrow secondary table, wrong for a page's
   * main list.
   */
  card?: (row: T) => ReactNode
}

/**
 * The shell of a row card: the title line with its status on the right, then
 * the caller's `<dl>` rows. Every page's cards look the same.
 */
export function RowCard({
  title,
  status,
  children,
}: {
  title: ReactNode
  status?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-start gap-2">
        {/* A block, so a `truncate` title inside it actually clips — overflow
            has no effect on an inline span. */}
        <div className="min-w-0 flex-1 text-base font-medium text-primary">{title}</div>
        {status}
      </div>
      {children && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm [&>dd]:min-w-0 [&>dd]:text-primary [&>dt]:text-secondary">
          {children}
        </dl>
      )}
    </div>
  )
}

function nextSort(current: SortState | null | undefined, key: string): SortState {
  if (current?.key !== key) return { key, direction: 'asc' }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  selectedKey,
  loading = false,
  error = false,
  onRetry,
  empty = { title: 'Hech narsa topilmadi' },
  loadingRows = 5,
  label,
  card,
}: DataTableProps<T>) {
  const narrow = useMediaQuery(CARD_ROWS)
  const span = columns.length + (onRowClick ? 1 : 0)
  // A table with no card view scrolls sideways on a phone; pinning the first
  // column keeps every row identifiable. `bg-inherit` picks up the row's own
  // background, so a selected row stays highlighted under the pinned cell.
  const sticky = 'max-md:sticky max-md:left-0 max-md:bg-inherit'
  // Clickable rows make the table a grid: one tab stop (the selected row, else
  // the first), arrows / Home / End move between rows, Enter or Space opens.
  const interactive = Boolean(onRowClick)
  const [active, setActive] = useState<string>()
  const keys = rows?.map(rowKey) ?? []
  const tabStop =
    active !== undefined && keys.includes(active)
      ? active
      : selectedKey !== undefined && keys.includes(selectedKey)
        ? selectedKey
        : keys[0]

  const moveTo = (target: Element | null | undefined) => {
    if (!(target instanceof HTMLTableRowElement) || !target.dataset.rowKey) return
    setActive(target.dataset.rowKey)
    target.focus()
  }

  if (narrow && card) {
    if (loading) {
      return (
        <div aria-busy className="flex flex-col gap-2">
          {Array.from({ length: loadingRows }, (_, i) => (
            <div key={i} className={cx(CARD, 'flex flex-col gap-2 p-4')}>
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ))}
        </div>
      )
    }
    if (error) {
      return (
        <div className={CARD}>
          <ErrorState onRetry={onRetry} />
        </div>
      )
    }
    if (!rows || rows.length === 0) {
      return (
        <div className={CARD}>
          <EmptyState title={empty.title} description={empty.description} />
        </div>
      )
    }
    return (
      <ul aria-label={label} className="flex flex-col gap-2">
        {rows.map((row) => {
          const key = rowKey(row)
          const selected = selectedKey === key
          const content = (
            <>
              {card(row)}
              {onRowClick && (
                <ChevronRight size={18} aria-hidden className="mt-0.5 shrink-0 text-secondary" />
              )}
            </>
          )
          return (
            <li key={key}>
              {onRowClick ? (
                <button
                  type="button"
                  onClick={() => onRowClick(row)}
                  aria-current={selected || undefined}
                  className={cx(
                    CARD,
                    'flex w-full min-w-0 items-start gap-3 p-4 text-left',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    selected ? 'border-accent bg-accent-soft' : 'hover:bg-hover',
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className={cx(CARD, 'flex min-w-0 items-start gap-3 p-4')}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  let body: ReactNode
  if (loading) {
    body = Array.from({ length: loadingRows }, (_, i) => (
      <tr key={i} className="h-14 border-b border-border last:border-b-0">
        {columns.map((column) => (
          <td key={column.key} className="px-3 first:pl-5">
            <Skeleton className="h-3 w-3/5" />
          </td>
        ))}
        {onRowClick && <td />}
      </tr>
    ))
  } else if (error) {
    body = (
      <tr>
        <td colSpan={span}>
          <ErrorState onRetry={onRetry} />
        </td>
      </tr>
    )
  } else if (!rows || rows.length === 0) {
    body = (
      <tr>
        <td colSpan={span}>
          <EmptyState title={empty.title} description={empty.description} />
        </td>
      </tr>
    )
  } else {
    body = rows.map((row) => {
      const key = rowKey(row)
      const open = onRowClick ? () => onRowClick(row) : undefined
      const onKeyDown = open
        ? (event: KeyboardEvent<HTMLTableRowElement>) => {
            const row = event.currentTarget
            const body = row.parentElement
            const target = {
              ArrowDown: row.nextElementSibling,
              ArrowUp: row.previousElementSibling,
              Home: body?.firstElementChild,
              End: body?.lastElementChild,
            }[event.key]
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              open()
            } else if (target !== undefined) {
              event.preventDefault()
              moveTo(target)
            }
          }
        : undefined
      return (
        <tr
          key={key}
          onClick={open}
          onKeyDown={onKeyDown}
          onFocus={open ? () => setActive(key) : undefined}
          data-row-key={open ? key : undefined}
          tabIndex={open ? (key === tabStop ? 0 : -1) : undefined}
          aria-selected={open ? selectedKey === key : undefined}
          className={cx(
            // An explicit background so a pinned first cell can inherit it.
            'group h-14 border-b border-border bg-background text-base text-primary last:border-b-0',
            open && 'cursor-pointer outline-none hover:bg-hover focus-visible:bg-hover',
            selectedKey === key && 'bg-accent-soft hover:bg-accent-soft',
          )}
        >
          {columns.map((column, index) => (
            <td key={column.key} className={cx('px-3 first:pl-5', index === 0 && sticky)}>
              {column.render(row)}
            </td>
          ))}
          {open && (
            <td className="w-10 pr-4 text-right">
              <ChevronRight
                size={16}
                aria-hidden
                className="inline text-secondary opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </td>
          )}
        </tr>
      )
    })
  }

  return (
    // `min-w-0`: as a flex item this wrapper defaults to `min-width: auto`, so
    // without it the box grows to the table's width instead of scrolling.
    // `contain-paint`: in Chromium a `<table>` wider than its `overflow-x`
    // ancestor still adds to the ROOT's scrollable overflow — the page scrolls
    // sideways even though the table scrolls correctly inside this box. Paint
    // containment stops that propagating. A block box would not need it.
    <div className="min-w-0 contain-paint overflow-x-auto rounded-xl border border-border bg-background">
      <table
        className="w-full border-collapse"
        role={interactive ? 'grid' : undefined}
        aria-label={label}
        aria-busy={loading || undefined}
      >
        <thead>
          <tr className="h-11 border-b border-border bg-surface text-left">
            {columns.map((column, index) => {
              const active = sort?.key === column.key
              const SortIcon = !active
                ? ArrowUpDown
                : sort.direction === 'asc'
                  ? ArrowUp
                  : ArrowDown
              return (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cx(
                    'px-3 text-xs font-semibold text-secondary first:pl-5',
                    index === 0 && sticky,
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(nextSort(sort, column.key))}
                      className="inline-flex items-center gap-1 rounded-xs hover:text-primary focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {column.header}
                      <SortIcon
                        size={14}
                        aria-hidden
                        className={active ? 'text-link' : 'text-secondary'}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
            {onRowClick && (
              <th className="w-10">
                <span className="sr-only">Ochish</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  )
}
