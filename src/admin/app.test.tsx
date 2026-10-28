import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getTokenStore } from '../shared/api'
import { restoreSession, startSession } from './auth/session'
import { routes } from './routes'
import { admin, mockBackend, type Reply, renderAt, stats, useAdminTestSetup } from './test-utils'

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

describe('admin panel', () => {
  useAdminTestSetup()

  it('sends a visitor without a session to the login form', async () => {
    await restoreSession()
    const router = renderAt('/')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByText('Admin panel')).toBeInTheDocument()
    expect(screen.getByLabelText('Login')).toBeInTheDocument()
    expect(screen.getByLabelText('Parol')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeInTheDocument()
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
    expect(screen.getByText('48 650 000')).toBeInTheDocument()
    expect(screen.getByText("so'm")).toHaveClass('text-secondary')
    expect(screen.getByText('213')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
    expect(screen.getByText('jami 43')).toBeInTheDocument()
    expect(screen.getByText('Shu hafta')).toBeInTheDocument()
    expect(await screen.findByText('Muvaffaqiyatsiz qaytarishlar')).toBeInTheDocument()
    expect(screen.getByText('eng eskisi 3 soat oldin')).toBeInTheDocument()
    // Four sample comparisons and the sample failed-refund count (R8).
    expect(screen.getAllByText('Namuna')).toHaveLength(5)
    expect(await screen.findByText('eng eskisi 1 kun oldin')).toBeInTheDocument()

    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    expect(within(menu).queryByRole('link', { name: /Arizalar/ })).not.toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: /Maydonlar/ })).toHaveTextContent('2')
    expect(within(menu).getByText('2')).toHaveClass('bg-accent')
    const payments = within(menu).getByRole('link', { name: /Toʻlovlar/ })
    expect(payments).toHaveAttribute('href', '/tolovlar')
    expect(within(payments).getByLabelText('1 ta muvaffaqiyatsiz qaytarish')).toHaveClass(
      'bg-danger',
    )
    // In the design's order: after Bronlar, before the divider and Jurnal.
    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Bosh sahifa',
      'Maydonlar2',
      'Foydalanuvchilar',
      'Bronlar',
      'Toʻlovlar1',
      'Jurnal',
      'Sozlamalar',
    ])
    expect(within(menu).getByRole('link', { name: 'Bosh sahifa' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByText('Aziz Rahimov')).toBeInTheDocument()
  })

  it('opens the related page from each clickable card', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    const router = renderAt('/')
    const kpis = within(await screen.findByRole('region', { name: 'Asosiy koʻrsatkichlar' }))

    expect(kpis.getByRole('link', { name: /Bugungi bronlar/ })).toHaveAttribute('href', '/bronlar')
    expect(kpis.getByRole('link', { name: /Yangi foydalanuvchilar/ })).toHaveAttribute(
      'href',
      '/foydalanuvchilar',
    )
    expect(kpis.getByRole('link', { name: /Faol maydonlar/ })).toHaveAttribute('href', '/maydonlar')
    expect(kpis.getByRole('link', { name: /Shu oy ilova orqali toʻlovlar/ })).toHaveAttribute(
      'href',
      '/tolovlar',
    )
    expect(
      await screen.findByRole('link', { name: /Muvaffaqiyatsiz qaytarishlar/ }),
    ).toHaveAttribute('href', '/tolovlar?tab=qaytarishlar')
    expect(screen.getByRole('link', { name: /Yangi maydonlar/ })).toHaveAttribute(
      'href',
      '/maydonlar',
    )

    fireEvent.click(kpis.getByRole('link', { name: /Faol maydonlar/ }))
    expect(router.state.location.pathname).toBe('/maydonlar')
  })

  it('opens a card from the keyboard: it takes focus and is a real link', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    const router = renderAt('/')
    const card = await screen.findByRole('link', { name: /Bugungi bronlar/ })
    card.focus()
    expect(card).toHaveFocus()
    // Enter on a focused link is the browser's own click; jsdom does not synthesise it.
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.click(card)
    expect(router.state.location.pathname).toBe('/bronlar')
  })

  it('marks the failed-refund tile as danger and opens the refunds tab', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    const router = renderAt('/')
    const tile = await screen.findByRole('link', { name: /Muvaffaqiyatsiz qaytarishlar/ })
    expect(tile.querySelector('.bg-danger-soft')).not.toBeNull()
    expect(within(tile).getByText('Namuna')).toHaveAttribute('title', expect.stringContaining('R8'))
    fireEvent.click(tile)
    expect(router.state.location.pathname).toBe('/tolovlar')
    expect(router.state.location.search).toBe('?tab=qaytarishlar')
  })

  it('animates the cards in one after another', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    renderAt('/')
    await screen.findByText('47')
    expect(screen.getByRole('link', { name: /Bugungi bronlar/ })).toHaveClass('animate-rise')
    const delays = document.querySelectorAll<HTMLElement>('.animate-rise')
    expect([...delays].map((el) => el.style.animationDelay)).toEqual([
      '0ms',
      '25ms',
      '50ms',
      '75ms',
      '100ms',
      '125ms',
    ])
  })

  it('with reduced motion: no entrance animation, no hover lift, no transitions', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    mockBackend(overviewReplies)
    startSession('t', admin)
    renderAt('/')
    await screen.findByText('47')
    expect(document.querySelectorAll('.animate-rise')).toHaveLength(0)
    for (const link of screen.getAllByRole('link', {
      name: /Bugungi|Faol|Muvaffaqiyatsiz|Yangi/,
    })) {
      expect(link.className).not.toMatch(/translate|transition|animate/)
    }
  })

  it('charts all 30 days, with stubs for the zero days and today highlighted', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    renderAt('/')
    await screen.findByText('jami 43')
    expect(screen.getAllByTestId('bar')).toHaveLength(30)
    expect(screen.getAllByTestId('bar-fill')).toHaveLength(2)
    expect(screen.getAllByTestId('bar-stub')).toHaveLength(28)
    const today = screen.getAllByTestId('bar').at(-1)
    expect(today).toHaveAttribute('aria-label', expect.stringMatching(/: 3 ta bron$/))
    const fills = screen.getAllByTestId('bar-fill')
    expect(fills.at(-1)).toHaveAttribute('data-strong', 'true')
    expect(fills[0]).toHaveClass('opacity-45')
  })

  it('shows "everything done" when nothing is waiting', async () => {
    const adapter = await import('./api/sample/adapter')
    vi.spyOn(adapter, 'refundAlerts').mockReturnValue({ failedRefunds: 0 })
    mockBackend({
      ...overviewReplies,
      '/api/admin/stats': [200, { ...stats, pendingStadiumApprovals: 0, pendingStadiums: 0 }],
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

  it('returns to the login page with its own notice when the token was revoked', async () => {
    mockBackend({
      ...overviewReplies,
      '/api/admin/stats': [401, 'Session ended', { code: 'TOKEN_REVOKED' }],
    })
    startSession('t', admin)
    const router = renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Sessiya tugadi, qayta kiring')
    expect(router.state.location.pathname).toBe('/login')
    expect(getTokenStore().get()).toBeNull()
  })

  it('has a "Tez orada" page with breadcrumbs for every other menu item', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    const router = renderAt('/tolovlar')
    expect(screen.getByRole('heading', { name: 'Toʻlovlar' })).toBeInTheDocument()
    expect(screen.getByText('Tez orada')).toBeInTheDocument()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    fireEvent.click(within(crumbs).getByRole('link', { name: 'Bosh sahifa' }))
    expect(router.state.location.pathname).toBe('/')
    for (const path of [
      '/maydonlar',
      '/foydalanuvchilar',
      '/bronlar',
      '/tolovlar',
      '/sozlamalar',
    ]) {
      expect(routes[1]?.children?.[0]?.children?.some((r) => r.path === path)).toBe(true)
    }
  })

  it('has no Arizalar section any more', async () => {
    mockBackend(overviewReplies)
    startSession('t', admin)
    const router = renderAt('/arizalar')
    expect(router.state.location.pathname).toBe('/')
  })
})
