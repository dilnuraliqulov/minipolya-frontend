import type { Page, Route } from '@playwright/test'
import { LONG_ADDRESS, LONG_STADIUM_NAME, page as pageOf } from './data'

/**
 * The Mini App's home page, answered from fixtures.
 *
 * Why not the admin fixtures: the Mini App signs in with Telegram `initData`
 * and calls the player endpoints, so it needs its own `window.Telegram.WebApp`
 * and its own routes. Nothing here needs the backend.
 */

const USER_ID = '018f3a2c-0000-7000-8000-00000000d001'

/** A name long enough to crowd Telegram's Close / ⋯ row in fullscreen. */
export const LONG_FIRST_NAME = 'Muhammadjon'

/** Two digits, so the bell's unread badge is at its widest. */
export const UNREAD = 12

const user = {
  id: USER_ID,
  phone: '+998901234567',
  name: `${LONG_FIRST_NAME} Abdurahmonov`,
  firstName: LONG_FIRST_NAME,
  telegramId: 5551234,
  language: 'uz',
  isOwner: false,
  isAdmin: false,
  createdAt: '2026-01-05T10:00:00Z',
}

const stadiums = [
  {
    id: '018f3a2c-0000-7000-8000-0000000000a1',
    name: LONG_STADIUM_NAME,
    address: LONG_ADDRESS,
    district: 'Mirzo Ulugʻbek',
    format: '7x7',
    surfaceType: 'artificial',
    status: 'approved',
    pricePerHour: 15_500_000,
    isActive: true,
    averageRating: 4.8,
    reviewCount: 24,
    freeSlotsCount: 5,
    isFavorited: false,
  },
  {
    id: '018f3a2c-0000-7000-8000-0000000000a2',
    name: 'Paxtakor Mini Arena',
    address: 'Chilonzor tumani, Bunyodkor shoh koʻchasi 12',
    district: 'Chilonzor',
    format: '5x5',
    surfaceType: 'natural',
    status: 'approved',
    pricePerHour: 9_500_000,
    isActive: true,
    freeSlotsCount: 0,
    isFavorited: true,
  },
]

/** The team the signed-in player captains, with a level and a game ahead of it. */
export const MY_TEAM = {
  id: '018f3a2c-0000-7000-8000-0000000000b1',
  name: 'Chilonzor Lions',
  leaderId: USER_ID,
  leaderName: `${LONG_FIRST_NAME} Abdurahmonov`,
  level: 'orta',
  gamesPlayed: 7,
  members: [
    { userId: USER_ID, userName: `${LONG_FIRST_NAME} Abdurahmonov`, role: 'leader' },
    { userId: '018f3a2c-0000-7000-8000-0000000000c2', userName: 'Bobur Rahimov', role: 'member' },
    {
      userId: '018f3a2c-0000-7000-8000-0000000000c3',
      userName: 'Sardor Toshmatov',
      role: 'member',
    },
  ],
  upcomingGame: {
    gameId: '018f3a2c-0000-7000-8000-0000000000e1',
    startsAt: '2099-11-21T15:00:00Z',
    status: 'confirmed',
    stadiumName: LONG_STADIUM_NAME,
    opponentName: 'Yunusobod United',
  },
}

/** A second team, so the switcher is in; this one has no level set. */
export const OTHER_TEAM = {
  id: '018f3a2c-0000-7000-8000-0000000000b2',
  name: 'Sergeli Atlas',
  leaderId: '018f3a2c-0000-7000-8000-0000000000c2',
  leaderName: 'Bobur Rahimov',
  gamesPlayed: 0,
  members: [
    { userId: '018f3a2c-0000-7000-8000-0000000000c2', userName: 'Bobur Rahimov', role: 'leader' },
    { userId: USER_ID, userName: `${LONG_FIRST_NAME} Abdurahmonov`, role: 'member' },
  ],
}

const teams = [
  {
    id: MY_TEAM.id,
    name: MY_TEAM.name,
    leaderName: MY_TEAM.leaderName,
    memberCount: 3,
    level: 'orta',
  },
  { id: OTHER_TEAM.id, name: OTHER_TEAM.name, leaderName: OTHER_TEAM.leaderName, memberCount: 2 },
]

export const GAME_ID = MY_TEAM.upcomingGame.gameId

const game = {
  id: GAME_ID,
  type: 'team_vs_team',
  status: 'confirmed',
  stadiumId: stadiums[0]!.id,
  creatorId: USER_ID,
  startsAt: '2099-11-21T15:00:00Z',
  endsAt: '2099-11-21T16:00:00Z',
  isPublic: false,
  createdAt: '2026-11-01T10:00:00Z',
  chatMessageMaxLength: 1000,
  teams: [
    {
      side: 'a',
      teamId: MY_TEAM.id,
      teamName: MY_TEAM.name,
      teamLevel: 'orta',
      leaderId: USER_ID,
      leaderName: MY_TEAM.leaderName,
      price: 5_500_000,
      remainderAmount: 7_500_000,
      remainderStatus: 'unpaid',
      paidInApp: 5_500_000,
      heldAmount: 0,
    },
    {
      side: 'b',
      teamId: '018f3a2c-0000-7000-8000-0000000000b9',
      teamName: 'Yunusobod United',
      teamLevel: 'professional',
      leaderId: '018f3a2c-0000-7000-8000-0000000000c9',
      leaderName: 'Rustam Qodirov',
      price: 5_500_000,
      remainderAmount: 7_500_000,
      remainderStatus: 'unpaid',
      paidInApp: 5_500_000,
      heldAmount: 0,
    },
  ],
}

/** Newest first, as the API answers: a system pair, then a run from each side. */
const messages = [
  {
    id: 'm4',
    gameId: GAME_ID,
    userId: USER_ID,
    userName: `${LONG_FIRST_NAME} Abdurahmonov`,
    message: 'Formamiz oq, sizniki?',
    createdAt: '2026-11-19T14:12:00Z',
    kind: 'user',
    side: 'a',
    teamId: MY_TEAM.id,
    teamName: MY_TEAM.name,
    teamLevel: 'orta',
  },
  {
    id: 'm3',
    gameId: GAME_ID,
    userId: '018f3a2c-0000-7000-8000-0000000000c9',
    userName: 'Rustam Qodirov',
    message: 'Salom! Soat 20:00 da maydonda boʻlamiz, kechikmaymiz.',
    createdAt: '2026-11-19T14:10:00Z',
    kind: 'user',
    side: 'b',
    teamId: '018f3a2c-0000-7000-8000-0000000000b9',
    teamName: 'Yunusobod United',
    teamLevel: 'professional',
  },
  {
    id: 's2',
    gameId: GAME_ID,
    message: 'team_joined',
    createdAt: '2026-11-18T09:00:10Z',
    kind: 'system',
    event: 'team_joined',
    eventTeamName: 'Yunusobod United',
  },
  {
    id: 's1',
    gameId: GAME_ID,
    message: 'game_confirmed',
    createdAt: '2026-11-18T09:00:00Z',
    kind: 'system',
    event: 'game_confirmed',
  },
]

const joinQuote = {
  options: [
    { option: 'minimum', amount: 5_500_000, remainderAmount: 7_500_000 },
    { option: 'full', amount: 13_000_000, remainderAmount: 0 },
  ],
  cancellationDeadline: '2099-11-20T15:00:00Z',
}

const cards = [
  {
    id: '018f3a2c-0000-7000-8000-0000000000f1',
    maskedNumber: '8600 •••• •••• 1234',
    expiry: '12/29',
    isDefault: true,
  },
]

/** A waiting team of another level, so the board's badge and chips have something to show. */
export const CHALLENGE = {
  gameId: '018f3a2c-0000-7000-8000-0000000000e2',
  waitingTeamId: '018f3a2c-0000-7000-8000-0000000000b9',
  waitingTeamName: 'Yunusobod United',
  waitingTeamLevel: 'professional',
  stadiumId: stadiums[0]!.id,
  stadiumName: LONG_STADIUM_NAME,
  stadiumAddress: LONG_ADDRESS,
  stadiumDistrict: 'Mirzo Ulugʻbek',
  format: '7x7',
  startsAt: '2099-11-21T15:00:00Z',
  endsAt: '2099-11-21T16:00:00Z',
  durationHours: 1,
  totalPrice: 31_000_000,
  amountToPayNow: 5_500_000,
  remainderAmount: 7_500_000,
  fullAmount: 13_000_000,
}

function ok(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, message: null }),
  })
}

function token(): string {
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '')
  return [
    b64({ alg: 'HS256', typ: 'JWT' }),
    b64({
      sub: USER_ID,
      isOwner: false,
      isAdmin: false,
      exp: Math.floor(Date.UTC(2099, 0, 1) / 1000),
    }),
    'e2e-not-a-real-signature',
  ].join('.')
}

export interface MiniappOptions {
  theme: 'light' | 'dark'
  /** Telegram's fullscreen layout: our header moves into the Close / ⋯ row. */
  fullscreen?: boolean
  /** The language the profile reports — every screen is checked in uz and ru. */
  language?: 'uz' | 'ru' | 'en'
  /** What the challenge board answers; empty unless a test needs a card on it. */
  challenges?: unknown[]
}

/**
 * Installs a stand-in for `window.Telegram.WebApp` (so the session can sign in
 * with initData), the chosen theme, and every `/api` call the home page makes.
 */
export async function installMiniapp(page: Page, options: MiniappOptions): Promise<void> {
  const { theme, fullscreen = false, language = 'uz', challenges = [] } = options

  await page.addInitScript(
    ([theme, fullscreen]) => {
      const noop = () => {}
      const telegram = {
        WebApp: {
          // Never a real signature: every request is intercepted.
          initData: 'query_id=1&user=%7B%22id%22%3A5551234%7D&auth_date=1&hash=e2e',
          initDataUnsafe: {},
          version: '8.0',
          platform: 'ios',
          colorScheme: theme,
          // Telegram's own controls sit above the content in fullscreen.
          safeAreaInset: { top: fullscreen ? 44 : 0, bottom: 0, left: 0, right: 0 },
          contentSafeAreaInset: { top: fullscreen ? 56 : 0, bottom: 0, left: 0, right: 0 },
          isFullscreen: fullscreen,
          isVersionAtLeast: () => true,
          ready: noop,
          expand: noop,
          close: noop,
          requestFullscreen: noop,
          exitFullscreen: noop,
          disableVerticalSwipes: noop,
          setHeaderColor: noop,
          setBackgroundColor: noop,
          setBottomBarColor: noop,
          onEvent: noop,
          offEvent: noop,
          openLink: noop,
          openTelegramLink: noop,
          BackButton: { isVisible: false, show: noop, hide: noop, onClick: noop, offClick: noop },
          HapticFeedback: {
            impactOccurred: noop,
            notificationOccurred: noop,
            selectionChanged: noop,
          },
        },
      }
      // `window.Telegram` is the Mini App's own global; the e2e project does
      // not see its declaration, so assign it without naming the type.
      Object.assign(window, { Telegram: telegram })
      try {
        // The real path the app reads, not just Chromium's prefers-color-scheme.
        localStorage.setItem('minipolya-miniapp-theme', theme as string)
        // The why-us carousel, dismissed, is a separate layout case.
        localStorage.removeItem('minipolya-miniapp-why-us-hidden')
      } catch {
        // Storage blocked: the page still renders in the default theme.
      }
    },
    [theme, fullscreen] as const,
  )

  // index.html loads Telegram's bridge from telegram.org. The stand-in above
  // already provides `window.Telegram`, and the real script would both replace
  // it and hang `load` whenever telegram.org is unreachable — so answer it with
  // an empty script instead of letting it out to the network.
  await page.route(
    (url) => url.hostname === 'telegram.org',
    (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  )

  await page.route(
    (url) => url.hostname.endsWith('tile.openstreetmap.org'),
    (route) => route.abort(),
  )

  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      const method = route.request().method()

      const me = { ...user, language }
      if (path === '/api/auth/telegram') return ok(route, { token: token(), user: me })
      if (path === '/api/users/me') return ok(route, me)
      if (path === '/api/teams/me') return ok(route, teams)
      if (path === '/api/teams/' + MY_TEAM.id) return ok(route, MY_TEAM)
      if (path === '/api/teams/' + OTHER_TEAM.id) return ok(route, OTHER_TEAM)
      if (path === '/api/games/' + GAME_ID) return ok(route, game)
      if (path === '/api/games/' + GAME_ID + '/messages') return ok(route, pageOf(messages))
      if (path === '/api/games/' + GAME_ID + '/join-quote') return ok(route, joinQuote)
      if (path === '/api/cards') return ok(route, cards)
      if (path === '/api/notifications/unread-count') return ok(route, { count: UNREAD })
      if (path === '/api/notifications') return ok(route, pageOf([]))
      if (path === '/api/games/challenges') return ok(route, pageOf(challenges))
      if (path === '/api/stadiums') return ok(route, pageOf(stadiums))
      if (path === '/api/favorites') return ok(route, pageOf([]))

      // Anything unlisted is a fixture gap, not a pass: fail loudly.
      return route.fulfill({
        status: 501,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          data: null,
          message: `e2e fixture missing for ${method} ${path}`,
        }),
      })
    },
  )
}
