import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tashkentToUtc, tashkentToday } from '../../shared/format'
import type { TeamDetail } from '../api/teams'
import { nextDate } from '../stadiums/dates'
import { jsonResponse, stubApi } from '../test/api'
import { makeCard } from '../test/bookings'
import { renderApp } from '../test/renderApp'
import { makeDetail, makeSlot } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ME = '018f3a2c-0000-7000-8000-000000000001'
const SID = '018f3a2c-0000-7000-8000-0000000000a1'
const DATE = nextDate(tashkentToday())
const URL = `/opponent?stadium=${SID}&date=${DATE}&start=20:00`
const lions: TeamDetail = {
  id: 't1',
  name: 'Chilonzor Lions',
  leaderId: ME,
  members: [{ userId: ME, userName: 'Test User', role: 'leader' }],
}
const atlas: TeamDetail = { ...lions, id: 't2', name: 'Sergeli Atlas', leaderId: 'other' }

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    [`GET /api/stadiums/${SID}`]: makeDetail({ id: SID, name: 'Bunyodkor Arena' }),
    [`GET /api/stadiums/${SID}/availability`]: {
      stadiumId: SID,
      stadiumName: 'Bunyodkor Arena',
      date: DATE,
      slots: [makeSlot('20:00', { pricePerHour: 15_500_000 })],
    },
    'GET /api/teams/me': [
      { id: 't1', name: 'Chilonzor Lions' },
      { id: 't2', name: 'Sergeli Atlas' },
    ],
    'GET /api/teams/t1': lions,
    'GET /api/teams/t2': atlas,
    'GET /api/cards': [makeCard({ id: 'c1' })],
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Raqib qidirish', () => {
  it('offers only the teams the player captains and starts the game', async () => {
    const api = stub({
      'POST /api/games': { id: 'g7' },
      'GET /api/games/g7': jsonResponse(404, null, 'x'),
    })
    const { router } = renderApp(URL)
    expect(await screen.findByRole('radio', { name: /Chilonzor Lions/ })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /Sergeli Atlas/ })).not.toBeInTheDocument()
    expect(screen.getByText('155 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText(/tez orada/)).toBeInTheDocument()
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: 'Raqib qidirishni boshlash' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/games/g7'))
    expect(api.calls('POST /api/games')).toEqual([
      {
        stadiumId: SID,
        startsAt: tashkentToUtc(DATE, '20:00'),
        teamAId: 't1',
        cardId: 'c1',
        type: 'team_vs_team',
        maxPlayers: 2,
      },
    ])
  })

  it('shows a declined hold', async () => {
    stub({
      'POST /api/games': jsonResponse(
        400,
        null,
        'Card payment was declined; the game was not created',
      ),
    })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: 'Raqib qidirishni boshlash' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Karta rad etildi')
  })

  it('sends the captain to Oʻyinlarim after a server error instead of a retry', async () => {
    stub({ 'POST /api/games': jsonResponse(500, null, 'Internal server error') })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: 'Raqib qidirishni boshlash' }))
    expect(await screen.findByText('Natijani tekshiring')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Raqib qidirishni boshlash' }),
    ).not.toBeInTheDocument()
  })

  it('explains a taken slot', async () => {
    stub({ 'POST /api/games': jsonResponse(409, null, 'That time slot is already booked') })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: 'Raqib qidirishni boshlash' }))
    expect(await screen.findByText('Bu vaqt band boʻlib qoldi')).toBeInTheDocument()
  })

  it('tells a non-captain they cannot start one', async () => {
    stub({ 'GET /api/teams/me': [{ id: 't2', name: 'Sergeli Atlas' }] })
    renderApp(URL)
    expect(
      await screen.findByText('Raqib qidirish uchun jamoa sardori boʻlishingiz kerak.'),
    ).toBeInTheDocument()
  })
})

describe('Maydon — booking choice for captains', () => {
  it('a captain chooses between booking alone and finding an opponent', async () => {
    stub({
      'GET /api/users/me': {
        id: ME,
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        phone: '+998901234567',
        language: 'uz',
        isOwner: false,
        isAdmin: false,
        createdAt: '2026-10-01T10:00:00Z',
      },
      [`GET /api/reviews/stadium/${SID}`]: {
        content: [],
        page: 0,
        size: 3,
        totalElements: 0,
        totalPages: 0,
      },
    })
    const { router } = renderApp(`/stadiums/${SID}?date=${DATE}`)
    fireEvent.click(await screen.findByRole('radio', { name: /^20:00/ }))
    fireEvent.click(screen.getByRole('button', { name: /Band qilish ·/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Qanday band qilasiz?' })
    expect(sheet).toHaveTextContent('Oddiy bron · 155 000 soʻm')
    fireEvent.click(screen.getByRole('button', { name: /Raqib jamoa qidiraman/ }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/opponent'))
  })
})
