import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameDetail, GameTeam } from '../api/games'
import type { OwnerStadium } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { makeBooking } from '../test/bookings'
import { readySession, renderApp } from '../test/renderApp'
import { makeSlot } from '../test/stadiums'
import { tashkentToday } from '../../shared/format'

afterEach(() => {
  vi.unstubAllGlobals()
})

const owner = makeUser({ isOwner: true })
const session = readySession(owner)
const stadium: OwnerStadium = { id: 's1', name: 'Bunyodkor Arena', status: 'approved' }
const TODAY = tashkentToday()
const booking = makeBooking({
  id: 'b1',
  stadiumId: 's1',
  gameId: 'g1',
  source: 'game',
  status: 'confirmed',
  startsAt: `${TODAY}T13:00:00Z`,
  endsAt: `${TODAY}T14:00:00Z`,
  clientName: 'Chilonzor Lions',
  remainingAmount: 0,
})
const team = (side: 'a' | 'b', name: string, status: string): GameTeam => ({
  side,
  teamId: `t-${side}`,
  leaderId: `l-${side}`,
  teamName: name,
  price: 2_000_000,
  remainderAmount: 8_000_000,
  remainderStatus: status,
  paidInApp: 2_000_000,
})
const game: GameDetail = {
  id: 'g1',
  type: 'team_vs_team',
  status: 'confirmed',
  stadiumId: 's1',
  creatorId: 'l-a',
  isPublic: true,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  createdAt: '2026-10-01T10:00:00Z',
  teams: [team('a', 'Chilonzor Lions', 'unpaid'), team('b', 'Yunusobod Tigers', 'paid')],
}

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': [stadium],
    'GET /api/owner/dashboard/stadiums/s1/schedule': [
      {
        date: TODAY,
        bookings: [booking],
        waitingGames: [],
        totalSlots: 1,
        bookedSlots: 1,
        revenue: 0,
      },
    ],
    'GET /api/stadiums/s1/availability': {
      stadiumId: 's1',
      stadiumName: 'x',
      date: TODAY,
      slots: [makeSlot('18:00', { status: 'booked', available: false })],
    },
    'GET /api/games/g1': game,
    'GET /api/users/me': owner,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

async function openBooking() {
  renderApp('/owner', { session })
  fireEvent.click(await screen.findByRole('button', { name: /Chilonzor Lions/ }))
  return screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
}

describe('Ega rejimi — team game cash', () => {
  it('shows each team’s remainder and records cash for an unpaid one after confirming', async () => {
    const api = stub({
      'POST /api/games/g1/cash': {
        ...game,
        teams: [team('a', 'Chilonzor Lions', 'paid'), team('b', 'Yunusobod Tigers', 'paid')],
      },
    })
    const sheet = await openBooking()
    expect(
      await within(sheet).findByText('Chilonzor Lions · Qolgani: 80 000 soʻm'),
    ).toBeInTheDocument()
    expect(within(sheet).getByText('Yunusobod Tigers · Toʻlangan')).toBeInTheDocument()
    // Only the unpaid team has a button.
    const buttons = within(sheet).getAllByRole('button', { name: /Naqd olindi/ })
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0]!)
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    expect(confirm).toHaveTextContent(
      'Chilonzor Lions jamoasidan 80 000 soʻm naqd olinganini tasdiqlaysizmi?',
    )
    expect(api.calls('POST /api/games/g1/cash')).toHaveLength(0)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Naqd toʻlov qayd etildi')).toBeInTheDocument()
    expect(api.calls('POST /api/games/g1/cash')).toEqual([{ side: 'a' }])
  })

  it('says when the team has already paid meanwhile', async () => {
    stub({ 'POST /api/games/g1/cash': jsonResponse(400, null, 'Already paid') })
    const sheet = await openBooking()
    fireEvent.click(await within(sheet).findByRole('button', { name: /Naqd olindi/ }))
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Bu toʻlov allaqachon qayd etilgan.')).toBeInTheDocument()
  })
})

describe('Ega rejimi — booking cash (R37)', () => {
  const deposit = {
    ...booking,
    gameId: undefined,
    source: 'player',
    paymentStatus: 'partially_paid',
    remainingAmount: 9_000_000,
  }

  it('records the rest of an ordinary booking in cash after confirming', async () => {
    const api = stub({
      'GET /api/owner/dashboard/stadiums/s1/schedule': [
        {
          date: TODAY,
          bookings: [deposit],
          waitingGames: [],
          totalSlots: 1,
          bookedSlots: 1,
          revenue: 0,
        },
      ],
      'POST /api/owner/bookings/b1/cash': { ...deposit, remainingAmount: 0 },
    })
    const sheet = await openBooking()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Naqd olindi' }))
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    expect(confirm).toHaveTextContent('Mijozdan 90 000 soʻm naqd olinganini tasdiqlaysizmi?')
    expect(api.calls('POST /api/owner/bookings/b1/cash')).toHaveLength(0)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Naqd toʻlov qayd etildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/bookings/b1/cash')).toHaveLength(1)
  })

  it('maps a card payment still processing to its own message', async () => {
    stub({
      'GET /api/owner/dashboard/stadiums/s1/schedule': [
        {
          date: TODAY,
          bookings: [deposit],
          waitingGames: [],
          totalSlots: 1,
          bookedSlots: 1,
          revenue: 0,
        },
      ],
      'POST /api/owner/bookings/b1/cash': jsonResponse(
        409,
        null,
        'A payment for this booking is being processed',
      ),
    })
    const sheet = await openBooking()
    fireEvent.click(within(sheet).getByRole('button', { name: /Naqd olindi/ }))
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(
      await screen.findByText(
        'Bu bron uchun karta toʻlovi hali tasdiqlanmoqda. Birozdan soʻng qayta urinib koʻring.',
      ),
    ).toBeInTheDocument()
  })
})
