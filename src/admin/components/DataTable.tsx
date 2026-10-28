import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from './cx'
import { Skeleton } from './Skeleton'
import { EmptyState, ErrorState } from './States'

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
}: DataTableProps<T>) {
  const span = columns.length + (onRowClick ? 1 : 0)

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
        ? (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              open()
            }
          }
        : undefined
      return (
        <tr
          key={key}
          onClick={open}
          onKeyDown={onKeyDown}
          tabIndex={open ? 0 : undefined}
          aria-selected={selectedKey === undefined ? undefined : selectedKey === key}
          className={cx(
            'group h-14 border-b border-border text-base text-primary last:border-b-0',
            open && 'cursor-pointer outline-none hover:bg-hover focus-visible:bg-hover',
            selectedKey === key && 'bg-accent-soft hover:bg-accent-soft',
          )}
        >
          {columns.map((column) => (
            <td key={column.key} className="px-3 first:pl-5">
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
    <div className="overflow-x-auto rounded-xl border border-border bg-background">
      <table className="w-full border-collapse" aria-busy={loading || undefined}>
        <thead>
          <tr className="h-11 border-b border-border bg-surface text-left">
            {columns.map((column) => {
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
                  className="px-3 text-xs font-semibold text-secondary first:pl-5"
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
                        className={active ? 'text-accent' : 'text-secondary'}
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
