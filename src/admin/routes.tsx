import type { ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAdmin } from './auth/RequireAdmin'
import { AdminLayout, type RouteHandle } from './layout/AdminLayout'
import { MENU } from './layout/menu'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { JournalPage } from './pages/journal/JournalPage'
import { OverviewPage } from './pages/overview/OverviewPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { StadiumPage } from './pages/stadiums/StadiumPage'
import { StadiumsPage } from './pages/stadiums/StadiumsPage'
import { UserPage } from './pages/users/UserPage'
import { UsersPage } from './pages/users/UsersPage'

const home = MENU[0]!

/** The built sections; every other menu item shows "Tez orada". */
const PAGES: Record<string, ReactNode> = {
  '/maydonlar': <StadiumsPage />,
  '/foydalanuvchilar': <UsersPage />,
  '/jurnal': <JournalPage />,
  '/sozlamalar': <SettingsPage />,
}

const sectionRoutes: RouteObject[] = MENU.slice(1).map((item) => ({
  path: item.path,
  element: PAGES[item.path] ?? <ComingSoonPage />,
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
