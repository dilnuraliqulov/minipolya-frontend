import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Challenge } from '../api/games'
import { jsonResponse, stubApi } from '../test/api'
import { makeCard } from '../test/bookings'
import { renderApp } from '../test/renderApp'
import { resetPendingJoins } from './pendingJoins'

afterEach(() => {
  vi.unstubAllGlobals()
  resetPendingJoins()
})

const challenge: Challenge = {
  gameId: 'g1',
  waitingTeamId: 't9',
  waitingTeamName: 'Yunusobod United',
  stadiumId: 's1',
  stadiumName: 'Yunusobod Sport Park',
  stadiumAddress: 'Amir Temur 1',
  format: '5x5',
  startsAt: '2026-11-06T15:00:00Z',
  endsAt: '2026-11-06T16:00:00Z',
  durationHours: 1,
  totalPrice: 31_000_000,
  amountToPayNow: 8_800_000,
  remainderAmount: 8_000_000,
}
const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})
const URL = '/challenges/g1?team=t1'
/** The backend's 202 is `success: false` with code PAYMENT_PENDING (PaymentPendingException). */
const pendingJoin = () =>
  new Response(
    JSON.stringify({
      success: false,
      data: null,
      code: 'PAYMENT_PENDING',
      message:
        "To'lov tasdiqlanmoqda. O'yin tasdiqlangani yoki bekor qilingani haqida xabar beramiz",
    }),
    { status: 202, headers: { 'Content-Type': 'application/json' } },
  )
const JOIN = 'POST /api/games/g1/join'

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/games/challenges': page([challenge]),
    'GET /api/teams/me': [{ id: 't1', name: 'Chilonzor Lions', memberCount: 3 }],
    'GET /api/teams/t1': {
      id: 't1',
      name: 'Chilonzor Lions',
      leaderId: '018f3a2c-0000-7000-8000-000000000001',
      members: [],
    },
    'GET /api/cards': [
      makeCard({ id: 'c1' }),
      makeCard({ id: 'c2', maskedNumber: '8600 •••• 5678' }),
    ],
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Raqibni qabul qilish', () => {
  it('shows both teams and the board figures, then accepts with the chosen card', async () => {
    const api = stub({ [JOIN]: { id: 'p1' }, 'GET /api/games/g1': jsonResponse(404, null, 'x') })
    const { router } = renderApp(URL)
    expect(await screen.findByText('Chilonzor Lions')).toBeInTheDocument()
    expect(screen.getByText('Yunusobod United')).toBeInTheDocument()
    const pay = screen.getByRole('region', { name: 'Toʻlov' })
    expect(within(pay).getByText('88 000 soʻm')).toBeInTheDocument()
    expect(within(pay).getByText('80 000 soʻm')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('radio', { name: /•••• 5678/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Toʻlash va qabul qilish · 88 000 soʻm' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/games/g1'))
    expect(api.calls(JOIN)).toEqual([{ gameId: 'g1', side: 'b', teamId: 't1', cardId: 'c2' }])
  })

  it('shows a declined card and stays', async () => {
    stub({
      [JOIN]: jsonResponse(
        400,
        null,
        'Card payment was declined; the game is still looking for an opponent',
      ),
    })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Karta rad etildi')
  })

  it('explains when the slot was taken', async () => {
    stub({ [JOIN]: jsonResponse(409, null, 'That time slot is already booked') })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    expect(await screen.findByText('Bu vaqt band boʻlib qoldi')).toBeInTheDocument()
  })

  it('explains the 3-hour cut-off', async () => {
    stub({
      [JOIN]: jsonResponse(
        400,
        null,
        "O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi",
      ),
    })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    expect(await screen.findByText('Oʻyinga 3 soatdan kam qoldi')).toBeInTheDocument()
  })

  it('sends the captain to Oʻyinlarim instead of offering a retry when no answer came', async () => {
    const api = stub({ [JOIN]: () => Promise.reject(new TypeError('Failed to fetch')) })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    expect(await screen.findByText('Natijani tekshiring')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Oʻyinlarimga oʻtish' })).toHaveAttribute(
      'href',
      '/games',
    )
    expect(
      screen.queryByRole('button', { name: /Toʻlash va qabul qilish/ }),
    ).not.toBeInTheDocument()
    expect(api.calls(JOIN)).toHaveLength(1)
  })

  it('on 202 PAYMENT_PENDING says the payment is being confirmed and never offers to pay again', async () => {
    let gameReads = 0
    const api = stub({
      [JOIN]: pendingJoin,
      'GET /api/games/g1': () => {
        gameReads++
        return jsonResponse(404, null, 'x')
      },
    })
    const { router } = renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    expect(await screen.findByText('Toʻlov tasdiqlanmoqda')).toBeInTheDocument()
    expect(
      screen.getByText('Toʻlov tasdiqlanmoqda. Natija bildirishnoma orqali keladi.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Toʻlash va qabul qilish/ })).toBeNull()
    expect(screen.queryByText('Natijani tekshiring')).toBeNull()

    // Coming back to the challenge: still no pay form.
    await router.navigate('/team')
    await router.navigate(URL)
    expect(await screen.findByText('Toʻlov tasdiqlanmoqda')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Toʻlash va qabul qilish/ })).toBeNull()

    // The game opens fresh from the server.
    fireEvent.click(screen.getByRole('button', { name: 'Oʻyinni ochish' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/games/g1'))
    await vi.waitFor(() => expect(gameReads).toBe(1))
    expect(api.calls(JOIN)).toHaveLength(1)
  })

  it('on the board, shows a pending join instead of "Qabul qilish"', async () => {
    stub({
      [JOIN]: pendingJoin,
      'GET /api/teams/t1': {
        id: 't1',
        name: 'Chilonzor Lions',
        leaderId: '018f3a2c-0000-7000-8000-000000000001',
        leaderName: 'Ali',
        members: [],
      },
    })
    const { router } = renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    await screen.findByText('Toʻlov tasdiqlanmoqda')
    await router.navigate('/team')
    expect(await screen.findByText('Yunusobod United')).toBeInTheDocument()
    expect(screen.getByText('Toʻlov tasdiqlanmoqda')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Qabul qilish' })).toBeNull()
  })

  it('shows "the payment system is down" as a warning and keeps the pay button', async () => {
    stub({
      [JOIN]: jsonResponse(
        502,
        null,
        "To'lov tizimi vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring",
      ),
    })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent('Toʻlov tizimi vaqtincha ishlamayapti')
    expect(notice).toHaveAttribute('data-tone', 'warning')
    expect(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ })).toBeEnabled()
  })

  it('says the challenge is gone when another team joined first', async () => {
    stub({ [JOIN]: jsonResponse(400, null, 'This game already has an opponent') })
    renderApp(URL)
    await screen.findByRole('radio', { name: /•••• 1234/ })
    fireEvent.click(screen.getByRole('button', { name: /Toʻlash va qabul qilish/ }))
    expect(await screen.findByText('Bu chaqiriq endi mavjud emas')).toBeInTheDocument()
  })

  it('says the challenge is gone when it is not on the board', async () => {
    stub({ 'GET /api/games/challenges': page([]) })
    renderApp(URL)
    expect(await screen.findByText('Bu chaqiriq endi mavjud emas')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub({
      'GET /api/games/challenges': () =>
        fail ? jsonResponse(500, null, 'Internal server error') : page([challenge]),
    })
    renderApp(URL)
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Yunusobod United')).toBeInTheDocument()
  })
})
