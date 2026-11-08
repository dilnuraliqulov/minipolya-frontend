import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameDetail, GameTeam } from '../api/games'
import type { TeamDetail } from '../api/teams'
import { jsonResponse, stubApi } from '../test/api'
import { makeCard } from '../test/bookings'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ME = '018f3a2c-0000-7000-8000-000000000001'
const RIVAL = '018f3a2c-0000-7000-8000-000000000009'
const teamA: GameTeam = {
  side: 'a',
  teamId: 't1',
  leaderId: ME,
  teamName: 'Chilonzor Lions',
  leaderName: 'Test User',
  price: 8_800_000,
  remainderAmount: 8_000_000,
  remainderStatus: 'unpaid',
  paymentOption: 'minimum',
  paidAmount: 8_800_000,
  remainingAmount: 8_000_000,
  paidInApp: 8_800_000,
  heldAmount: 0,
  cancellationDeadline: '2099-11-05T15:00:00Z',
  refundIfCancelledNow: 8_800_000,
}
const teamB: GameTeam = {
  ...teamA,
  side: 'b',
  teamId: 't2',
  leaderId: RIVAL,
  teamName: 'Yunusobod Tigers',
  leaderName: 'Rustam',
}
const confirmed: GameDetail = {
  id: 'g1',
  type: 'team_vs_team',
  status: 'confirmed',
  stadiumId: 's1',
  stadiumName: 'Bunyodkor Arena',
  creatorId: ME,
  startsAt: '2026-11-06T15:00:00Z',
  endsAt: '2026-11-06T16:00:00Z',
  isPublic: true,
  createdAt: '2026-11-01T10:00:00Z',
  teams: [teamA, teamB],
  participants: [],
}
const lions: TeamDetail = {
  id: 't1',
  name: 'Chilonzor Lions',
  leaderId: ME,
  members: [
    { userId: ME, userName: 'Test User', role: 'leader' },
    { userId: 'u2', userName: 'Bobur', role: 'member' },
  ],
}
const tigers: TeamDetail = {
  id: 't2',
  name: 'Yunusobod Tigers',
  leaderId: RIVAL,
  members: [{ userId: RIVAL, userName: 'Rustam', role: 'leader' }],
}

/** The `dl` row whose label is `label` (its `dt` and `dd` together). */
function row(container: HTMLElement, label: string): HTMLElement {
  return within(container).getByText(label, { selector: 'dt' }).parentElement!
}

function stub(game: GameDetail = confirmed, overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/games/g1': game,
    'GET /api/teams/t1': lions,
    'GET /api/teams/t2': tigers,
    'GET /api/cards': [makeCard({ id: 'c1' })],
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Oʻyin — a team game', () => {
  it('shows both teams, their members, the chat and my team payment', async () => {
    stub()
    renderApp('/games/g1')
    expect(await screen.findByText('Tasdiqlangan')).toBeInTheDocument()
    expect(screen.getAllByText('Chilonzor Lions').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Yunusobod Tigers').length).toBeGreaterThan(0)
    expect(screen.getByText('Juma, 6-noyabr · 20:00\u2060–\u206021:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Chat/ })).toHaveAttribute('href', '/games/g1/chat')
    expect(await screen.findByText('Bobur')).toBeInTheDocument()
    const pay = screen.getByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(row(pay, 'Toʻlangan')).toHaveTextContent('88 000 soʻm')
    expect(row(pay, 'Qolgan summa')).toHaveTextContent('80 000 soʻm')
    const rest = screen.getByRole('region', { name: 'Qolgan summa: 80 000 soʻm' })
    expect(within(rest).getByRole('button', { name: 'Ilovada toʻlash' })).toBeInTheDocument()
    expect(within(rest).getByText('yoki maydonda naqd toʻlang')).toBeInTheDocument()
    expect(within(pay).queryByText('Toʻliq toʻlangan')).toBeNull()
    expect(within(pay).queryByText('Raqib topilmasa, toʻliq qaytariladi.')).toBeNull()
  })

  it('a captain pays the team remainder', async () => {
    const api = stub(confirmed, {
      'POST /api/games/g1/pay-remainder': {
        ...confirmed,
        teams: [
          { ...teamA, remainderStatus: 'paid', paidAmount: 16_800_000, remainingAmount: 0 },
          teamB,
        ],
      },
    })
    renderApp('/games/g1')
    fireEvent.click(await screen.findByRole('button', { name: 'Ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Toʻlash · 80 000 soʻm' }))
    expect(await screen.findByText('Qolgan summa toʻlandi')).toBeInTheDocument()
    expect(api.calls('POST /api/games/g1/pay-remainder')).toEqual([{ cardId: 'c1' }])
  })

  it('shows a declined remainder card in the sheet', async () => {
    stub(confirmed, {
      'POST /api/games/g1/pay-remainder': jsonResponse(
        400,
        null,
        'Card payment was declined; the remainder is still owed',
      ),
    })
    renderApp('/games/g1')
    fireEvent.click(await screen.findByRole('button', { name: 'Ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: /Toʻlash · / }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Karta rad etildi')
  })

  it('says insufficient funds from the code and keeps the sheet open with the card outlined', async () => {
    stub(confirmed, {
      'POST /api/games/g1/pay-remainder': jsonResponse(
        400,
        null,
        'Card payment was declined; the remainder is still owed',
        'INSUFFICIENT_FUNDS',
      ),
    })
    renderApp('/games/g1')
    fireEvent.click(await screen.findByRole('button', { name: 'Ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: /Toʻlash · / }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Kartada mablagʻ yetarli emas',
    )
    expect(within(sheet).getByRole('radio', { checked: true }).className).toContain(
      'border-danger-text',
    )
  })

  it('cancels with the refund the API shows for my team', async () => {
    const api = stub(confirmed, { 'DELETE /api/games/g1': null })
    renderApp('/games/g1')
    expect(
      await screen.findByText('Hozir bekor qilsangiz: 88 000 soʻm qaytariladi'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Oʻyinni bekor qilish' }))
    const sheet = await screen.findByRole('dialog', { name: 'Oʻyinni bekor qilasizmi?' })
    expect(
      within(sheet).getByText('Hozir bekor qilsangiz: 88 000 soʻm qaytariladi'),
    ).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ha, bekor qilish' }))
    expect(await screen.findByText('Oʻyin bekor qilindi')).toBeInTheDocument()
    expect(api.calls('DELETE /api/games/g1')).toHaveLength(1)
  })

  it('closes the sheet and reloads the game when the payment is still being confirmed', async () => {
    let gets = 0
    stub(confirmed, {
      'GET /api/games/g1': () => {
        gets += 1
        return confirmed
      },
      'POST /api/games/g1/pay-remainder': jsonResponse(
        400,
        null,
        'The card payment is still being confirmed; the remainder will be marked paid once it is',
      ),
    })
    renderApp('/games/g1')
    fireEvent.click(await screen.findByRole('button', { name: 'Ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: /Toʻlash · / }))
    expect(await screen.findByText(/qayta toʻlamang/)).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await vi.waitFor(() => expect(gets).toBeGreaterThan(1))
  })

  it('ignores my cancelled participant row and lets only an active leader cancel', async () => {
    stub({
      ...confirmed,
      creatorId: ME,
      teams: [{ ...teamA, leaderId: 'new-leader' }, teamB],
      participants: [
        {
          id: 'p1',
          gameId: 'g1',
          userId: ME,
          side: 'a',
          status: 'cancelled',
          joinedAt: '2026-11-01T10:00:00Z',
        },
      ],
    })
    renderApp('/games/g1')
    await screen.findByText('Tasdiqlangan')
    expect(screen.queryByRole('region', { name: 'Jamoangiz toʻlovi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oʻyinni bekor qilish' })).not.toBeInTheDocument()
  })

  it('says "Toʻliq toʻlangan" with no remainder row or pay button when nothing is owed', async () => {
    stub({
      ...confirmed,
      teams: [
        {
          ...teamA,
          paymentOption: 'full',
          price: 13_000_000,
          remainderAmount: 0,
          paidAmount: 13_000_000,
          remainingAmount: 0,
        },
        teamB,
      ],
    })
    renderApp('/games/g1')
    const pay = await screen.findByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(row(pay, 'Toʻlangan')).toHaveTextContent('130 000 soʻm')
    expect(within(pay).queryByText('Qolgan summa')).toBeNull()
    expect(within(pay).getByText('Toʻliq toʻlangan')).toBeInTheDocument()
    expect(screen.queryByText('yoki maydonda naqd toʻlang')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ilovada toʻlash' })).not.toBeInTheDocument()
  })

  it('says "Naqd olindi" when the owner took the rest in cash', async () => {
    stub({
      ...confirmed,
      teams: [
        {
          ...teamA,
          remainderStatus: 'paid',
          paidAmount: 16_800_000,
          remainingAmount: 0,
          remainderMark: 'cash_received',
          remainderMarkedAt: '2026-11-06T17:00:00Z',
        },
        teamB,
      ],
    })
    renderApp('/games/g1')
    const pay = await screen.findByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(row(pay, 'Toʻlangan')).toHaveTextContent('168 000 soʻm')
    expect(within(pay).getByText('Naqd olindi')).toBeInTheDocument()
    expect(within(pay).queryByText('Toʻliq toʻlangan')).toBeNull()
    expect(within(pay).queryByText('Qolgan summa')).toBeNull()
  })

  it('says "Toʻlanmadi" when the owner marked the rest unpaid, and still lets the captain pay', async () => {
    stub({
      ...confirmed,
      teams: [
        { ...teamA, remainderMark: 'not_paid', remainderMarkedAt: '2026-11-06T17:00:00Z' },
        teamB,
      ],
    })
    renderApp('/games/g1')
    const pay = await screen.findByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(row(pay, 'Qolgan summa')).toHaveTextContent('Toʻlanmadi')
    expect(row(pay, 'Qolgan summa')).toHaveTextContent('80 000 soʻm')
    expect(screen.getByRole('button', { name: 'Ilovada toʻlash' })).toBeInTheDocument()
  })

  it('shows what is paid while only held, and that it all comes back without an opponent', async () => {
    stub({
      ...confirmed,
      status: 'open',
      teams: [
        {
          ...teamA,
          paidInApp: 5_500_000,
          heldAmount: 5_500_000,
          paidAmount: 5_500_000,
          remainingAmount: 7_500_000,
        },
      ],
    })
    renderApp('/games/g1')
    const pay = await screen.findByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(row(pay, 'Toʻlangan')).toHaveTextContent('55 000 soʻm')
    expect(within(pay).getByText('Raqib topilmasa, toʻliq qaytariladi.')).toBeInTheDocument()
    expect(row(pay, 'Qolgan summa')).toHaveTextContent('75 000 soʻm')
    expect(within(pay).queryByText('Kartangizda band qilingan')).toBeNull()
    // Nothing to pay before an opponent arrives.
    expect(screen.queryByRole('button', { name: 'Ilovada toʻlash' })).toBeNull()
  })

  it('reads a game from before T9 (no paidAmount or remainingAmount)', async () => {
    const legacy: GameTeam = {
      ...teamA,
      paymentOption: undefined,
      paidAmount: undefined,
      remainingAmount: undefined,
      paidInApp: 4_980_000,
    }
    stub({ ...confirmed, teams: [legacy, teamB] })
    renderApp('/games/g1')
    const pay = await screen.findByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(row(pay, 'Toʻlangan')).toHaveTextContent('49 800 soʻm')
    expect(row(pay, 'Qolgan summa')).toHaveTextContent('80 000 soʻm')
  })

  it('a waiting game shows the opponent placeholder and no chat', async () => {
    stub({ ...confirmed, status: 'open', teams: [teamA] })
    renderApp('/games/g1')
    expect(await screen.findAllByText('Raqib kutilmoqda')).not.toHaveLength(0)
    expect(screen.queryByRole('link', { name: /Chat/ })).not.toBeInTheDocument()
  })

  describe('while another team is joining (R45 joinPending)', () => {
    const joining: GameDetail = { ...confirmed, status: 'open', teams: [teamA], joinPending: true }

    it('says the opposing team payment is being confirmed and offers no cancel', async () => {
      stub(joining)
      renderApp('/games/g1')
      expect(await screen.findByText('Raqib jamoa toʻlovi tasdiqlanmoqda')).toBeInTheDocument()
      expect(
        screen.getByText('Natija aniq boʻlgach, oʻyin shu yerda yangilanadi.'),
      ).toBeInTheDocument()
      // The waiting note would contradict it.
      expect(
        screen.queryByText(
          'Raqib jamoa qabul qilishi bilan maydon band qilinadi va xabar beramiz.',
        ),
      ).toBeNull()
      expect(screen.queryByRole('button', { name: 'Oʻyinni bekor qilish' })).toBeNull()
    })

    it('offers no pay-the-rest while it lasts', async () => {
      stub({ ...confirmed, joinPending: true })
      renderApp('/games/g1')
      await screen.findByText('Raqib jamoa toʻlovi tasdiqlanmoqda')
      expect(screen.queryByRole('button', { name: 'Ilovada toʻlash' })).toBeNull()
    })

    it('re-reads the game until the backend settles it, then shows the confirmed game', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      let reads = 0
      stub(joining, {
        'GET /api/games/g1': () => (++reads === 1 ? joining : confirmed),
      })
      renderApp('/games/g1')
      await screen.findByText('Raqib jamoa toʻlovi tasdiqlanmoqda')
      await vi.advanceTimersByTimeAsync(10_500)
      expect(await screen.findByText('Tasdiqlangan')).toBeInTheDocument()
      expect(screen.queryByText('Raqib jamoa toʻlovi tasdiqlanmoqda')).toBeNull()
      expect(screen.getByRole('button', { name: 'Ilovada toʻlash' })).toBeInTheDocument()
      // Settled: no more polling.
      await vi.advanceTimersByTimeAsync(30_000)
      expect(reads).toBe(2)
      vi.useRealTimers()
    })
  })

  it('a cancelled game without teams shows no opponent placeholders or empty team list', async () => {
    // The API lists only teams still in the game; after a cancel there are none.
    stub({ ...confirmed, status: 'cancelled', teams: [] })
    renderApp('/games/g1')
    expect(await screen.findByText('Bekor qilingan')).toBeInTheDocument()
    expect(screen.queryByText('Raqib kutilmoqda')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Jamoalar' })).not.toBeInTheDocument()
  })

  it('a player outside the teams sees no payment or cancel', async () => {
    stub({ ...confirmed, creatorId: RIVAL, teams: [{ ...teamA, leaderId: 'x' }, teamB] })
    renderApp('/games/g1')
    await screen.findByText('Tasdiqlangan')
    expect(screen.queryByRole('region', { name: 'Jamoangiz toʻlovi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Oʻyinni bekor qilish' })).not.toBeInTheDocument()
  })

  it('says the game was not found on a 404', async () => {
    stub(confirmed, { 'GET /api/games/g1': jsonResponse(404, null, 'Game not found') })
    renderApp('/games/g1')
    expect(await screen.findByText('Oʻyin topilmadi')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub(confirmed, {
      'GET /api/games/g1': () =>
        fail ? jsonResponse(500, null, 'Internal server error') : confirmed,
    })
    renderApp('/games/g1')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Tasdiqlangan')).toBeInTheDocument()
  })
})
