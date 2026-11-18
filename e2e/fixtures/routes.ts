import type { Page, Route } from '@playwright/test'
import * as fix from './data'

/**
 * Every `/api` call the admin panel makes, answered from fixtures.
 *
 * Why fixtures and not a real sign-in: a live run needs the backend, Postgres
 * and a DB-created admin, and it silently SKIPS a detail page when no such
 * record exists — precisely the page most likely to be broken. Fixtures also
 * let the data be hostile on purpose (see `data.ts`).
 */

/** The envelope every backend response uses. */
function ok(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data, message: null }),
  })
}

/** A 1×1 transparent PNG, so a gallery image has a real decoded box. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * A token whose payload says `isAdmin`, for the client's own JWT reading
 * (`readJwtClaims` / `isJwtExpired`). The signature is never checked in the
 * browser, and every request is intercepted anyway.
 */
function fakeToken(): string {
  const b64 = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url').replace(/=+$/, '')
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: fix.admin.id,
    isAdmin: true,
    isOwner: false,
    // Far in the future, so nothing decides the session has expired.
    exp: Math.floor(Date.UTC(2099, 0, 1) / 1000),
  }
  return `${b64(header)}.${b64(payload)}.e2e-not-a-real-signature`
}

export interface FixtureOptions {
  /** Every list answers an empty page, so the empty states are measured too. */
  empty?: boolean
}

export async function installFixtures(page: Page, options: FixtureOptions = {}): Promise<void> {
  const { empty = false } = options
  const list = <T>(rows: T[]) => fix.page(empty ? [] : rows)

  // Map tiles: no network, no flake.
  await page.route(
    (url) => url.hostname.endsWith('tile.openstreetmap.org'),
    (route) => route.abort(),
  )

  // A PREDICATE, not a glob: `**/api/**` also matches Vite's own module URLs
  // in dev (`/src/shared/api/index.ts`, `/src/admin/api/users.ts`), which
  // intercepts the app's own source and stops it booting at all.
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      const method = route.request().method()

      // Uploaded photos: a real PNG, so a gallery image has a decoded box.
      if (path.startsWith('/api/uploads/'))
        return route.fulfill({ status: 200, contentType: 'image/png', body: PNG })

      // ---- auth ----
      if (path === '/api/auth/admin/login')
        return ok(route, { token: fakeToken(), user: fix.admin })
      if (path === '/api/users/me') return ok(route, fix.admin)

      // ---- stats ----
      if (path === '/api/admin/stats') return ok(route, fix.stats)
      if (path === '/api/admin/stats/bookings-daily') return ok(route, fix.dailyBookings)

      // ---- settings ----
      if (path === '/api/admin/settings') return ok(route, fix.settings)

      // ---- stadiums ----
      if (path === '/api/admin/stadiums') return ok(route, list(fix.stadiumRows))
      if (/^\/api\/admin\/stadiums\/[^/]+\/notes$/.test(path))
        return ok(route, method === 'POST' ? fix.notes[0] : empty ? [] : fix.notes)
      if (/^\/api\/admin\/stadiums\/[^/]+\/(status|booking-terms)$/.test(path))
        return ok(route, fix.stadium)
      if (/^\/api\/admin\/stadiums\/[^/]+$/.test(path)) return ok(route, fix.stadium)

      // ---- users ----
      if (path === '/api/admin/users') return ok(route, list(fix.userRows))
      if (/^\/api\/admin\/users\/[^/]+\/teams$/.test(path)) return ok(route, empty ? [] : fix.teams)
      if (/^\/api\/admin\/users\/[^/]+\/legal-details$/.test(path))
        return ok(route, fix.legalDetails)
      if (/^\/api\/admin\/users\/[^/]+$/.test(path)) return ok(route, fix.user)

      // ---- bookings and games ----
      if (path === '/api/admin/bookings') return ok(route, list(fix.bookingRows))
      if (/^\/api\/admin\/bookings\/[^/]+\/remainder-mark$/.test(path))
        return ok(route, fix.booking)
      if (/^\/api\/admin\/bookings\/[^/]+$/.test(path)) return ok(route, fix.booking)
      if (path === '/api/admin/games') return ok(route, list(fix.gameRows))
      if (/^\/api\/admin\/games\/[^/]+\/remainder-mark$/.test(path)) return ok(route, fix.game)
      if (/^\/api\/admin\/games\/[^/]+$/.test(path)) return ok(route, fix.game)

      // ---- payments ----
      if (path === '/api/admin/payments') return ok(route, list(fix.paymentRows))
      if (path === '/api/admin/payments/summary') return ok(route, fix.paymentSummary)
      if (/^\/api\/admin\/payments\/[^/]+\/(retry-refund|mark-refunded)$/.test(path))
        return ok(route, fix.payment)
      if (/^\/api\/admin\/payments\/[^/]+$/.test(path)) return ok(route, fix.payment)

      // ---- audit log ----
      if (path === '/api/admin/audit-log/actions')
        return ok(route, ['USER_BLOCKED', 'STADIUM_APPROVED', 'PLATFORM_SETTINGS_CHANGED'])
      if (path === '/api/admin/audit-log') {
        const settingsOnly = url.searchParams
          .getAll('actions')
          .some((action) => action.startsWith('PLATFORM_'))
        return ok(route, list(settingsOnly ? fix.settingsAudit : fix.auditEntries))
      }

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

/**
 * Puts the admin token and the theme in `localStorage` before the first script
 * runs, so `RequireAdmin` lets the page through without the login form and
 * `initAdminTheme()` reads the theme the project asked for — the real path,
 * not just Chromium's `prefers-color-scheme`.
 */
export async function signIn(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript(
    ([token, theme]) => {
      try {
        localStorage.setItem('minipolya-admin-token', token as string)
        localStorage.setItem('minipolya-admin-theme', theme as string)
      } catch {
        // A private window with storage blocked: the page still renders.
      }
    },
    [fakeToken(), theme] as const,
  )
}
