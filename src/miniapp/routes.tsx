import { Navigate, type RouteObject } from 'react-router'
import { CardsPage } from './cards/CardsPage'
import { BookedPage } from './booking/BookedPage'
import { CheckoutPage } from './booking/CheckoutPage'
import { BookingPage } from './bookings/BookingPage'
import { BookingsPage } from './bookings/BookingsPage'
import { ChatPage } from './games/ChatPage'
import { GamePage } from './games/GamePage'
import { AboutPage, LegalPage } from './about/AboutPage'
import { HelpPage } from './about/HelpPage'
import { NotificationsPage } from './notifications/NotificationsPage'
import { PersonalPage } from './profile/PersonalPage'
import { PhonePage } from './profile/PhonePage'
import { ProfilePage } from './profile/ProfilePage'
import { FavoritesPage } from './stadiums/FavoritesPage'
import { ReviewsPage } from './stadiums/ReviewsPage'
import { StadiumPage } from './stadiums/StadiumPage'
import { AddStadiumPage } from './owner/wizard/AddStadiumPage'
import { OwnerClosuresPage } from './owner/OwnerClosuresPage'
import { OwnerContractPage } from './owner/OwnerContractPage'
import { OwnerFacilitiesPage } from './owner/OwnerFacilitiesPage'
import { OwnerHoursPage } from './owner/OwnerHoursPage'
import { OwnerInfoPage } from './owner/OwnerInfoPage'
import { OwnerPhotosPage } from './owner/OwnerPhotosPage'
import { OwnerPricesPage } from './owner/OwnerPricesPage'
import { OwnerProfilePage } from './owner/OwnerProfilePage'
import { OwnerReportPage } from './owner/OwnerReportPage'
import { OwnerReviewsPage } from './owner/OwnerReviewsPage'
import { OwnerSchedulePage } from './owner/OwnerSchedulePage'
import { OwnerTermsPage } from './owner/OwnerTermsPage'
import { OwnerStadiumPage } from './owner/OwnerStadiumPage'
import { RouteError } from './RouteError'
import { SplashDone } from './splash'
import { AcceptChallengePage } from './teams/AcceptChallengePage'
import { ChallengesPage } from './teams/ChallengesPage'
import { OpponentPage } from './teams/OpponentPage'
import { JoinTeamPage } from './teams/JoinTeamPage'
import { TeamCreatePage } from './teams/TeamCreatePage'
import { TeamPage } from './teams/TeamPage'
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
    path: '/bookings/:id',
    element: (
      <SplashDone>
        <BookingPage />
      </SplashDone>
    ),
  },
  {
    path: '/games/:id',
    element: (
      <SplashDone>
        <GamePage />
      </SplashDone>
    ),
  },
  {
    path: '/games/:id/chat',
    element: (
      <SplashDone>
        <ChatPage />
      </SplashDone>
    ),
  },
  {
    path: '/team',
    element: (
      <SplashDone>
        <TeamPage />
      </SplashDone>
    ),
  },
  {
    path: '/challenges',
    element: (
      <SplashDone>
        <ChallengesPage />
      </SplashDone>
    ),
  },
  {
    path: '/challenges/:gameId',
    element: (
      <SplashDone>
        <AcceptChallengePage />
      </SplashDone>
    ),
  },
  {
    path: '/opponent',
    element: (
      <SplashDone>
        <OpponentPage />
      </SplashDone>
    ),
  },
  {
    path: '/team/new',
    element: (
      <SplashDone>
        <TeamCreatePage />
      </SplashDone>
    ),
  },
  {
    path: '/games',
    element: (
      <SplashDone>
        <BookingsPage />
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
  ...(
    [
      ['/join/:code', <JoinTeamPage />],
      ['/profile/phone', <PhonePage />],
      ['/profile/notifications', <NotificationsPage />],
      ['/profile/help', <HelpPage />],
      ['/profile/about', <AboutPage />],
      ['/profile/about/terms', <LegalPage page="terms" />],
      ['/profile/about/privacy', <LegalPage page="privacy" />],
      ['/owner', <OwnerSchedulePage />],
      ['/owner/stadium', <OwnerStadiumPage />],
      ['/owner/stadium/:id/info', <OwnerInfoPage />],
      ['/owner/stadium/:id/facilities', <OwnerFacilitiesPage />],
      ['/owner/stadium/:id/prices', <OwnerPricesPage />],
      ['/owner/stadium/:id/closures', <OwnerClosuresPage />],
      ['/owner/stadium/:id/reviews', <OwnerReviewsPage />],
      ['/owner/stadium/:id/hours', <OwnerHoursPage />],
      ['/owner/stadium/:id/terms', <OwnerTermsPage />],
      ['/owner/stadium/:id/photos', <OwnerPhotosPage />],
      ['/owner/report', <OwnerReportPage />],
      ['/owner/profile', <OwnerProfilePage />],
      ['/owner/contract', <OwnerContractPage />],
      ['/owner/new', <AddStadiumPage />],
    ] as const
  ).map(([path, page]) => ({ path, element: <SplashDone>{page}</SplashDone> })),
  { path: '*', element: <Navigate to="/" replace /> },
]

/** The Mini App's routes. Screens later parts build show "Tez orada" until then. */
export const routes: RouteObject[] = [{ errorElement: <RouteError />, children: screens }]
