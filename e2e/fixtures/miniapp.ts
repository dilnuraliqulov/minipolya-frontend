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
}

/**
 * Installs a stand-in for `window.Telegram.WebApp` (so the session can sign in
 * with initData), the chosen theme, and every `/api` call the home page makes.
 */
export async function installMiniapp(page: Page, options: MiniappOptions): Promise<void> {
  const { theme, fullscreen = false } = options

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

      if (path === '/api/auth/telegram') return ok(route, { token: token(), user })
      if (path === '/api/users/me') return ok(route, user)
      if (path === '/api/notifications/unread-count') return ok(route, { count: UNREAD })
      if (path === '/api/notifications') return ok(route, pageOf([]))
      if (path === '/api/games/challenges') return ok(route, pageOf([]))
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
