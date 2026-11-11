import type { ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAdmin } from './auth/RequireAdmin'
import { AdminLayout, type RouteHandle } from './layout/AdminLayout'
import { MENU } from './layout/menu'
import { BookingsPage } from './pages/bookings/BookingsPage'
import { JournalPage } from './pages/journal/JournalPage'
import { OverviewPage } from './pages/overview/OverviewPage'
import { PaymentsPage } from './pages/payments/PaymentsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { StadiumPage } from './pages/stadiums/StadiumPage'
import { StadiumsPage } from './pages/stadiums/StadiumsPage'
import { UserPage } from './pages/users/UserPage'
import { UsersPage } from './pages/users/UsersPage'

const home = MENU[0]!

/** One page per menu item (CLAUDE.md: add the item to MENU, then its page here). */
const PAGES: Record<string, ReactNode> = {
  '/maydonlar': <StadiumsPage />,
  '/foydalanuvchilar': <UsersPage />,
  '/bronlar': <BookingsPage />,
  '/tolovlar': <PaymentsPage />,
  '/jurnal': <JournalPage />,
  '/sozlamalar': <SettingsPage />,
}

function pageFor(path: string): ReactNode {
  const page = PAGES[path]
  // A menu item without a page is a programming error: fail loudly, in tests too.
  if (!page) throw new Error(`No page for the admin menu item ${path}`)
  return page
}

const sectionRoutes: RouteObject[] = MENU.slice(1).map((item) => ({
  path: item.path,
  element: pageFor(item.path),
  handle: {
    title: item.label,
    crumbs: [{ label: home.label, to: home.path }, { label: item.label }],
  } satisfies RouteHandle,
}))

/** Detail pages; each sets its own title and breadcrumbs once its data loads. */
const detailRoutes: RouteObject[] = [
  { path: '/maydonlar/:id', element: <StadiumPage />, handle: { title: 'Maydon' } },
  { path: '/foydalanuvchilar/:id', element: <UserPage />, handle: { title: 'Foydalanuvchi' } },
]

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <OverviewPage />,
            handle: { title: home.label } satisfies RouteHandle,
          },
          ...sectionRoutes,
          ...detailRoutes,
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
