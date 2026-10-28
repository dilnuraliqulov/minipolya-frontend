import { useState } from 'react'
import { Outlet, useMatches } from 'react-router'
import { useSession } from '../auth/session'
import { PageHeader, type Crumb } from '../components/PageHeader'
import { PageHeaderContext, type PageHeaderOverride } from './pageHeader'
import { Sidebar } from './Sidebar'

/** Set on each route as `handle`; drives the page title and breadcrumbs. */
export interface RouteHandle {
  title: string
  crumbs?: Crumb[]
}

export function AdminLayout() {
  const session = useSession()
  const [override, setOverride] = useState<PageHeaderOverride | null>(null)
  const handle = useMatches()
    .map((match) => match.handle as RouteHandle | undefined)
    .filter(Boolean)
    .at(-1)

  // RequireAdmin renders this only for an authenticated admin.
  if (session.status !== 'authenticated') return null

  const title = override?.title ?? handle?.title
  return (
    <div className="flex min-h-dvh bg-page">
      <Sidebar user={session.user} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        {title && (
          <PageHeader
            title={title}
            count={override?.count}
            crumbs={override?.crumbs ?? handle?.crumbs}
          />
        )}
        <PageHeaderContext.Provider value={setOverride}>
          <Outlet />
        </PageHeaderContext.Provider>
      </main>
    </div>
  )
}
