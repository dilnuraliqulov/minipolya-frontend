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
  paidInApp: 8_800_000,
  cancellationDeadline: '2026-11-05T15:00:00Z',
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
    expect(screen.getByText('Juma, 6-noyabr · 20:00–21:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Chat/ })).toHaveAttribute('href', '/games/g1/chat')
    expect(await screen.findByText('Bobur')).toBeInTheDocument()
    const pay = screen.getByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(within(pay).getByText('88 000 soʻm')).toBeInTheDocument()
    expect(within(pay).getByText('80 000 soʻm')).toBeInTheDocument()
    expect(within(pay).getByText('Toʻlanmagan')).toBeInTheDocument()
  })

  it('a captain pays the team remainder', async () => {
    const api = stub(confirmed, {
      'POST /api/games/g1/pay-remainder': {
        ...confirmed,
        teams: [{ ...teamA, remainderStatus: 'paid' }, teamB],
      },
    })
    renderApp('/games/g1')
    fireEvent.click(await screen.findByRole('button', { name: 'Qolganini toʻlash' }))
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
    fireEvent.click(await screen.findByRole('button', { name: 'Qolganini toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: /Toʻlash · / }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Karta rad etildi')
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
    fireEvent.click(await screen.findByRole('button', { name: 'Qolganini toʻlash' }))
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

  it('shows no unpaid badge or pay button when nothing is owed', async () => {
    stub({ ...confirmed, teams: [{ ...teamA, remainderAmount: 0 }, teamB] })
    renderApp('/games/g1')
    const pay = await screen.findByRole('region', { name: 'Jamoangiz toʻlovi' })
    expect(within(pay).getByText('0 soʻm')).toBeInTheDocument()
    expect(within(pay).queryByText('Toʻlanmagan')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Qolganini toʻlash' })).not.toBeInTheDocument()
  })

  it('a waiting game shows the opponent placeholder and no chat', async () => {
    stub({ ...confirmed, status: 'open', teams: [teamA] })
    renderApp('/games/g1')
    expect(await screen.findAllByText('Raqib kutilmoqda')).not.toHaveLength(0)
    expect(screen.queryByRole('link', { name: /Chat/ })).not.toBeInTheDocument()
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
