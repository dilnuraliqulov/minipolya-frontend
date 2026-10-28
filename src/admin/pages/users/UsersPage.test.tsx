import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import type { AdminUser } from '../../api/users'
import {
  admin,
  mockBackend,
  page,
  renderAt,
  type Reply,
  type Request,
  signIn,
  stats,
  useAdminTestSetup,
} from '../../test-utils'

const player: AdminUser = {
  id: 'p1',
  name: 'Bekzod Rahmatov',
  phone: '+998 93 210 98 76',
  telegramId: 123456,
  language: 'uz',
  isOwner: false,
  isAdmin: false,
  isBlocked: false,
  bookingCount: 6,
  stadiumCount: 0,
  createdAt: '2026-10-10T13:42:00Z',
}
const owner: AdminUser = {
  ...player,
  id: 'o1',
  name: 'Jamshid Karimov',
  isOwner: true,
  stadiumCount: 1,
}
const blocked: AdminUser = { ...player, id: 'b1', name: 'Umid Karimov', isBlocked: true }
const self: AdminUser = { ...player, id: admin.id, name: admin.name, isAdmin: true }

const blockEntry: AuditEntry = {
  id: 'e1',
  time: '2026-10-22T13:30:00Z',
  actor: { id: 'u2', name: 'Dilnoza Karimova', type: 'ADMIN' },
  action: 'USER_BLOCKED',
  entity: { type: 'user', id: 'b1', label: 'Umid Karimov' },
  changes: [{ field: 'isBlocked', oldValue: false, newValue: true }],
  reason: 'Koʻp bekor qilishlar',
}

function backend(extra: Record<string, Reply | ((r: Request) => Reply)> = {}) {
  return mockBackend({
    '/api/admin/stats': [200, stats],
    '/api/admin/users': [200, page([self, player, owner, blocked], 1284)],
    '/api/admin/users/p1': [200, player],
    '/api/admin/users/o1': [200, owner],
    '/api/admin/users/b1': [200, blocked],
    [`/api/admin/users/${admin.id}`]: [200, self],
    '/api/admin/audit-log': (request) =>
      request.url.searchParams.get('entityId') === 'b1'
        ? [200, page([blockEntry])]
        : [200, page([])],
    '/api/admin/stadiums': [200, page([])],
    ...extra,
  })
}

const lastList = (requests: Request[]) =>
  requests.filter((r) => r.url.pathname === '/api/admin/users').at(-1)!.url.searchParams

describe('Foydalanuvchilar — list', () => {
  useAdminTestSetup()

  it('lists users with phone, role badges, registration date and status', async () => {
    backend()
    signIn()
    renderAt('/foydalanuvchilar')
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('Bekzod Rahmatov')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Foydalanuvchilar · 1 284',
      ),
    )
    const row = within(table).getByText('Jamshid Karimov').closest('tr')!
    expect(within(row).getByText('Maydon egasi')).toBeInTheDocument()
    expect(within(row).getByText('+998 93 210 98 76')).toBeInTheDocument()
    expect(within(row).getByText('10.10.2026')).toBeInTheDocument()
    expect(within(row).getByText('Faol')).toHaveClass('text-success')
    const adminRow = within(table).getByText(admin.name).closest('tr')!
    expect(within(adminRow).getByText('Admin')).toHaveClass('text-link')
    const blockedRow = within(table).getByText('Umid Karimov').closest('tr')!
    expect(within(blockedRow).getByText('Bloklangan')).toHaveClass('text-danger')
    expect(within(blockedRow).getByText('Oʻyinchi')).toBeInTheDocument()
  })

  it('searches by name or phone and filters by role and status', async () => {
    const { requests } = backend()
    signIn()
    const router = renderAt('/foydalanuvchilar')
    await screen.findByText('Bekzod Rahmatov')
    fireEvent.change(screen.getByLabelText('Ism yoki telefon boʻyicha qidirish'), {
      target: { value: '93 210' },
    })
    await waitFor(() => expect(lastList(requests).get('search')).toBe('93 210'))

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'owner' } })
    await waitFor(() => expect(lastList(requests).get('role')).toBe('owner'))
    // Until R13 ships, development narrows the page itself.
    await waitFor(() => expect(screen.queryByText('Bekzod Rahmatov')).not.toBeInTheDocument())
    expect(screen.getByText('Jamshid Karimov')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'blocked' } })
    await waitFor(() => expect(lastList(requests).get('status')).toBe('blocked'))
    await waitFor(() => expect(screen.queryByText('Jamshid Karimov')).not.toBeInTheDocument())
    expect(screen.getByText('Umid Karimov')).toBeInTheDocument()
    expect(router.state.location.search).toContain('holat=blocked')

    fireEvent.click(screen.getByRole('button', { name: 'Tozalash' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('opens a user from the list', async () => {
    backend()
    signIn()
    const router = renderAt('/foydalanuvchilar')
    fireEvent.click(await screen.findByText('Bekzod Rahmatov'))
    expect(router.state.location.pathname).toBe('/foydalanuvchilar/p1')
  })

  it('shows "no result" and an error with retry', async () => {
    let fail = false
    backend({
      '/api/admin/users': () => (fail ? [500, 'boom'] : [200, page([])]),
    })
    signIn()
    renderAt('/foydalanuvchilar?q=zzz')
    expect(await screen.findByText('Hech kim topilmadi')).toBeInTheDocument()
    fail = true
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'active' } })
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})

describe('Foydalanuvchilar — detail', () => {
  useAdminTestSetup()

  it('shows the summary, the bookings tab (sample) and the teams tab when there are teams', async () => {
    backend()
    signIn()
    renderAt('/foydalanuvchilar/p1')
    expect(
      await screen.findByRole('heading', { level: 1, name: /Bekzod Rahmatov/ }),
    ).toBeInTheDocument()
    const summary = screen.getByRole('region', { name: 'Maʼlumotlar' })
    expect(within(summary).getByRole('link', { name: /\+998 93 210 98 76/ })).toHaveAttribute(
      'href',
      'tel:+998932109876',
    )
    expect(within(summary).getByText('123456')).toBeInTheDocument()
    const tabs = screen.getByRole('tablist')
    expect(within(tabs).getByRole('tab', { name: /Bronlar/ })).toHaveTextContent('6')
    expect(within(tabs).queryByRole('tab', { name: /Maydonlar/ })).not.toBeInTheDocument()
    // Booking rows link to the stadium and open the booking.
    const stadiumLinks = await screen.findAllByRole('link', { name: /Arena|Futsal|Sport|Stadion/ })
    expect(stadiumLinks[0]).toHaveAttribute('href', expect.stringMatching(/^\/maydonlar\//))
  })

  it('shows the Maydonlar tab for an owner', async () => {
    backend()
    signIn()
    renderAt('/foydalanuvchilar/o1')
    fireEvent.click(await screen.findByRole('tab', { name: /Maydonlar/ }))
    expect(await screen.findByText('Maydonlar yoʻq')).toBeInTheDocument()
  })

  it('blocks with a reason, warning that the user cannot use the app', async () => {
    const { requests } = backend({
      'PUT /api/admin/users/p1': [200, { ...player, isBlocked: true }],
    })
    signIn()
    renderAt('/foydalanuvchilar/p1')
    fireEvent.click(await screen.findByRole('button', { name: 'Bloklash' }))
    const dialog = screen.getByRole('dialog', { name: 'Foydalanuvchini bloklash' })
    expect(dialog).toHaveTextContent('Foydalanuvchi ilovaga kira olmaydi')
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Firibgarlik: soxta toʻlovlar' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bloklash' }))
    expect(await screen.findByText('Foydalanuvchi bloklandi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({
      isBlocked: true,
      reason: 'Firibgarlik: soxta toʻlovlar',
    })
  })

  it('shows who blocked a user, when and why, and unblocks', async () => {
    const { requests } = backend({
      'PUT /api/admin/users/b1': [200, { ...blocked, isBlocked: false }],
    })
    signIn()
    renderAt('/foydalanuvchilar/b1')
    const panel = await screen.findByRole('region', { name: 'Qaror' })
    expect(await within(panel).findByText('Koʻp bekor qilishlar')).toBeInTheDocument()
    expect(within(panel).getByText('22.10.2026 18:30')).toBeInTheDocument()
    expect(within(panel).getByText('Dilnoza Karimova')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Blokdan chiqarish' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Blokdan chiqarish' }),
    )
    expect(await screen.findByText('Foydalanuvchi blokdan chiqarildi')).toBeInTheDocument()
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ isBlocked: false })
    // The history is the audit log for this user.
    expect(
      requests.some(
        (r) =>
          r.url.searchParams.get('entityType') === 'user' &&
          r.url.searchParams.get('entityId') === 'b1',
      ),
    ).toBe(true)
  })

  it('has no block button on the admin’s own page', async () => {
    backend()
    signIn()
    renderAt(`/foydalanuvchilar/${admin.id}`)
    expect(await screen.findByText('Bu sizning hisobingiz')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bloklash' })).not.toBeInTheDocument()
  })

  it('says when the user does not exist', async () => {
    backend({ '/api/admin/users/nope': [404, 'User not found'] })
    signIn()
    renderAt('/foydalanuvchilar/nope')
    expect(await screen.findByText('Foydalanuvchi topilmadi')).toBeInTheDocument()
  })
})
