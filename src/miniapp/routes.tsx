import { Navigate, type RouteObject } from 'react-router'
import { SoonTab } from './layout/SoonScreen'

/** The Mini App's routes. Tabs later parts build show "Tez orada" until then. */
export const routes: RouteObject[] = [
  { path: '/', element: <SoonTab titleKey="tabs.stadiums" /> },
  { path: '/team', element: <SoonTab titleKey="tabs.team" /> },
  { path: '/games', element: <SoonTab titleKey="tabs.games" /> },
  { path: '/profile', element: <SoonTab titleKey="tabs.profile" /> },
  { path: '*', element: <Navigate to="/" replace /> },
]
