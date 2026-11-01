import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tashkentToUtc } from '../../shared/format'
import { nextDate, tashkentToday } from '../stadiums/dates'
import { jsonResponse, stubApi } from '../test/api'
import { makeBooking, makeCard, makePayment } from '../test/bookings'
import { installFakeTelegram, removeFakeTelegram } from '../test/fakeTelegram'
import { renderApp } from '../test/renderApp'
import { makeDetail, makeSlot } from '../test/stadiums'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  removeFakeTelegram()
})

const ID = '018f3a2c-0000-7000-8000-0000000000a1'
const DATE = nextDate(tashkentToday())
const URL = `/checkout?stadium=${ID}&date=${DATE}&start=20:00`
const DETAIL = `GET /api/stadiums/${ID}`
const AVAILABILITY = `GET /api/stadiums/${ID}/availability`
const CARDS = 'GET /api/cards'
const BOOK = 'POST /api/bookings'
const PAYMENTS = 'GET /api/payments/my'

const stadium = makeDetail({
  id: ID,
  name: 'Bunyodkor Arena',
  minBookingAmount: 5_500_000,
  cancellationPolicy: { cancellationHours: 24 },
})
const availability = {
  stadiumId: ID,
  stadiumName: 'Bunyodkor Arena',
  date: DATE,
  slots: [makeSlot('19:00'), makeSlot('20:00', { pricePerHour: 15_500_000 })],
}
const cards = [
  makeCard({ id: 'c1', maskedNumber: '8600 •••• 1234', cardType: 'humo' }),
  makeCard({ id: 'c2', maskedNumber: '8600 •••• 5678', cardType: 'uzcard' }),
]
const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    [DETAIL]: stadium,
    [AVAILABILITY]: availability,
    [CARDS]: cards,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

const payButton = () => screen.findByRole('button', { name: /^Toʻlash · / })

describe('Checkout', () => {
  it('shows the summary, both payment options, the remainder note and the cancellation rule', async () => {
    stub()
    renderApp(URL)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bron qilish' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Bunyodkor Arena')).toBeInTheDocument()
    expect(screen.getByText('20:00–21:00')).toBeInTheDocument()
    expect(screen.getByText('1 soat')).toBeInTheDocument()
    expect(screen.getByText('155 000 soʻm')).toBeInTheDocument()
    const deposit = screen.getByRole('radio', { name: 'Oldindan toʻlov: 55 000 soʻm' })
    const full = screen.getByRole('radio', { name: 'Toʻliq toʻlov: 155 000 soʻm' })
    expect(deposit).toBeChecked()
    expect(full).not.toBeChecked()
    expect(screen.getByText(/Qolgan summani keyin ilovada/)).toBeInTheDocument()
    expect(screen.getByText(/24 soat oldingacha bekor qilsangiz/)).toBeInTheDocument()
    expect(await payButton()).toHaveTextContent('Toʻlash · 55 000 soʻm')

    fireEvent.click(full)
    expect(full).toBeChecked()
    expect(screen.queryByText(/Qolgan summani keyin ilovada/)).not.toBeInTheDocument()
    expect(await payButton()).toHaveTextContent('Toʻlash · 155 000 soʻm')
  })

  it('offers only full payment when the stadium has no minimum', async () => {
    stub({ [DETAIL]: makeDetail({ id: ID, minBookingAmount: undefined }) })
    renderApp(URL)
    expect(await screen.findByRole('radio', { name: 'Toʻliq toʻlov: 155 000 soʻm' })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /Oldindan toʻlov/ })).not.toBeInTheDocument()
    expect(screen.getByText('Bu maydon toʻliq toʻlovni talab qiladi.')).toBeInTheDocument()
  })

  it('creates and pays the booking with the chosen card and option', async () => {
    const api = stub({ [BOOK]: makeBooking({ paymentStatus: 'partially_paid' }) })
    const { router } = renderApp(URL)
    fireEvent.click(await screen.findByRole('radio', { name: /•••• 5678/ }))
    fireEvent.click(await payButton())
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/checkout/done'))
    expect(api.calls(BOOK)).toEqual([
      {
        stadiumId: ID,
        startsAt: tashkentToUtc(DATE, '20:00'),
        cardId: 'c2',
        paymentOption: 'MINIMUM',
      },
    ])
  })

  it('shows Toʻlanmoqda… while the payment runs and pays once', async () => {
    let release: (value: unknown) => void = () => {}
    const api = stub({ [BOOK]: () => new Promise((resolve) => (release = resolve)) })
    renderApp(URL)
    const pay = await payButton()
    fireEvent.click(pay)
    expect(await screen.findByRole('button', { name: /Toʻlanmoqda…/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Toʻlanmoqda…/ }))
    release(makeBooking())
    await vi.waitFor(() => expect(api.calls(BOOK)).toHaveLength(1))
  })

  it('keeps the form while paying even if a background refetch fails', async () => {
    let release: (value: unknown) => void = () => {}
    let cardsFail = false
    stub({
      [BOOK]: () => new Promise((resolve) => (release = resolve)),
      [CARDS]: () => (cardsFail ? jsonResponse(500, null, 'Internal server error') : cards),
    })
    const { router, queryClient } = renderApp(URL)
    fireEvent.click(await payButton())
    await screen.findByRole('button', { name: /Toʻlanmoqda…/ })
    cardsFail = true
    await queryClient.invalidateQueries()
    expect(screen.getByRole('button', { name: /Toʻlanmoqda…/ })).toBeInTheDocument()
    expect(screen.queryByText('Qayta urinish')).not.toBeInTheDocument()
    release(makeBooking())
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/checkout/done'))
  })

  it('pays with a just-added card before the card list refetch lands', async () => {
    const added = makeCard({ id: 'c9', maskedNumber: '8600 •••• 9012' })
    let calls = 0
    const api = stub({
      [CARDS]: () => (calls++ === 0 ? cards : new Promise(() => {})),
      'POST /api/cards': { bindingId: 'b1', maskedPhone: '********9999' },
      'POST /api/cards/confirm': added,
      [BOOK]: makeBooking(),
    })
    renderApp(URL)
    fireEvent.click(await screen.findByRole('button', { name: /Karta qoʻshish/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Karta raqami'), {
      target: { value: '8600123456789012' },
    })
    fireEvent.change(within(dialog).getByLabelText(/Amal qilish muddati/), {
      target: { value: '1227' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Davom etish' }))
    fireEvent.change(await screen.findByLabelText('SMS kod'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByRole('radio', { name: /•••• 9012/ })).toBeChecked()
    fireEvent.click(await payButton())
    await vi.waitFor(() => expect(api.calls(BOOK)).toHaveLength(1))
    expect(api.calls(BOOK)[0]).toMatchObject({ cardId: 'c9' })
  })

  it('ignores Back while paying', async () => {
    const telegram = installFakeTelegram()
    let release: (value: unknown) => void = () => {}
    stub({ [BOOK]: () => new Promise((resolve) => (release = resolve)) })
    const { router } = renderApp(URL)
    fireEvent.click(await payButton())
    await screen.findByRole('button', { name: /Toʻlanmoqda…/ })
    telegram.backButton.click()
    expect(router.state.location.pathname).toBe('/checkout')
    release(makeBooking())
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/checkout/done'))
  })

  it('shows a declined card with the hold countdown and no retry yet', async () => {
    const expiresAt = new Date(Date.now() + 9 * 60_000 + 30_000).toISOString()
    stub({
      [BOOK]: makeBooking({ status: 'pending', paymentStatus: 'unpaid', paidAmount: 0, expiresAt }),
      [PAYMENTS]: page([makePayment({ status: 'failed' })]),
    })
    renderApp(URL)
    fireEvent.click(await payButton())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Toʻlov amalga oshmadi')
    expect(alert).toHaveTextContent('Karta rad etildi')
    expect(screen.getByText(/Bron 09:(29|30) davomida saqlanadi/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Qayta urinish/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Boshqa karta/ })).toBeDisabled()
    expect(screen.getAllByText('Tez orada').length).toBeGreaterThan(0)
  })

  it('sends the player back to the slots when the hour was taken', async () => {
    const api = stub({ [BOOK]: jsonResponse(409, null, 'Slot is already booked') })
    const { router } = renderApp(URL)
    fireEvent.click(await payButton())
    expect(await screen.findByText('Bu vaqt band boʻlib qoldi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bronlarim' })).toHaveAttribute('href', '/games')
    const before = api.queries(AVAILABILITY).length
    fireEvent.click(screen.getByRole('button', { name: 'Boshqa vaqt tanlash' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/stadiums/${ID}`))
    expect(router.state.location.search).toBe(`?date=${DATE}`)
    await vi.waitFor(() => expect(api.queries(AVAILABILITY).length).toBeGreaterThan(before))
  })

  it('offers Qayta urinish after a network error and re-posts once', async () => {
    let calls = 0
    const api = stub({
      [BOOK]: () => {
        calls += 1
        if (calls === 1) throw new TypeError('Failed to fetch')
        return makeBooking()
      },
    })
    const { router } = renderApp(URL)
    fireEvent.click(await payButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Internet aloqasi yoʻq')
    fireEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/checkout/done'))
    expect(api.calls(BOOK)).toHaveLength(2)
  })

  it('shows Toʻlov tekshirilmoqda when the payment is still processing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const pending = makeBooking({ status: 'pending', paymentStatus: 'unpaid', paidAmount: 0 })
    stub({
      [BOOK]: pending,
      [PAYMENTS]: page([makePayment({ status: 'processing' })]),
      [`GET /api/bookings/${pending.id}`]: pending,
    })
    renderApp(URL)
    fireEvent.click(await payButton())
    await vi.advanceTimersByTimeAsync(16_000)
    expect(await screen.findByText('Toʻlov tekshirilmoqda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bronni koʻrish' })).toHaveAttribute(
      'href',
      `/bookings/${pending.id}`,
    )
  })

  it('asks for a card first when there is none, and selects a newly added one', async () => {
    const added = makeCard({ id: 'c9', maskedNumber: '8600 •••• 9012' })
    let saved = false
    stub({
      [CARDS]: () => (saved ? [added] : []),
      'POST /api/cards': { bindingId: 'b1', maskedPhone: '********9999' },
      'POST /api/cards/confirm': () => {
        saved = true
        return added
      },
    })
    renderApp(URL)
    expect(await screen.findByText('Toʻlash uchun avval karta qoʻshing')).toBeInTheDocument()
    expect(await payButton()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Karta qoʻshish/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Karta raqami'), {
      target: { value: '8600123456789012' },
    })
    fireEvent.change(within(dialog).getByLabelText(/Amal qilish muddati/), {
      target: { value: '1227' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Davom etish' }))
    fireEvent.change(await screen.findByLabelText('SMS kod'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByRole('radio', { name: /•••• 9012/ })).toBeChecked()
  })

  it.each([
    ['a garbage date', `/checkout?stadium=${ID}&date=garbage&start=20:00`],
    ['no start', `/checkout?stadium=${ID}&date=${DATE}`],
  ])('explains %s and links back to the slots', async (_, path) => {
    stub()
    const { router } = renderApp(path)
    expect(await screen.findByText('Vaqt tanlanmagan')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vaqtni tanlash' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/stadiums/${ID}`))
  })

  it('says the hour is no longer free when availability has it booked', async () => {
    stub({
      [AVAILABILITY]: {
        ...availability,
        slots: [makeSlot('20:00', { available: false, status: 'booked', pricePerHour: undefined })],
      },
    })
    renderApp(URL)
    expect(await screen.findByText('Bu vaqt endi boʻsh emas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vaqtni tanlash' })).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub({
      [DETAIL]: () => (fail ? jsonResponse(500, null, 'Internal server error') : stadium),
    })
    renderApp(URL)
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Bunyodkor Arena')).toBeInTheDocument()
  })
})
