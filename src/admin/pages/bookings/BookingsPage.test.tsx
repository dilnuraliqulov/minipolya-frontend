import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminBooking, AdminGameDetail, BookingFilters } from '../../api/bookings'
import { mockBackend, page, renderAt, signIn, stats, useAdminTestSetup } from '../../test-utils'

const booking: AdminBooking = {
  id: 'sample-booking-0001',
  stadiumId: 'sample-stadium-0011',
  stadiumName: 'Bunyodkor Arena',
  userId: 'sample-user-0001',
  userName: 'Sardor Aliyev',
  userPhone: '+998 90 111 22 33',
  source: 'app',
  status: 'completed',
  startsAt: '2026-10-22T15:00:00Z',
  endsAt: '2026-10-22T17:00:00Z',
  durationHours: 2,
  price: 20_000_000,
  paidAmount: 20_000_000,
  remainingAmount: 0,
  paymentStatus: 'paid',
  paidInApp: 5_000_000,
  cashReceived: 15_000_000,
  cashReceivedAt: '2026-10-22T15:10:00Z',
  isWalkin: false,
  createdAt: '2026-10-20T09:02:00Z',
}
const walkIn: AdminBooking = {
  ...booking,
  id: 'sample-booking-0002',
  userId: undefined,
  userName: undefined,
  userPhone: undefined,
  clientName: 'Anvar aka',
  clientPhone: '+998 97 654 32 10',
  isWalkin: true,
  source: 'manual',
  status: 'cancelled_by_owner',
  paidAmount: 0,
  paidInApp: 0,
  cashReceived: undefined,
  remainingAmount: 20_000_000,
  cancellationReason: 'Maydonda taʼmirlash ishlari',
}
const teamGame: AdminGameDetail = {
  id: 'sample-game-0001',
  type: 'team_vs_team',
  status: 'completed',
  stadiumId: 'sample-stadium-0011',
  stadiumName: 'Bunyodkor Arena',
  startsAt: '2026-10-22T15:00:00Z',
  endsAt: '2026-10-22T16:00:00Z',
  totalPrice: 20_000_000,
  creatorId: 'sample-user-0001',
  creatorName: 'Bekzod Rahmatov',
  teamAName: 'Chilonzor Lions',
  teamBName: 'Yunusobod Tigers',
  createdAt: '2026-10-18T06:20:00Z',
  teams: (['a', 'b'] as const).map((side) => ({
    side,
    teamId: `t-${side}`,
    teamName: side === 'a' ? 'Chilonzor Lions' : 'Yunusobod Tigers',
    leaderId: `sample-user-000${side === 'a' ? 1 : 2}`,
    leaderName: side === 'a' ? 'Bekzod Rahmatov' : 'Sherzod Nazarov',
    feeAmount: 2_500_000,
    advanceAmount: 2_500_000,
    remainderAmount: 0,
    remainderStatus: 'paid' as const,
    paidInApp: 10_000_000,
    players: [{ userId: 'sample-user-0003', userName: 'Umid Karimov', status: 'joined' }],
  })),
}
const waiting: AdminGameDetail = {
  ...teamGame,
  id: 'sample-game-0002',
  status: 'open',
  teamBName: undefined,
  teams: teamGame.teams!.slice(0, 1),
}
const casual: AdminGameDetail = {
  ...teamGame,
  id: 'sample-game-0003',
  type: 'casual',
  status: 'confirmed',
  teamAName: undefined,
  teamBName: undefined,
  teams: undefined,
  participants: [{ userId: 'sample-user-0001', userName: 'Bekzod Rahmatov', status: 'paid' }],
  serviceFeePerPerson: 500_000,
}

const backendReplies = {
  '/api/admin/stats': [200, stats],
  '/api/admin/stadiums': [200, page([{ id: 'real-1', name: 'Chilonzor Arena' }])],
} as const

/** The sample adapter, answering with these fixtures and recording the filters it got. */
async function sampleData() {
  const adapter = await import('../../api/sample/adapter')
  const pageOf = <T,>(items: T[]) => Promise.resolve(page(items))
  const bookings = vi
    .spyOn(adapter, 'listBookings')
    .mockImplementation((f: BookingFilters) =>
      pageOf([booking, walkIn].filter((b) => !f.status || b.status === f.status)),
    )
  const games = vi
    .spyOn(adapter, 'listGames')
    .mockImplementation(() => pageOf([teamGame, waiting, casual]))
  vi.spyOn(adapter, 'getBooking').mockImplementation((id) =>
    Promise.resolve(id === walkIn.id ? walkIn : booking),
  )
  vi.spyOn(adapter, 'getGame').mockImplementation((id) =>
    Promise.resolve([teamGame, waiting, casual].find((g) => g.id === id)!),
  )
  return { bookings, games }
}

describe('Bronlar', () => {
  useAdminTestSetup()

  it('lists bookings: slot, stadium, client (walk-ins marked), price, paid, status', async () => {
    await sampleData()
    mockBackend({ ...backendReplies })
    signIn()
    renderAt('/bronlar')
    const table = await screen.findByRole('table')
    const row = (await within(table).findByText('Sardor Aliyev')).closest('tr')!
    expect(within(row).getByText(/Pa 22 okt · 20:00–22:00/)).toBeInTheDocument()
    expect(within(row).getByText('Bunyodkor Arena')).toBeInTheDocument()
    expect(within(row).getByText('200 000 / 200 000')).toBeInTheDocument()
    expect(within(row).getByText('Yakunlangan')).toBeInTheDocument()
    const walkInRow = within(table).getByText('Anvar aka').closest('tr')!
    expect(within(walkInRow).getByText('Qoʻlda')).toBeInTheDocument()
    expect(within(walkInRow).getByText('0 / 200 000')).toBeInTheDocument()
    expect(screen.getByText('Namuna')).toBeInTheDocument()
  })

  it('sends the filters: search, stadium, status and date range', async () => {
    const { bookings } = await sampleData()
    mockBackend({ ...backendReplies })
    signIn()
    renderAt('/bronlar')
    await screen.findByText('Sardor Aliyev')
    const last = () => bookings.mock.calls.at(-1)![0]

    fireEvent.change(screen.getByLabelText('Mijoz ismi yoki telefon boʻyicha'), {
      target: { value: '90 111' },
    })
    await waitFor(() => expect(last().search).toBe('90 111'))
    await waitFor(() =>
      expect(screen.getByLabelText('Maydon')).toHaveTextContent('Bunyodkor Arena'),
    )
    fireEvent.change(screen.getByLabelText('Maydon'), { target: { value: 'real-1' } })
    await waitFor(() => expect(last().stadiumId).toBe('real-1'))
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'completed' } })
    await waitFor(() => expect(last().status).toBe('completed'))
    fireEvent.click(screen.getByRole('button', { name: 'Sana: Barchasi' }))
    const picker = screen.getByRole('dialog', { name: 'Sana' })
    fireEvent.change(within(picker).getByLabelText('Dan'), { target: { value: '2026-10-20' } })
    fireEvent.change(within(picker).getByLabelText('Gacha'), { target: { value: '2026-10-26' } })
    fireEvent.click(within(picker).getByRole('button', { name: 'Qoʻllash' }))
    await waitFor(() =>
      expect(last()).toMatchObject({ from: '2026-10-20', to: '2026-10-26', page: 0 }),
    )
  })

  it('opens a booking in a side panel with the payment summary, history and links', async () => {
    await sampleData()
    mockBackend({ ...backendReplies })
    signIn()
    const router = renderAt('/bronlar')
    fireEvent.click(await screen.findByText('Sardor Aliyev'))
    expect(router.state.location.search).toBe('?bron=sample-booking-0001')
    const panel = await screen.findByRole('dialog', { name: /Bron #/ })
    const payment = await within(panel).findByRole('region', { name: 'Toʻlov' })
    expect(within(payment).getByText("50 000 so'm")).toBeInTheDocument()
    expect(within(payment).getByText("150 000 so'm")).toBeInTheDocument()
    expect(within(payment).getByText('Egasi qabul qildi')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Bunyodkor Arena' })).toHaveAttribute(
      'href',
      '/maydonlar/sample-stadium-0011',
    )
    expect(within(panel).getByRole('link', { name: 'Sardor Aliyev' })).toHaveAttribute(
      'href',
      '/foydalanuvchilar/sample-user-0001',
    )
    const history = within(panel).getByRole('region', { name: 'Holat tarixi' })
    expect(await within(history).findAllByRole('listitem')).not.toHaveLength(0)
    // No actions on this page.
    expect(
      within(panel).queryByRole('button', { name: /Bekor|Tasdiq|Qaytar/ }),
    ).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows a walk-in cancellation with its reason', async () => {
    await sampleData()
    mockBackend({ ...backendReplies })
    signIn()
    renderAt('/bronlar?bron=sample-booking-0002')
    const panel = await screen.findByRole('dialog', { name: /Bron #/ })
    expect(await within(panel).findByText('Maydonda taʼmirlash ishlari')).toBeInTheDocument()
    expect(within(panel).getByText("200 000 so'm toʻlanmagan")).toBeInTheDocument()
  })

  it('lists games: both teams, a waiting team, a friends game', async () => {
    await sampleData()
    mockBackend({ ...backendReplies })
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
    await sampleData()
    mockBackend({ ...backendReplies })
    signIn()
    renderAt('/bronlar?tab=oyinlar&oyin=sample-game-0001')
    const panel = await screen.findByRole('dialog', { name: /Oʻyin #/ })
    const teams = await within(panel).findByRole('region', { name: 'Jamoalar' })
    expect(within(teams).getByText('Chilonzor Lions')).toBeInTheDocument()
    expect(within(teams).getByText('Yunusobod Tigers')).toBeInTheDocument()
    expect(within(teams).getAllByText("100 000 so'm")).toHaveLength(2)
    expect(within(teams).getAllByRole('link', { name: 'Umid K.' })[0]).toHaveAttribute(
      'href',
      '/foydalanuvchilar/sample-user-0003',
    )
    expect(within(panel).queryByText(/chat/i)).not.toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    const adapter = await import('../../api/sample/adapter')
    const list = vi.spyOn(adapter, 'listBookings').mockResolvedValue(page([]))
    mockBackend({ ...backendReplies })
    signIn()
    renderAt('/bronlar')
    expect(await screen.findByText('Bronlar yoʻq')).toBeInTheDocument()
    list.mockRejectedValue(new Error('boom'))
    fireEvent.change(screen.getByLabelText('Holat'), { target: { value: 'pending' } })
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
