import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { formatNumber } from '../../shared/format'
import { StatusBadge, type BadgeTone } from './StatusBadge'

export interface Crumb {
  label: string
  /** Omitted for the current page. */
  to?: string
}

/** Breadcrumbs (when there is more than one level) above the page title. */
export function PageHeader({
  title,
  count,
  status,
  crumbs = [],
}: {
  title: string
  /** A total shown after the title, e.g. "Jurnal · 2 318". */
  count?: number
  status?: { label: string; tone: BadgeTone }
  crumbs?: Crumb[]
}) {
  return (
    <header className="flex flex-col gap-1">
      {crumbs.length > 1 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm text-secondary">
            {crumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} aria-hidden />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-primary hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-primary">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-semibold text-primary">
          {title}
          {count !== undefined && <span className="text-secondary"> · {formatNumber(count)}</span>}
        </h1>
        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
      </div>
    </header>
  )
}
