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
const later = new Date(Date.now() + 3 * 3600_000).toISOString()
const earlier = new Date(Date.now() - 3600_000).toISOString()
/** The design's example: side A paid the minimum and owes 75 000; side B paid in full. */
const owes: GameTeam = {
  side: 'a',
  teamId: 't-a',
  leaderId: 'l-a',
  teamName: 'Chilonzor Lions',
  paymentOption: 'minimum',
  price: 5_500_000,
  remainderAmount: 7_500_000,
  remainderStatus: 'unpaid',
  paidAmount: 5_500_000,
  remainingAmount: 7_500_000,
  paidInApp: 5_500_000,
}
const paidFull: GameTeam = {
  side: 'b',
  teamId: 't-b',
  leaderId: 'l-b',
  teamName: 'Yunusobod Tigers',
  paymentOption: 'full',
  price: 13_000_000,
  remainderAmount: 0,
  remainderStatus: 'paid',
  paidAmount: 13_000_000,
  remainingAmount: 0,
  paidInApp: 13_000_000,
}
const cashTaken: GameTeam = {
  ...owes,
  remainderStatus: 'paid',
  paidAmount: 13_000_000,
  remainingAmount: 0,
  remainderMark: 'cash_received',
  remainderMarkedAt: earlier,
  remainderMarkUndoableUntil: later,
}
const markedNotPaid: GameTeam = {
  ...owes,
  remainderMark: 'not_paid',
  remainderMarkedAt: earlier,
  remainderMarkUndoableUntil: later,
}
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
  teams: [owes, paidFull],
}
const withTeams = (...teams: GameTeam[]): GameDetail => ({ ...game, teams })

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

const teamItem = (sheet: HTMLElement, name: string) =>
  within(sheet).findByRole('listitem', { name })

/** The `dl` row whose label is `label` (its `dt` and `dd` together). */
const row = (container: HTMLElement, label: string) =>
  within(container).getByText(label, { selector: 'dt' }).parentElement!

describe('Ega rejimi — a team game’s teams (T10)', () => {
  it('shows each team’s amounts under the booking labels, with both marks only where something is owed', async () => {
    stub()
    const sheet = await openBooking()
    const lions = await teamItem(sheet, 'Chilonzor Lions')
    expect(row(lions, 'Ilovada toʻlangan')).toHaveTextContent('55 000 soʻm')
    expect(row(lions, 'Naqd olinadi')).toHaveTextContent('75 000 soʻm')
    expect(within(lions).getByRole('button', { name: 'Naqd olindi' })).toBeInTheDocument()
    expect(within(lions).getByRole('button', { name: 'Toʻlanmadi' })).toBeInTheDocument()
    const tigers = await teamItem(sheet, 'Yunusobod Tigers')
    expect(row(tigers, 'Ilovada toʻlangan')).toHaveTextContent('130 000 soʻm')
    expect(within(tigers).queryByText('Naqd olinadi')).toBeNull()
    expect(within(tigers).getByText('Toʻliq toʻlangan')).toBeInTheDocument()
    expect(within(tigers).queryByRole('button')).toBeNull()
  })

  it('records cash only after confirming, then shows the mark with its undo', async () => {
    // The server's game: what the refresh after the mark reads.
    let current = game
    const api = stub({
      'GET /api/games/g1': () => current,
      'POST /api/games/g1/cash': () => (current = withTeams(cashTaken, paidFull)),
    })
    const sheet = await openBooking()
    fireEvent.click(
      within(await teamItem(sheet, 'Chilonzor Lions')).getByRole('button', { name: 'Naqd olindi' }),
    )
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    expect(confirm).toHaveTextContent(
      'Chilonzor Lions jamoasidan 75 000 soʻm naqd olinganini tasdiqlaysizmi?',
    )
    expect(confirm).toHaveTextContent('Chilonzor Lions · ')
    expect(confirm).toHaveTextContent('Bunyodkor Arena.')
    expect(api.calls('POST /api/games/g1/cash')).toHaveLength(0)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Naqd toʻlov qayd etildi')).toBeInTheDocument()
    expect(api.calls('POST /api/games/g1/cash')).toEqual([{ side: 'a' }])
    // Back on the booking sheet, the team shows the answer's state.
    const after = await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
    const lions = await teamItem(after, 'Chilonzor Lions')
    expect(row(lions, 'Naqd olindi')).toHaveTextContent('75 000 soʻm')
    expect(within(lions).getByText('Naqd olindi · 75 000 soʻm')).toBeInTheDocument()
    expect(within(lions).getByRole('button', { name: 'Bekor qilish' })).toBeInTheDocument()
    expect(within(lions).queryByRole('button', { name: 'Toʻlanmadi' })).toBeNull()
  })

  it('marks Toʻlanmadi after confirming, keeps "Naqd olindi" offered, and undoes it', async () => {
    let current = game
    const api = stub({
      'GET /api/games/g1': () => current,
      'POST /api/games/g1/not-paid': () => (current = withTeams(markedNotPaid, paidFull)),
      'DELETE /api/games/g1/remainder-mark': () => (current = withTeams(owes, paidFull)),
    })
    const sheet = await openBooking()
    fireEvent.click(
      within(await teamItem(sheet, 'Chilonzor Lions')).getByRole('button', { name: 'Toʻlanmadi' }),
    )
    const confirm = await screen.findByRole('dialog', { name: 'Toʻlanmadi deb belgilash' })
    expect(confirm).toHaveTextContent(
      'Chilonzor Lions jamoasi qolgan 75 000 soʻmni toʻlamaganini belgilaysizmi?',
    )
    expect(confirm).toHaveTextContent('Jarima olinmaydi, jamoa sardori qoldiqni')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Toʻlanmadi' }))
    expect(await screen.findByText('Toʻlanmadi deb belgilandi')).toBeInTheDocument()
    expect(api.calls('POST /api/games/g1/not-paid')).toEqual([{ side: 'a' }])
    const after = await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
    const lions = await teamItem(after, 'Chilonzor Lions')
    expect(within(lions).getByText('Toʻlanmadi deb belgilangan')).toBeInTheDocument()
    expect(within(lions).getByText('Toʻlanmadi')).toBeInTheDocument()
    expect(within(lions).getByRole('button', { name: 'Naqd olindi' })).toBeInTheDocument()
    expect(within(lions).queryByRole('button', { name: 'Toʻlanmadi' })).toBeNull()
    fireEvent.click(within(lions).getByRole('button', { name: 'Bekor qilish' }))
    expect(await screen.findByText('Belgi bekor qilindi')).toBeInTheDocument()
    expect(api.queries('DELETE /api/games/g1/remainder-mark')).toEqual([{ side: 'a' }])
    expect(
      await within(await teamItem(after, 'Chilonzor Lions')).findByRole('button', {
        name: 'Toʻlanmadi',
      }),
    ).toBeInTheDocument()
  })

  it('after the day only an admin can change the mark', async () => {
    stub({
      'GET /api/games/g1': withTeams(
        { ...cashTaken, remainderMarkUndoableUntil: earlier },
        paidFull,
      ),
    })
    const sheet = await openBooking()
    const lions = await teamItem(sheet, 'Chilonzor Lions')
    expect(
      within(lions).getByText('Belgini endi faqat administrator oʻzgartira oladi'),
    ).toBeInTheDocument()
    expect(within(lions).queryByRole('button', { name: 'Bekor qilish' })).toBeNull()
  })

  it.each([
    ['Already paid', 'Bu toʻlov allaqachon qayd etilgan.'],
    [
      'A payment for this team is being processed',
      'Bu jamoa uchun karta toʻlovi hali tasdiqlanmoqda. Birozdan soʻng qayta urinib koʻring.',
    ],
    ['This game is cancelled', 'Bu oʻyin bekor qilingan.'],
  ])('maps the 409 "%s"', async (message, text) => {
    stub({ 'POST /api/games/g1/cash': jsonResponse(409, null, message) })
    const sheet = await openBooking()
    fireEvent.click(
      within(await teamItem(sheet, 'Chilonzor Lions')).getByRole('button', { name: 'Naqd olindi' }),
    )
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it('says the mark is gone when the undo finds none', async () => {
    stub({
      'GET /api/games/g1': withTeams(markedNotPaid, paidFull),
      'DELETE /api/games/g1/remainder-mark': jsonResponse(
        409,
        null,
        'This team has no remainder mark',
      ),
    })
    const sheet = await openBooking()
    fireEvent.click(
      within(await teamItem(sheet, 'Chilonzor Lions')).getByRole('button', {
        name: 'Bekor qilish',
      }),
    )
    expect(
      await screen.findByText('Bu jamoada belgi yoʻq — u allaqachon bekor qilingan.'),
    ).toBeInTheDocument()
  })

  it('offers no marks on a game that is not confirmed', async () => {
    stub({ 'GET /api/games/g1': { ...game, status: 'open', teams: [owes] } })
    const sheet = await openBooking()
    const lions = await teamItem(sheet, 'Chilonzor Lions')
    expect(row(lions, 'Naqd olinadi')).toHaveTextContent('75 000 soʻm')
    expect(within(lions).queryByRole('button')).toBeNull()
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

describe('Ega rejimi — a team game’s booking', () => {
  it('reads "Jamoa vs jamoa" and leaves the money to its teams', async () => {
    const gameBooking = {
      ...booking,
      clientName: undefined,
      price: 26_000_000,
      ownerPrice: 20_000_000,
      paidAmount: 18_500_000,
      remainingAmount: 7_500_000,
      paidInApp: 0,
      ownerReceives: 0,
    }
    stub({
      'GET /api/owner/dashboard/stadiums/s1/schedule': [
        {
          date: TODAY,
          bookings: [gameBooking],
          waitingGames: [],
          totalSlots: 1,
          bookedSlots: 1,
          revenue: 0,
        },
      ],
    })
    renderApp('/owner', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Jamoa vs jamoa/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
    await teamItem(sheet, 'Chilonzor Lions')
    const details = sheet.querySelector('dl')!
    expect(row(details, 'Oʻyinchi toʻlaydi')).toHaveTextContent('260 000 soʻm')
    expect(within(details).queryByText('Ilovada toʻlangan')).toBeNull()
    expect(within(details).queryByText('Sizga tushadi')).toBeNull()
  })
})
