import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

export interface Crumb {
  label: string
  /** Omitted for the current page. */
  to?: string
}

/** Breadcrumbs (when there is more than one level) above the page title. */
export function PageHeader({ title, crumbs = [] }: { title: string; crumbs?: Crumb[] }) {
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
      <h1 className="text-4xl font-semibold text-primary">{title}</h1>
    </header>
  )
}
