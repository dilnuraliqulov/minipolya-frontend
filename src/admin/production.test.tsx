/**
 * The panel as a production build sees it: sample data switched off. Missing
 * endpoints must show "Tez orada" or nothing — never made-up values.
 */
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { availability, MISSING_ENDPOINTS, NotAvailableError, viaSample } from './api/missing'
import {
  mockBackend,
  page,
  type Reply,
  renderAt,
  signIn,
  stats,
  useAdminTestSetup,
} from './test-utils'

vi.mock('./api/sample', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/sample')>()),
  SHOW_SAMPLE_DATA: false,
}))

const overviewReplies: Record<string, Reply> = {
  '/api/admin/stats': [200, stats],
  '/api/admin/stats/revenue': [200, { dailyRevenue: [] }],
  '/api/admin/stadiums': [200, { content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 }],
}

describe('production build (no sample data)', () => {
  useAdminTestSetup()

  it('marks every missing endpoint as "Tez orada" and never calls the adapter', async () => {
    for (const endpoint of Object.keys(MISSING_ENDPOINTS)) {
      expect(availability(endpoint)).toBe('soon')
    }
    const real = vi.fn()
    const sample = vi.fn()
    const endpoint = Object.keys(MISSING_ENDPOINTS)[0]!
    await expect(viaSample(endpoint, real, sample)).rejects.toBeInstanceOf(NotAvailableError)
    expect(real).not.toHaveBeenCalled()
    expect(sample).not.toHaveBeenCalled()
  })

  it('shows no sample values on the overview: no comparisons, no failed-refund tile or badge', async () => {
    const { requests } = mockBackend({ ...overviewReplies })
    signIn()
    renderAt('/')
    expect(await screen.findByText('47')).toBeInTheDocument()
    expect(screen.queryByText('Namuna')).not.toBeInTheDocument()
    expect(screen.queryByText('Muvaffaqiyatsiz qaytarishlar')).not.toBeInTheDocument()
    expect(screen.getByText('Yangi maydonlar')).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    expect(within(menu).getByRole('link', { name: 'Toʻlovlar' })).toBeInTheDocument()
    // Only real endpoints were called.
    expect(requests.every((r) => r.url.pathname.startsWith('/api/admin/'))).toBe(true)
  })

  const stadium = {
    id: 's1',
    name: 'Chilonzor Arena',
    address: 'Chilonzor tumani, 12',
    ownerName: 'Jamshid Karimov',
    ownerId: 'o1',
    status: 'pending',
    format: '5x5',
    surfaceType: 'artificial',
    averageRating: 0,
    reviewCount: 0,
    totalBookings: 0,
    totalRevenue: 0,
    createdAt: '2026-10-27T10:00:00Z',
  }
  const stadiumReplies: Record<string, Reply> = {
    '/api/admin/stats': [200, stats],
    '/api/admin/stadiums': [200, page([stadium])],
    '/api/admin/stadiums/s1': [200, stadium],
    '/api/admin/users/o1': [
      200,
      { id: 'o1', name: 'Jamshid Karimov', createdAt: '2026-02-14T07:00:00Z', bookingCount: 6 },
    ],
    '/api/admin/audit-log': [200, page([])],
  }

  it('Maydonlar: hides the sample columns, disables the missing filters, "Tez orada" for rejected', async () => {
    mockBackend(stadiumReplies)
    signIn()
    renderAt('/maydonlar')
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('Chilonzor Arena')).toBeInTheDocument()
    for (const header of ['Tuman', 'Narx', 'ATMOS']) {
      expect(within(table).queryByText(header)).not.toBeInTheDocument()
    }
    expect(screen.queryByLabelText('Tuman')).not.toBeInTheDocument()
    expect(screen.getAllByTitle('Tez orada')).toHaveLength(2)
    expect(screen.queryByText('Namuna')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Rad etilgan/ }))
    expect(await screen.findByText('Tez orada', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('stadium detail: real parts shown, missing sections "Tez orada", approve still possible', async () => {
    const { requests } = mockBackend(stadiumReplies)
    signIn()
    renderAt('/maydonlar/s1')
    expect(await screen.findByText('Chilonzor tumani, 12')).toBeInTheDocument()
    for (const title of ['Rasmlar', 'Narxlar', 'Bron shartlari']) {
      expect(
        within(screen.getByRole('region', { name: title })).getByText('Tez orada'),
      ).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Izoh qoʻshish' })).toBeDisabled()
    expect(screen.queryByText('Namuna')).not.toBeInTheDocument()
    expect(requests.some((r) => r.url.pathname.includes('notes'))).toBe(false)
    expect(requests.some((r) => r.url.pathname.includes('legal-details'))).toBe(false)
  })

  const user = {
    id: 'p1',
    name: 'Bekzod Rahmatov',
    language: 'uz',
    isOwner: false,
    isAdmin: false,
    isBlocked: false,
    bookingCount: 6,
    stadiumCount: 0,
    createdAt: '2026-10-10T13:42:00Z',
  }

  it('Foydalanuvchilar: role and status filters "Tez orada"; bookings tab "Tez orada"; blocking works', async () => {
    const { requests } = mockBackend({
      '/api/admin/stats': [200, stats],
      '/api/admin/users': [200, page([user])],
      '/api/admin/users/p1': [200, user],
      '/api/admin/audit-log': [200, page([])],
    })
    signIn()
    renderAt('/foydalanuvchilar')
    expect(await screen.findByText('Bekzod Rahmatov')).toBeInTheDocument()
    expect(screen.queryByLabelText('Rol')).not.toBeInTheDocument()
    expect(screen.getAllByTitle('Tez orada')).toHaveLength(2)

    fireEvent.click(screen.getByText('Bekzod Rahmatov'))
    expect(await screen.findByText('Tez orada', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloklash' })).toBeEnabled()
    expect(screen.queryByRole('tab', { name: /Jamoalar/ })).not.toBeInTheDocument()
    expect(requests.some((r) => r.url.pathname.includes('bookings'))).toBe(false)
  })

  it('Bronlar: both tabs "Tez orada", no request to the missing endpoints', async () => {
    const { requests } = mockBackend({ '/api/admin/stats': [200, stats] })
    signIn()
    renderAt('/bronlar?bron=b1')
    expect(await screen.findByText('Tez orada', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Oʻyinlar' }))
    expect(await screen.findByText('Tez orada', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(requests.some((r) => /bookings|games/.test(r.url.pathname))).toBe(false)
  })

  it('Toʻlovlar: summary and list "Tez orada", no failed-refund badge, no panel', async () => {
    const { requests } = mockBackend({ '/api/admin/stats': [200, stats] })
    signIn()
    renderAt('/tolovlar?tolov=p1')
    const summary = await screen.findByRole('region', { name: 'Umumiy koʻrsatkichlar' })
    expect(within(summary).getByText('Tez orada')).toBeInTheDocument()
    expect(screen.getAllByText('Tez orada', { selector: 'p' })).toHaveLength(2)
    expect(within(screen.getByRole('tab', { name: /Qaytarishlar/ })).queryByText(/\d/)).toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(requests.some((r) => r.url.pathname.includes('payments'))).toBe(false)
  })
})
