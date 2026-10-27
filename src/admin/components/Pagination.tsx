import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '../../shared/format'
import { cx } from './cx'
import { pageItems } from './pageItems'

export interface PaginationProps {
  /** 0-based, as the backend sends it. */
  page: number
  size: number
  totalElements: number
  totalPages: number
  onPageChange: (page: number) => void
}

const square =
  'flex size-8 items-center justify-center rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-accent'

export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const from = totalElements === 0 ? 0 : page * size + 1
  const to = Math.min((page + 1) * size, totalElements)

  return (
    <nav aria-label="Sahifalar" className="flex items-center gap-2 px-4 py-3">
      <p className="text-sm text-secondary">
        {formatNumber(from)}–{formatNumber(to)} / {formatNumber(totalElements)}
      </p>
      <span className="flex-1" />
      <button
        type="button"
        aria-label="Oldingi sahifa"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        className={cx(
          square,
          'border border-border bg-background text-secondary disabled:opacity-40',
        )}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      {pageItems(page, totalPages).map((item, i) =>
        item === null ? (
          <span key={`gap-${i}`} className="w-3 text-center text-sm text-secondary">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page + 1 ? 'page' : undefined}
            onClick={() => onPageChange(item - 1)}
            className={cx(
              square,
              item === page + 1
                ? 'bg-accent text-on-accent'
                : 'border border-border bg-background text-primary hover:bg-hover',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Keyingi sahifa"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className={cx(
          square,
          'border border-border bg-background text-secondary disabled:opacity-40',
        )}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  )
}
