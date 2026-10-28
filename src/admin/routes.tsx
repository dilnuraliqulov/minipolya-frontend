import type { ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAdmin } from './auth/RequireAdmin'
import { AdminLayout, type RouteHandle } from './layout/AdminLayout'
import { MENU } from './layout/menu'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { OverviewPage } from './pages/overview/OverviewPage'
import { SettingsPage } from './pages/settings/SettingsPage'

const home = MENU[0]!

/** The built sections; every other menu item shows "Tez orada". */
const PAGES: Record<string, ReactNode> = {
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
