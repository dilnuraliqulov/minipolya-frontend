import { Navigate, type RouteObject } from 'react-router'
import { CardsPage } from './cards/CardsPage'
import { BookedPage } from './booking/BookedPage'
import { CheckoutPage } from './booking/CheckoutPage'
import { SoonScreen, SoonTab } from './layout/SoonScreen'
import { PersonalPage } from './profile/PersonalPage'
import { ProfilePage } from './profile/ProfilePage'
import { FavoritesPage } from './stadiums/FavoritesPage'
import { ReviewsPage } from './stadiums/ReviewsPage'
import { StadiumPage } from './stadiums/StadiumPage'
import { RouteError } from './RouteError'
import { SplashDone } from './splash'
import { StadiumsPage } from './stadiums/StadiumsPage'

const screens: RouteObject[] = [
  { path: '/', element: <StadiumsPage /> },
  {
    path: '/stadiums/:id',
    element: (
      <SplashDone>
        <StadiumPage />
      </SplashDone>
    ),
  },
  {
    path: '/stadiums/:id/reviews',
    element: (
      <SplashDone>
        <ReviewsPage />
      </SplashDone>
    ),
  },
  {
    path: '/checkout',
    element: (
      <SplashDone>
        <CheckoutPage />
      </SplashDone>
    ),
  },
  {
    path: '/checkout/done',
    element: (
      <SplashDone>
        <BookedPage />
      </SplashDone>
    ),
  },
  {
    path: '/team',
    element: (
      <SplashDone>
        <SoonTab titleKey="tabs.team" />
      </SplashDone>
    ),
  },
  {
    path: '/games',
    element: (
      <SplashDone>
        <SoonTab titleKey="tabs.games" />
      </SplashDone>
    ),
  },
  {
    path: '/profile',
    element: (
      <SplashDone>
        <ProfilePage />
      </SplashDone>
    ),
  },
  {
    path: '/profile/personal',
    element: (
      <SplashDone>
        <PersonalPage />
      </SplashDone>
    ),
  },
  {
    path: '/profile/cards',
    element: (
      <SplashDone>
        <CardsPage />
      </SplashDone>
    ),
  },
  {
    path: '/profile/favorites',
    element: (
      <SplashDone>
        <FavoritesPage />
      </SplashDone>
    ),
  },
  {
    path: '/owner',
    element: (
      <SplashDone>
        <SoonScreen titleKey="profile.ownerMode" />
      </SplashDone>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

/** The Mini App's routes. Screens later parts build show "Tez orada" until then. */
export const routes: RouteObject[] = [{ errorElement: <RouteError />, children: screens }]
