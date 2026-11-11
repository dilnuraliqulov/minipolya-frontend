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
const QUOTE = `GET /api/stadiums/${SID}/team-game-quote`
/** T7: the design's example — minimum 55 000 (75 000 later) or full 130 000. */
const quote = {
  options: [
    { option: 'minimum', amount: 5_500_000, remainderAmount: 7_500_000 },
    { option: 'full', amount: 13_000_000, remainderAmount: 0 },
  ],
  cancellationDeadline: '2099-11-05T15:00:00Z',
}
const START = /Raqib qidirishni boshlash/

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
    [QUOTE]: quote,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Raqib qidirish', () => {
  it('offers only the teams the player captains and starts the game with the minimum', async () => {
    const api = stub({
      'POST /api/games': { id: 'g7' },
      'GET /api/games/g7': jsonResponse(404, null, 'x'),
    })
    const { router } = renderApp(URL)
    expect(await screen.findByRole('radio', { name: /Chilonzor Lions/ })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /Sergeli Atlas/ })).not.toBeInTheDocument()
    // No pitch price, no "tez orada": the team's own options from the quote.
    expect(screen.queryByText('Maydon narxi')).toBeNull()
    expect(screen.queryByText('155 000 soʻm')).toBeNull()
    expect(screen.queryByText(/tez orada/)).toBeNull()
    expect(api.queries(QUOTE)).toEqual([{ startsAt: tashkentToUtc(DATE, '20:00') }])
    const minimum = screen.getByRole('radio', { name: 'Minimal toʻlov: 55 000 soʻm' })
    expect(minimum).toBeChecked()
    expect(minimum).toHaveAccessibleDescription(
      'Qolgan 75 000 soʻmni keyin ilovada yoki maydonda naqd toʻlaysiz.',
    )
    expect(screen.getByRole('radio', { name: 'Toʻliq toʻlov: 130 000 soʻm' })).not.toBeChecked()
    expect(
      screen.getByText(/gacha bekor qilsangiz, jamoangiz toʻlagani toʻliq qaytariladi/),
    ).toBeInTheDocument()
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: 'Raqib qidirishni boshlash · 55 000 soʻm' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/games/g7'))
    expect(api.calls('POST /api/games')).toEqual([
      {
        stadiumId: SID,
        startsAt: tashkentToUtc(DATE, '20:00'),
        teamAId: 't1',
        cardId: 'c1',
        paymentOption: 'MINIMUM',
        type: 'team_vs_team',
        maxPlayers: 2,
      },
    ])
  })

  it('holds the full amount when the captain picks it', async () => {
    const api = stub({
      'POST /api/games': { id: 'g7' },
      'GET /api/games/g7': jsonResponse(404, null, 'x'),
    })
    renderApp(URL)
    fireEvent.click(await screen.findByRole('radio', { name: 'Toʻliq toʻlov: 130 000 soʻm' }))
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(
      screen.getByRole('button', { name: 'Raqib qidirishni boshlash · 130 000 soʻm' }),
    )
    await vi.waitFor(() => expect(api.calls('POST /api/games')).toHaveLength(1))
    expect(api.calls('POST /api/games')[0]).toMatchObject({ paymentOption: 'FULL' })
  })

  it('shows one card and sends FULL when only the full payment is offered', async () => {
    const api = stub({
      [QUOTE]: { ...quote, options: [quote.options[1]] },
      'POST /api/games': { id: 'g7' },
      'GET /api/games/g7': jsonResponse(404, null, 'x'),
    })
    renderApp(URL)
    expect(await screen.findByText('Toʻliq toʻlov: 130 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('Bu vaqt uchun faqat toʻliq toʻlov mavjud.')).toBeInTheDocument()
    expect(screen.queryByText(/Minimal toʻlov/)).toBeNull()
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(
      screen.getByRole('button', { name: 'Raqib qidirishni boshlash · 130 000 soʻm' }),
    )
    await vi.waitFor(() => expect(api.calls('POST /api/games')).toHaveLength(1))
    expect(api.calls('POST /api/games')[0]).toMatchObject({ paymentOption: 'FULL' })
  })

  it('treats a refused quote as a slot that is gone', async () => {
    stub({ [QUOTE]: jsonResponse(400, null, 'That time slot is already booked') })
    renderApp(URL)
    expect(await screen.findByText('Bu vaqt endi boʻsh emas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: START })).toBeNull()
  })

  it('retries a quote that failed to load', async () => {
    let fail = true
    stub({ [QUOTE]: () => (fail ? jsonResponse(500, null, 'Internal server error') : quote) })
    renderApp(URL)
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(
      await screen.findByRole('radio', { name: 'Minimal toʻlov: 55 000 soʻm' }),
    ).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: START }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Karta rad etildi')
  })

  it('sends the captain to Oʻyinlarim after a server error instead of a retry', async () => {
    stub({ 'POST /api/games': jsonResponse(500, null, 'Internal server error') })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: START }))
    expect(await screen.findByText('Natijani tekshiring')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: START })).not.toBeInTheDocument()
  })

  it('explains a taken slot', async () => {
    stub({ 'POST /api/games': jsonResponse(409, null, 'That time slot is already booked') })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: START }))
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
