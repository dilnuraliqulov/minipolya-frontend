import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { makeDetail, makeSlot, page } from '../test/stadiums'

vi.mock('./StadiumMap', () => ({ StadiumMap: () => null }))

const ID = '018f3a2c-0000-7000-8000-0000000000a1'
const AVAILABILITY = `GET /api/stadiums/${ID}/availability`
const complete = makeUser({ firstName: 'Aziz', lastName: 'Karimov', phone: '+998901234567' })

const SLOTS = [
  makeSlot('19:00', { available: false, pricePerHour: undefined }),
  makeSlot('20:00', { pricePerHour: 15_500_000 }),
  makeSlot('21:00', {
    pricePerHour: 13_500_000,
    originalPrice: 17_000_000,
    discountPercent: 20,
    promotionName: 'Kechki',
  }),
  makeSlot('22:00', { pricePerHour: 15_500_000, hasWaitingGame: true }),
]

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    [`GET /api/stadiums/${ID}`]: makeDetail(),
    [`GET /api/reviews/stadium/${ID}`]: page([]),
    [AVAILABILITY]: () => ({ stadiumId: ID, stadiumName: 'x', date: 'x', slots: SLOTS }),
    'GET /api/users/me': complete,
    ...overrides,
  })
}

const slot = (time: string) => screen.getByRole('radio', { name: new RegExp(`^${time}`) })

beforeEach(() => {
  // 10:00 in Tashkent on Sunday 1 November 2026.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-01T05:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Choosing a slot', () => {
  it('shows today to four weeks ahead and asks for today first', async () => {
    const api = stub()
    renderApp(`/stadiums/${ID}`)
    const strip = await screen.findByRole('radiogroup', { name: 'Sana' })
    const days = within(strip).getAllByRole('radio')
    expect(days).toHaveLength(29)
    expect(days[0]).toHaveAccessibleName(/Bugun/)
    expect(days[0]).toHaveAttribute('aria-checked', 'true')
    expect(days[1]).toHaveAccessibleName(/Ertaga/)
    expect(days[2]).toHaveAccessibleName(/Sesh/)
    await vi.waitFor(() => expect(api.queries(AVAILABILITY)).toEqual([{ date: '2026-11-01' }]))
    expect(screen.getByRole('heading', { name: 'Yakshanba, 1-noyabr' })).toBeInTheDocument()
  })

  it('loads another day when it is tapped', async () => {
    const api = stub()
    renderApp(`/stadiums/${ID}`)
    const strip = await screen.findByRole('radiogroup', { name: 'Sana' })
    fireEvent.click(within(strip).getAllByRole('radio')[28]!)
    await vi.waitFor(() => expect(api.queries(AVAILABILITY).at(-1)).toEqual({ date: '2026-11-29' }))
  })

  it('shows each hour with its price from the API; unavailable hours are disabled', async () => {
    stub()
    renderApp(`/stadiums/${ID}`)
    expect(await screen.findByRole('radio', { name: /^20:00–21:00/ })).toHaveAccessibleName(
      '20:00–21:00, 155 000 soʻm',
    )
    expect(slot('19:00')).toBeDisabled()
    expect(within(slot('19:00')).getByText('Boʻsh emas')).toBeInTheDocument()
    expect(within(slot('21:00')).getByText('170 000')).toBeInTheDocument()
    expect(within(slot('21:00')).getByText('-20%')).toBeInTheDocument()
    expect(within(slot('22:00')).getByText('Raqib qidirilmoqda')).toBeInTheDocument()
    expect(screen.getByText(/oʻsha oʻyin bekor qilinadi/)).toBeInTheDocument()
  })

  it('selects exactly one slot; another tap moves the selection', async () => {
    stub()
    renderApp(`/stadiums/${ID}`)
    const bar = () => screen.getByRole('button', { name: /Band qilish|Vaqtni tanlang/ })
    expect(await screen.findByRole('button', { name: 'Vaqtni tanlang' })).toBeDisabled()

    fireEvent.click(await screen.findByRole('radio', { name: /^20:00/ }))
    expect(slot('20:00')).toHaveAttribute('aria-checked', 'true')
    expect(bar()).toHaveTextContent('Band qilish · 20:00–21:00 · 155 000 soʻm')

    fireEvent.click(slot('21:00'))
    expect(slot('20:00')).toHaveAttribute('aria-checked', 'false')
    expect(slot('21:00')).toHaveAttribute('aria-checked', 'true')
    // The slot's own price — never a sum.
    expect(bar()).toHaveTextContent('Band qilish · 21:00–22:00 · 135 000 soʻm')
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(2) // the day and the slot
  })

  it('ignores a tap on an unavailable hour', async () => {
    stub()
    renderApp(`/stadiums/${ID}`)
    fireEvent.click(await screen.findByRole('radio', { name: /^19:00/ }))
    expect(screen.getByRole('button', { name: 'Vaqtni tanlang' })).toBeDisabled()
  })

  it('drops the selection when the day changes', async () => {
    stub()
    renderApp(`/stadiums/${ID}`)
    fireEvent.click(await screen.findByRole('radio', { name: /^20:00/ }))
    const strip = screen.getByRole('radiogroup', { name: 'Sana' })
    fireEvent.click(within(strip).getAllByRole('radio')[1]!)
    expect(await screen.findByRole('button', { name: 'Vaqtni tanlang' })).toBeDisabled()
  })

  it('says when a day has no free hour and offers the next day', async () => {
    const api = stub({
      [AVAILABILITY]: { stadiumId: ID, stadiumName: 'x', date: 'x', slots: [SLOTS[0]] },
    })
    renderApp(`/stadiums/${ID}`)
    expect(
      await screen.findByRole('heading', { name: 'Bu kunda boʻsh vaqt yoʻq' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dushanba, 2-noyabrni koʻrish' }))
    await vi.waitFor(() => expect(api.queries(AVAILABILITY).at(-1)).toEqual({ date: '2026-11-02' }))
  })

  it('shows an error for the slots and retries', async () => {
    let fail = true
    stub({
      [AVAILABILITY]: () =>
        fail
          ? jsonResponse(500, null, 'Internal server error')
          : { stadiumId: ID, stadiumName: 'x', date: 'x', slots: SLOTS },
    })
    renderApp(`/stadiums/${ID}`)
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('radio', { name: /^20:00/ })).toBeInTheDocument()
  })

  it('"Band qilish" goes to checkout ("Tez orada") when the profile is complete', async () => {
    stub()
    const { router } = renderApp(`/stadiums/${ID}`)
    fireEvent.click(await screen.findByRole('radio', { name: /^20:00/ }))
    fireEvent.click(screen.getByRole('button', { name: /Band qilish ·/ }))
    expect(await screen.findByRole('heading', { name: 'Tez orada' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/checkout')
    expect(Object.fromEntries(new URLSearchParams(router.state.location.search))).toEqual({
      stadium: ID,
      date: '2026-11-01',
      start: '20:00',
    })
  })

  it('"Band qilish" asks to complete the profile first', async () => {
    stub({ 'GET /api/users/me': makeUser() })
    const { router } = renderApp(`/stadiums/${ID}`)
    fireEvent.click(await screen.findByRole('radio', { name: /^20:00/ }))
    fireEvent.click(screen.getByRole('button', { name: /Band qilish ·/ }))
    expect(
      await screen.findByRole('dialog', { name: 'Profilingizni toʻldiring' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/stadiums/${ID}`)
  })
})
