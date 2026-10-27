import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore, getTokenStore } from '../shared/api'
import type { PlatformStats, User } from './api/types'
import { logout, resetSessionForTests, restoreSession, startSession } from './auth/session'
import { ToastProvider } from './components/Toast'
import { queryClient } from './queryClient'
import { routes } from './routes'

const admin: User = {
  id: 'u1',
  name: 'Aziz Rahimov',
  language: 'uz',
  isOwner: false,
  isAdmin: true,
  createdAt: '2026-10-01T10:00:00Z',
}

const stats: PlatformStats = {
  totalUsers: 900,
  totalOwners: 40,
  newUsersToday: 3,
  newUsersThisWeek: 213,
  newUsersThisMonth: 500,
  totalStadiums: 45,
  approvedStadiums: 38,
  pendingStadiums: 2,
  blockedStadiums: 5,
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
  pendingOwnerApplications: 4,
  pendingStadiumApprovals: 2,
}

type Reply = [status: number, data: unknown]

/** Answers API calls by path, through the real API client. */
function mockBackend(replies: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn(async (input: string) => {
    const path = new URL(input).pathname
    const entry = replies[path]
    const [status, data] = typeof entry === 'function' ? entry() : (entry ?? [404, null])
    const ok = status < 400
    return new Response(
      JSON.stringify({ success: ok, data: ok ? data : null, message: ok ? null : String(data) }),
      { status, headers: { 'Content-Type': 'application/json' } },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const today = new Date()
const isoDate = (daysAgo: number) =>
  new Date(today.getTime() - daysAgo * 86_400_000 + 5 * 3_600_000).toISOString().slice(0, 10)

const overviewReplies: Record<string, Reply> = {
  '/api/admin/stats': [200, stats],
  '/api/admin/stats/revenue': [
    200,
    {
      dailyRevenue: [
        { date: isoDate(1), revenue: 100, bookingCount: 40 },
        { date: isoDate(0), revenue: 100, bookingCount: 3 },
      ],
    },
  ],
  '/api/admin/owner-applications/pending': [
    200,
    {
      content: [{ id: 'a1', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() }],
      page: 0,
      size: 1,
      totalElements: 4,
      totalPages: 4,
    },
  ],
  '/api/admin/stadiums': [
    200,
    {
      content: [{ id: 's1', createdAt: new Date(Date.now() - 86_400_000 - 60_000).toISOString() }],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
    },
  ],
}

function renderAt(path: string) {
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

describe('admin panel', () => {
  beforeEach(() => {
    resetSessionForTests()
    queryClient.clear()
    configureApiClient({
      tokenStore: createMemoryTokenStore(),
      onUnauthorized: () => logout('expired'),
      onAccountBlocked: () => logout('blocked'),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('sends a visitor without a session to the login page, with the dev login in development', async () => {
    await restoreSession()
    const router = renderAt('/')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByText('Admin panel')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Dev login' })).toBeInTheDocument()
  })

  it('logs in with the dev login and opens the overview', async () => {
    vi.stubEnv('VITE_DEV_INIT_DATA', 'auth_date=1&user=%7B%7D&hash=abc')
    const fetchMock = mockBackend({
      '/api/auth/telegram': [200, { token: 'x.e30.y', user: admin }],
      ...overviewReplies,
    })
    await restoreSession()
    const router = renderAt('/login')
    fireEvent.click(await screen.findByRole('button', { name: 'Dev login' }))

    expect(await screen.findByRole('heading', { name: 'Bosh sahifa' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(getTokenStore().get()).toBe('x.e30.y')
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.body).toBe(JSON.stringify({ initData: 'auth_date=1&user=%7B%7D&hash=abc' }))
  })

  it('shows the no-access page to a user who is not an admin', async () => {
    startSession('t', { ...admin, name: 'Bobur Nazarov', isAdmin: false })
    const router = renderAt('/')
    expect(screen.getByRole('heading', { name: 'Sizda kirish huquqi yoʻq' })).toBeInTheDocument()
    expect(screen.getByText('Bobur Nazarov')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chiqish' }))
    expect(getTokenStore().get()).toBeNull()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('shows the overview with real numbers and marks the sample ones', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    renderAt('/')

    expect(await screen.findByText('47')).toBeInTheDocument()
    expect(screen.getByText("48 650 000 so'm")).toBeInTheDocument()
    expect(screen.getByText('213')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
    expect(screen.getAllByText('Namuna')).toHaveLength(4)
    expect(screen.getByText('jami 43')).toBeInTheDocument()
    expect(screen.getAllByTestId('bar')).toHaveLength(30)
    expect(await screen.findByText('eng eskisi 2 kun oldin')).toBeInTheDocument()
    expect(await screen.findByText('eng eskisi 1 kun oldin')).toBeInTheDocument()

    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    expect(within(menu).getByRole('link', { name: /Arizalar/ })).toHaveTextContent('4')
    expect(within(menu).getByRole('link', { name: /Maydonlar/ })).toHaveTextContent('2')
    expect(within(menu).getByRole('link', { name: 'Bosh sahifa' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('Aziz Rahimov')).toBeInTheDocument()
  })

  it('shows "everything done" when nothing is waiting', async () => {
    mockBackend({
      ...overviewReplies,
      '/api/admin/stats': [
        200,
        { ...stats, pendingOwnerApplications: 0, pendingStadiumApprovals: 0, pendingStadiums: 0 },
      ],
    })
    startSession('t', admin)
    renderAt('/')
    expect(await screen.findByText('Hammasi bajarilgan, kutilayotgan ish yoʻq')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Koʻrib chiqish' })).not.toBeInTheDocument()
  })

  it('shows an error with a working retry', async () => {
    let fail = true
    mockBackend({
      ...overviewReplies,
      '/api/admin/stats': () => (fail ? [400, 'boom'] : [200, stats]),
    })
    startSession('t', admin)
    renderAt('/')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Maʼlumotlarni yuklab boʻlmadi')
    fail = false
    fireEvent.click(within(alert).getByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByText('47')).toBeInTheDocument()
  })

  it('returns to the login page on any 401', async () => {
    mockBackend({ ...overviewReplies, '/api/admin/stats': [401, 'Authentication required'] })
    startSession('t', admin)
    const router = renderAt('/')
    expect(await screen.findByText('Sessiya tugadi. Qaytadan kiring.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(getTokenStore().get()).toBeNull()
  })

  it('has a "Tez orada" page with breadcrumbs for every other menu item', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    const router = renderAt('/jurnal')
    expect(screen.getByRole('heading', { name: 'Jurnal' })).toBeInTheDocument()
    expect(screen.getByText('Tez orada')).toBeInTheDocument()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    fireEvent.click(within(crumbs).getByRole('link', { name: 'Bosh sahifa' }))
    expect(router.state.location.pathname).toBe('/')
    for (const path of [
      '/arizalar',
      '/maydonlar',
      '/foydalanuvchilar',
      '/bronlar',
      '/sozlamalar',
    ]) {
      expect(routes[1]?.children?.[0]?.children?.some((r) => r.path === path)).toBe(true)
    }
  })
})
