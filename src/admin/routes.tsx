import { Navigate, type RouteObject } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAdmin } from './auth/RequireAdmin'
import { AdminLayout, type RouteHandle } from './layout/AdminLayout'
import { MENU } from './layout/menu'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { OverviewPage } from './pages/overview/OverviewPage'

const home = MENU[0]!

/** Every menu item gets a route; sections not built yet show "Tez orada". */
const sectionRoutes: RouteObject[] = MENU.slice(1).map((item) => ({
  path: item.path,
  element: <ComingSoonPage />,
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
