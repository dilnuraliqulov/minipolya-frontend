import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEntry } from '../../api/audit'
import {
  BOOKINGS_LIST,
  GAMES_LIST,
  type AdminBooking,
  type AdminGameDetail,
} from '../../api/bookings'
import {
  markMissing,
  mockBackend,
  page,
  renderAt,
  type Reply,
  type Request,
  signIn,
  stats,
  useAdminTestSetup,
} from '../../test-utils'

const booking: AdminBooking = {
  id: 'b1',
  stadiumId: 'st1',
  stadiumName: 'Chilonzor Arena',
  userId: 'u7',
  userName: 'Sardor Aliyev',
  userPhone: '+998 90 111 22 33',
  source: 'app',
  status: 'completed',
  startsAt: '2026-10-22T15:00:00Z',
  endsAt: '2026-10-22T17:00:00Z',
  durationHours: 2,
  // The owner's price is 150 000 so'm; the player pays 155 000: 55 000 in the
  // app, 100 000 in cash.
  price: 15_500_000,
  ownerPrice: 15_000_000,
  paidAmount: 15_500_000,
  remainingAmount: 0,
  paymentStatus: 'paid',
  paidInApp: 5_500_000,
  ownerReceives: 15_417_500,
  atmosFee: 82_500,
  cashReceived: 10_000_000,
  cashReceivedAt: '2026-10-22T15:10:00Z',
  isWalkin: false,
  createdAt: '2026-10-20T09:02:00Z',
}
const walkIn: AdminBooking = {
  ...booking,
  id: 'b2',
  userId: undefined,
  userName: undefined,
  userPhone: undefined,
  clientName: 'Anvar aka',
  clientPhone: '+998 97 654 32 10',
  isWalkin: true,
  source: 'manual',
  status: 'cancelled_by_owner',
  price: 20_000_000,
  ownerPrice: 20_000_000,
  paidAmount: 0,
  paidInApp: 0,
  ownerReceives: 0,
  atmosFee: 0,
  cashReceived: undefined,
  remainingAmount: 20_000_000,
  cancellationReason: 'Maydonda taʼmirlash ishlari',
}
const teamGame: AdminGameDetail = {
  id: 'g1',
  type: 'team_vs_team',
  status: 'completed',
  stadiumId: 'st1',
  stadiumName: 'Chilonzor Arena',
  startsAt: '2026-10-22T15:00:00Z',
  endsAt: '2026-10-22T16:00:00Z',
  totalPrice: 20_000_000,
  creatorId: 'u1',
  creatorName: 'Bekzod Rahmatov',
  teamAName: 'Chilonzor Lions',
  teamBName: 'Yunusobod Tigers',
  createdAt: '2026-10-18T06:20:00Z',
  teams: (['a', 'b'] as const).map((side) => ({
    side,
    teamId: `t-${side}`,
    teamName: side === 'a' ? 'Chilonzor Lions' : 'Yunusobod Tigers',
    leaderId: side === 'a' ? 'u1' : 'u2',
    leaderName: side === 'a' ? 'Bekzod Rahmatov' : 'Jasur Nazarov',
    price: 5_100_000,
    platformFee: 2_500_000,
    ownerAdvance: 2_500_000,
    ownerRemainder: 7_500_000,
    ownerReceives: 9_850_000,
    atmosFee: 150_000,
    remainderAmount: 0,
    remainderStatus: 'paid' as const,
    paidInApp: 10_000_000,
    players: [{ userId: 'u3', userName: 'Umid Karimov', status: 'joined' }],
  })),
}
const waiting: AdminGameDetail = {
  ...teamGame,
  id: 'g2',
  status: 'open',
  teamBName: undefined,
  teams: teamGame.teams!.slice(0, 1),
}
const casual: AdminGameDetail = {
  ...teamGame,
  id: 'g3',
  type: 'casual',
  status: 'confirmed',
  teamAName: undefined,
  teamBName: undefined,
  teams: undefined,
  participants: [{ userId: 'u1', userName: 'Bekzod Rahmatov', status: 'paid' }],
  serviceFeePerPerson: 500_000,
}

const confirmed: AuditEntry = {
  id: 'a1',
  time: '2026-10-20T09:03:00Z',
  actor: { type: 'SYSTEM' },
  action: 'BOOKING_CONFIRMED',
  entity: { type: 'booking', id: 'b1' },
  changes: [{ field: 'status', oldValue: 'pending', newValue: 'confirmed' }],
}

function backend(extra: Record<string, Reply | ((r: Request) => Reply)> = {}) {
  return mockBackend({
    '/api/admin/stats': [200, stats],
    '/api/admin/stadiums': [200, page([{ id: 'st1', name: 'Chilonzor Arena' }])],
    // The backend filters by status; the mock answers as it would.
    '/api/admin/bookings': (request) => {
      const status = request.url.searchParams.get('status')
      return [200, page([booking, walkIn].filter((b) => !status || b.status === status))]
    },
    '/api/admin/bookings/b1': [200, booking],
    '/api/admin/bookings/b2': [200, walkIn],
    '/api/admin/games': [200, page([teamGame, waiting, casual])],
    '/api/admin/games/g1': [200, teamGame],
    '/api/admin/audit-log': (request) =>
      request.url.searchParams.get('entityId') === 'b1'
        ? [200, page([confirmed])]
        : [200, page([])],
    ...extra,
  })
}

const lastBookings = (requests: Request[]) =>
  requests.filter((r) => r.url.pathname === '/api/admin/bookings').at(-1)!.url.searchParams

describe('Bronlar', () => {
  useAdminTestSetup()

  it('lists bookings: slot, stadium, client (walk-ins marked), price, paid, status', async () => {
    backend()
    signIn()
    renderAt('/bronlar')
    const table = await screen.findByRole('table')
    const row = (await within(table).findByText('Sardor Aliyev')).closest('tr')!
    expect(within(row).getByText(/Pa 22 okt · 20:00–22:00/)).toBeInTheDocument()
    expect(within(row).getByText('Chilonzor Arena')).toBeInTheDocument()
    // The player's price, and what was paid of it.
    expect(within(row).getByText('155 000')).toBeInTheDocument()
    expect(within(row).getByText('155 000 / 155 000')).toBeInTheDocument()
    expect(within(row).getByText('Yakunlangan')).toBeInTheDocument()
    const walkInRow = within(table).getByText('Anvar aka').closest('tr')!
    expect(within(walkInRow).getByText('Qoʻlda')).toBeInTheDocument()
    expect(within(walkInRow).getByText('0 / 200 000')).toBeInTheDocument()
  })

  it('sends the filters to the backend: search, stadium, status and date range', async () => {
    const { requests } = backend()
    signIn()
    renderAt('/bronlar')
    await screen.findByText('Sardor Aliyev')

    fireEvent.change(screen.getByLabelText('Mijoz ismi yoki telefon boʻyicha'), {
      target: { value: '90 111' },
    })
    await waitFor(() => expect(lastBookings(requests).get('search')).toBe('90 111'))
    // The stadium options are the real stadiums only.
    await waitFor(() =>
      expect(screen.getByLabelText('Maydon')).toHaveTextContent('Chilonzor Arena'),
    )
    expect(within(screen.getByLabelText('Maydon')).getAllByRole('option')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Maydon'), { target: { value: 'st1' } })
    await waitFor(() => expect(lastBookings(requests).get('stadiumId')).toBe('st1'))
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'completed' } })
    await waitFor(() => expect(lastBookings(requests).get('status')).toBe('completed'))
    fireEvent.click(screen.getByRole('button', { name: 'Sana: Barchasi' }))
    const picker = screen.getByRole('dialog', { name: 'Sana' })
    fireEvent.change(within(picker).getByLabelText('Dan'), { target: { value: '2026-10-20' } })
    fireEvent.change(within(picker).getByLabelText('Gacha'), { target: { value: '2026-10-26' } })
    fireEvent.click(within(picker).getByRole('button', { name: 'Qoʻllash' }))
    await waitFor(() => expect(lastBookings(requests).get('from')).toBe('2026-10-20'))
    expect(lastBookings(requests).get('to')).toBe('2026-10-26')
    expect(lastBookings(requests).get('page')).toBe('0')
  })

  it('opens a booking in a side panel with the payment summary, history and links', async () => {
    backend()
    signIn()
    const router = renderAt('/bronlar')
    fireEvent.click(await screen.findByText('Sardor Aliyev'))
    expect(router.state.location.search).toBe('?bron=b1')
    const panel = await screen.findByRole('dialog', { name: /Bron #/ })
    expect(await within(panel).findByText(/egasiga 150 000 so'm/)).toBeInTheDocument()
    const payment = await within(panel).findByRole('region', { name: 'Toʻlov' })
    expect(within(payment).getByText("55 000 so'm")).toBeInTheDocument()
    expect(within(payment).getByText("100 000 so'm")).toBeInTheDocument()
    expect(within(payment).getByText('Egasi qabul qildi')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Chilonzor Arena' })).toHaveAttribute(
      'href',
      '/maydonlar/st1',
    )
    expect(within(panel).getByRole('link', { name: 'Sardor Aliyev' })).toHaveAttribute(
      'href',
      '/foydalanuvchilar/u7',
    )
    const history = within(panel).getByRole('region', { name: 'Holat tarixi' })
    expect(await within(history).findAllByRole('listitem')).toHaveLength(1)
    // No actions on this page.
    expect(
      within(panel).queryByRole('button', { name: /Bekor|Tasdiq|Qaytar/ }),
    ).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows a walk-in cancellation with its reason', async () => {
    backend()
    signIn()
    renderAt('/bronlar?bron=b2')
    const panel = await screen.findByRole('dialog', { name: /Bron #/ })
    expect(await within(panel).findByText('Maydonda taʼmirlash ishlari')).toBeInTheDocument()
    expect(within(panel).getByText("200 000 so'm toʻlanmagan")).toBeInTheDocument()
  })

  it('lists games: both teams, a waiting team, a friends game', async () => {
    backend()
    signIn()
    renderAt('/bronlar?tab=oyinlar')
    const table = await screen.findByRole('table')
    expect(await within(table).findByText('Yunusobod Tigers', { exact: false })).toBeInTheDocument()
    expect(within(table).getAllByText('Raqib kutilmoqda')).toHaveLength(2)
    expect(within(table).getByText('Doʻstlar bilan')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Oʻyinlar'),
    )
  })

  it('opens a team game with both teams, what each paid and the players', async () => {
    backend()
    signIn()
    renderAt('/bronlar?tab=oyinlar&oyin=g1')
    const panel = await screen.findByRole('dialog', { name: /Oʻyin #/ })
    const teams = await within(panel).findByRole('region', { name: 'Jamoalar' })
    expect(within(teams).getByText('Chilonzor Lions')).toBeInTheDocument()
    expect(within(teams).getByText('Yunusobod Tigers')).toBeInTheDocument()
    expect(within(teams).getAllByText("100 000 so'm")).toHaveLength(2)
    expect(within(teams).getAllByRole('link', { name: 'Umid K.' })[0]).toHaveAttribute(
      'href',
      '/foydalanuvchilar/u3',
    )
    expect(within(panel).queryByText(/chat/i)).not.toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    let fail = false
    backend({ '/api/admin/bookings': () => (fail ? [500, 'boom'] : [200, page([])]) })
    signIn()
    renderAt('/bronlar')
    expect(await screen.findByText('Bronlar yoʻq')).toBeInTheDocument()
    fail = true
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'pending' } })
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('while R15 is missing: "Tez orada", no table, no filters, no panel, no request', async () => {
    markMissing(BOOKINGS_LIST, GAMES_LIST)
    const { requests } = backend()
    signIn()
    renderAt('/bronlar?bron=b1')
    expect(await screen.findByText('Tez orada')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Maydon')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Oʻyinlar' }))
    expect(await screen.findByText('Tez orada')).toBeInTheDocument()
    expect(
      requests.some((r) => /^\/api\/admin\/(bookings|games|stadiums)/.test(r.url.pathname)),
    ).toBe(false)
  })
})
