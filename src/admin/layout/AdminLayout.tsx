import { useState } from 'react'
import { Outlet, useMatches } from 'react-router'
import { useSession } from '../auth/session'
import { PageHeader, type Crumb } from '../components/PageHeader'
import { COMPACT_NAV, RAIL_NAV, useMediaQuery } from '../components/useMediaQuery'
import { NavDrawer } from './NavDrawer'
import { PageHeaderContext, type PageHeaderOverride } from './pageHeader'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

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

  // Exactly one navigation is rendered, never two hidden by CSS: the top bar
  // and the sidebar would otherwise both be in the page and read out twice.
  const compact = useMediaQuery(COMPACT_NAV)
  const rail = useMediaQuery(RAIL_NAV)
  // Asking for the menu is remembered; whether it is open is derived, so
  // widening the window past 1024px — which takes the menu button away with
  // the top bar — cannot leave a drawer open with nothing to close it.
  const [menuAsked, setMenuAsked] = useState(false)
  const menuOpen = compact && menuAsked

  // RequireAdmin renders this only for an authenticated admin.
  if (session.status !== 'authenticated') return null

  const title = override?.title ?? handle?.title
  const crumbs = override?.crumbs ?? handle?.crumbs
  // Below 1024px the top bar carries the title, so a detail page's way back is
  // the last crumb that points somewhere.
  const back = crumbs?.filter((crumb) => crumb.to).at(-1)?.to

  return (
    <div className="flex min-h-dvh bg-page">
      {compact ? (
        <NavDrawer open={menuOpen} user={session.user} onClose={() => setMenuAsked(false)} />
      ) : (
        <Sidebar user={session.user} variant={rail ? 'rail' : 'full'} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {compact && (
          <TopBar
            title={title}
            back={back}
            user={session.user}
            onOpenMenu={() => setMenuAsked(true)}
          />
        )}
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">
          {title && !compact && (
            <PageHeader
              title={title}
              count={override?.count}
              status={override?.status}
              crumbs={crumbs}
            />
          )}
          <PageHeaderContext.Provider value={setOverride}>
            <Outlet />
          </PageHeaderContext.Provider>
        </main>
      </div>
    </div>
  )
}
