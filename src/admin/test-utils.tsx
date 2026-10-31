/** Shared helpers for the admin panel's page tests. Test-only: nothing in the app imports it. */
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../shared/api'
import { MISSING_ENDPOINTS } from './api/missing'
import type { PlatformStats, User } from './api/types'
import { logout, resetSessionForTests, startSession, unauthorizedReason } from './auth/session'
import { ToastProvider } from './components/Toast'
import { queryClient } from './queryClient'
import { routes } from './routes'

export const admin: User = {
  id: 'u1',
  name: 'Aziz Rahimov',
  language: 'uz',
  isOwner: false,
  isAdmin: true,
  createdAt: '2026-10-01T10:00:00Z',
}

export const stats: PlatformStats = {
  totalUsers: 900,
  totalOwners: 40,
  newUsersToday: 3,
  newUsersThisWeek: 150,
  newUsersLast7Days: 213,
  newUsersThisMonth: 500,
  totalStadiums: 45,
  approvedStadiums: 38,
  pendingStadiums: 2,
  blockedStadiums: 5,
  rejectedStadiums: 1,
  totalBookings: 5000,
  todayBookings: 47,
  weekBookings: 300,
  monthBookings: 1200,
  totalRevenue: 0,
  todayRevenue: 0,
  weekRevenue: 0,
  monthRevenue: 4_865_000_000,
  totalGames: 10,
  activeGames: 2,
  pendingOwnerApplications: 0,
  pendingStadiumApprovals: 2,
  todayBookingsLastWeek: 42,
  previousMonthRevenueToDate: 4_500_000_000,
  newUsersPrevious7Days: 222,
  approvedStadiumsWeekAgo: 38,
  failedRefunds: 0,
}

/** `data` is the payload on success and the message on an error. */
export type Reply = readonly [
  status: number,
  data: unknown,
  error?: { code?: string; data?: unknown },
]

export interface Request {
  method: string
  url: URL
  body?: unknown
}

/**
 * Answers API calls through the real API client. Keys are a path
 * ("/api/admin/stats") or a method and path ("PUT /api/admin/settings");
 * a function gets the request, so a test can answer by query or body.
 * Unknown paths answer 404. `requests` lists every call made.
 */
export function mockBackend(replies: Record<string, Reply | ((request: Request) => Reply)>) {
  const requests: Request[] = []
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input)
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined
    const request = { method, url, body }
    requests.push(request)
    const entry = replies[`${method} ${url.pathname}`] ?? replies[url.pathname]
    const [status, data, error] =
      typeof entry === 'function' ? entry(request) : (entry ?? [404, 'Not found'])
    const ok = status < 400
    return new Response(
      JSON.stringify({
        success: ok,
        data: ok ? data : (error?.data ?? null),
        message: ok ? null : String(data),
        ...(error?.code && { code: error.code }),
      }),
      { status, headers: { 'Content-Type': 'application/json' } },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, requests }
}

/** A `PageResponse` holding `content` as its only page. */
export function page<T>(content: T[], totalElements = content.length) {
  return { content, page: 0, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) }
}

export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

/** Signs in as `admin` with a fresh query cache and API client, and cleans up after. */
export function useAdminTestSetup() {
  beforeEach(() => {
    resetSessionForTests()
    queryClient.clear()
    configureApiClient({
      tokenStore: createMemoryTokenStore(),
      // As in main.tsx.
      onUnauthorized: (error) => logout(unauthorizedReason(error)),
      onAccountBlocked: () => logout('blocked'),
    })
  })

  afterEach(() => {
    for (const endpoint of Object.keys(MISSING_ENDPOINTS)) delete MISSING_ENDPOINTS[endpoint]
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })
}

export function signIn(user: User = admin) {
  startSession('t', user)
}

/**
 * Puts endpoints on the missing list for one test, as if the backend had not
 * shipped them (`useAdminTestSetup` empties the list after each test).
 */
export function markMissing(...endpoints: string[]) {
  for (const endpoint of endpoints) MISSING_ENDPOINTS[endpoint] = 'R?'
}
