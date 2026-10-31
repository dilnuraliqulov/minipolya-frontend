import { Navigate, type RouteObject } from 'react-router'
import { SoonScreen, SoonTab } from './layout/SoonScreen'
import { PersonalPage } from './profile/PersonalPage'
import { ProfilePage } from './profile/ProfilePage'

/** The Mini App's routes. Screens later parts build show "Tez orada" until then. */
export const routes: RouteObject[] = [
  { path: '/', element: <SoonTab titleKey="tabs.stadiums" /> },
  { path: '/team', element: <SoonTab titleKey="tabs.team" /> },
  { path: '/games', element: <SoonTab titleKey="tabs.games" /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/profile/personal', element: <PersonalPage /> },
  { path: '/profile/cards', element: <SoonScreen titleKey="profile.cards" /> },
  { path: '/profile/favorites', element: <SoonScreen titleKey="profile.favorites" /> },
  { path: '/owner', element: <SoonScreen titleKey="profile.ownerMode" /> },
  { path: '*', element: <Navigate to="/" replace /> },
]
