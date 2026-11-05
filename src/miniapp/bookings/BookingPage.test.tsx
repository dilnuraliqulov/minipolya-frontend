import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { makeBooking, makeCard, makePayment } from '../test/bookings'
import { renderApp } from '../test/renderApp'
import { makeDetail } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const STADIUM_ID = '018f3a2c-0000-7000-8000-0000000000a1'
const BOOKING = 'GET /api/bookings/b1'
const STADIUM = `GET /api/stadiums/${STADIUM_ID}`
const stadium = makeDetail({
  id: STADIUM_ID,
  name: 'Bunyodkor Arena',
  address: 'Bunyodkor koʻchasi 12',
  phone: '+998712001020',
})
const partial = makeBooking({
  id: 'b1',
  stadiumId: STADIUM_ID,
  status: 'confirmed',
  paymentStatus: 'partially_paid',
  price: 15_500_000,
  paidAmount: 5_500_000,
  remainingAmount: 10_000_000,
  refundIfCancelledNow: 5_500_000,
})
const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

function stub(booking = partial, overrides: Record<string, unknown> = {}) {
  return stubApi({
    [BOOKING]: booking,
    [STADIUM]: stadium,
    'GET /api/cards': [makeCard({ id: 'c1' })],
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Booking detail', () => {
  it('shows the stadium, time, contacts and the payment card from the API', async () => {
    stub()
    renderApp('/bookings/b1')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Bunyodkor Arena' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Tasdiqlangan')).toBeInTheDocument()
    expect(screen.getByText('Juma, 6-noyabr · 20:00\u2060–\u206021:00')).toBeInTheDocument()
    expect(screen.getByText('1 soat')).toBeInTheDocument()
    expect(await screen.findByText('Bunyodkor koʻchasi 12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Qoʻngʻiroq/ })).toHaveAttribute(
      'href',
      'tel:+998712001020',
    )
    const pay = screen.getByRole('region', { name: 'Toʻlov' })
    expect(within(pay).getByText('155 000 soʻm')).toBeInTheDocument()
    expect(within(pay).getByText('55 000 soʻm')).toBeInTheDocument()
    expect(within(pay).getByText('100 000 soʻm')).toBeInTheDocument()
    expect(within(pay).getByText('Toʻlanmagan')).toBeInTheDocument()
  })

  it('renders without the stadium when its request fails', async () => {
    stub(partial, { [STADIUM]: jsonResponse(500, null, 'Internal server error') })
    renderApp('/bookings/b1')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Bunyodkor Arena' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Qoʻngʻiroq/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Qayta urinish' })).not.toBeInTheDocument()
  })

  it('pays the rest with a saved card', async () => {
    let paid = false
    const api = stub(partial, {
      [BOOKING]: () =>
        paid
          ? { ...partial, paymentStatus: 'paid', paidAmount: 15_500_000, remainingAmount: 0 }
          : partial,
      'POST /api/bookings/b1/pay-remainder': () => {
        paid = true
        return { ...partial, paymentStatus: 'paid', paidAmount: 15_500_000, remainingAmount: 0 }
      },
    })
    renderApp('/bookings/b1')
    fireEvent.click(await screen.findByRole('button', { name: 'Qolganini ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Toʻlash · 100 000 soʻm' }))
    expect(await screen.findByText('Toʻlov qabul qilindi')).toBeInTheDocument()
    expect(api.calls('POST /api/bookings/b1/pay-remainder')).toEqual([{ cardId: 'c1' }])
    expect(await screen.findByText('Toʻliq toʻlangan')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Qolganini ilovada toʻlash' }),
    ).not.toBeInTheDocument()
  })

  it('shows a declined remainder payment inside the sheet', async () => {
    stub(partial, {
      'POST /api/bookings/b1/pay-remainder': partial,
      'GET /api/payments/my': page([
        makePayment({ bookingId: 'b1', paymentType: 'remainder', status: 'failed' }),
      ]),
    })
    renderApp('/bookings/b1')
    fireEvent.click(await screen.findByRole('button', { name: 'Qolganini ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: /Toʻlash · / }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('Karta rad etildi')
  })

  it('says why the remainder was refused from declineReason, without reading the payments', async () => {
    const api = stub(
      { ...partial, paymentState: 'paid' },
      {
        'POST /api/bookings/b1/pay-remainder': {
          ...partial,
          paymentState: 'declined',
          declineReason: 'CARD_EXPIRED',
        },
      },
    )
    renderApp('/bookings/b1')
    fireEvent.click(await screen.findByRole('button', { name: 'Qolganini ilovada toʻlash' }))
    const sheet = await screen.findByRole('dialog', { name: 'Qolganini toʻlash' })
    fireEvent.click(await within(sheet).findByRole('button', { name: /Toʻlash · / }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      'Kartaning amal qilish muddati tugagan',
    )
    expect(api.calls('GET /api/payments/my')).toHaveLength(0)
  })

  it('reads a processing remainder from paymentState, without reading the payments', async () => {
    const api = stub({ ...partial, paymentState: 'processing' })
    renderApp('/bookings/b1')
    expect(await screen.findByText(/Toʻlov tekshirilmoqda/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Qolganini ilovada toʻlash' })).toBeNull()
    expect(api.calls('GET /api/payments/my')).toHaveLength(0)
  })

  it('does not offer pay-the-rest again while a remainder payment is processing', async () => {
    stub(partial, {
      'GET /api/payments/my': page([
        makePayment({ bookingId: 'b1', paymentType: 'remainder', status: 'processing' }),
      ]),
    })
    renderApp('/bookings/b1')
    expect(await screen.findByText(/Toʻlov tekshirilmoqda/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Qolganini ilovada toʻlash' }),
    ).not.toBeInTheDocument()
  })

  it('has no pay-the-rest button when paid in full', async () => {
    stub(makeBooking({ id: 'b1', stadiumId: STADIUM_ID }))
    renderApp('/bookings/b1')
    expect(await screen.findByText('Toʻliq toʻlangan')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Qolganini ilovada toʻlash' }),
    ).not.toBeInTheDocument()
  })

  it('cancel shows the API refund before and after', async () => {
    let cancelled = false
    const api = stub(partial, {
      [BOOKING]: () => (cancelled ? { ...partial, status: 'cancelled_by_user' } : partial),
      'POST /api/bookings/b1/cancel': () => {
        cancelled = true
        return { ...partial, status: 'cancelled_by_user', refundAmount: 5_500_000 }
      },
    })
    renderApp('/bookings/b1')
    expect(
      await screen.findByText('Hozir bekor qilsangiz: 55 000 soʻm qaytariladi'),
    ).toBeInTheDocument()
    expect(screen.getByText(/5-noyabr, 2099, 20:00 gacha bekor qilsangiz/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bronni bekor qilish' }))
    const sheet = await screen.findByRole('dialog', { name: 'Bronni bekor qilasizmi?' })
    expect(
      within(sheet).getByText('Hozir bekor qilsangiz: 55 000 soʻm qaytariladi'),
    ).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Ha, bekor qilish' }))
    expect(
      await screen.findByText('Bron bekor qilindi · 55 000 soʻm qaytarildi'),
    ).toBeInTheDocument()
    expect(api.calls('POST /api/bookings/b1/cancel')).toHaveLength(1)
    expect(await screen.findByText('Bekor qilingan')).toBeInTheDocument()
  })

  it('warns when nothing would come back', async () => {
    stub({ ...partial, refundIfCancelledNow: 0 })
    renderApp('/bookings/b1')
    expect(
      await screen.findByText('Hozir bekor qilsangiz, toʻlov qaytarilmaydi'),
    ).toBeInTheDocument()
  })

  it('gives the general rule, not a date in the past, once the deadline has passed', async () => {
    stub({
      ...partial,
      refundIfCancelledNow: 0,
      cancellationDeadline: new Date(Date.now() - 60 * 60_000).toISOString(),
    })
    renderApp('/bookings/b1')
    expect(
      await screen.findByText(/24 soat oldingacha bekor qilsangiz, toʻlov toʻliq qaytariladi/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/\d{2}:\d{2} gacha/)).not.toBeInTheDocument()
    expect(screen.getByText('Hozir bekor qilsangiz, toʻlov qaytarilmaydi')).toBeInTheDocument()
  })

  it('shows the hold for a pending booking and waits for R28 to pay', async () => {
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString()
    stub(
      makeBooking({
        id: 'b1',
        stadiumId: STADIUM_ID,
        status: 'pending',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 15_500_000,
        refundIfCancelledNow: 0,
        expiresAt,
      }),
    )
    renderApp('/bookings/b1')
    expect(await screen.findByText('Kutilmoqda')).toBeInTheDocument()
    expect(screen.getByText(/gacha yakunlang/)).toBeInTheDocument()
    expect(screen.getByText(/Bron yana 0[45]:\d\d saqlanadi/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toʻlash' })).toBeDisabled()
    expect(screen.getByText('Tez orada')).toBeInTheDocument()
  })

  it('shows a cancelled booking without actions', async () => {
    stub(
      makeBooking({
        id: 'b1',
        stadiumId: STADIUM_ID,
        status: 'cancelled_by_user',
        cancelledAt: '2026-11-04T10:00:00Z',
        refundIfCancelledNow: undefined,
      }),
    )
    renderApp('/bookings/b1')
    expect(await screen.findByText('Bekor qilingan')).toBeInTheDocument()
    expect(screen.getByText('Bekor qilingan: 4-noyabr, 2026, 15:00')).toBeInTheDocument()
    expect(screen.queryByText('Toʻliq toʻlangan')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bronni bekor qilish' })).not.toBeInTheDocument()
  })

  it('shows an expired booking without actions', async () => {
    stub(
      makeBooking({ id: 'b1', stadiumId: STADIUM_ID, status: 'expired', paymentStatus: 'unpaid' }),
    )
    renderApp('/bookings/b1')
    expect(await screen.findByText('Muddati oʻtgan')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bronni bekor qilish' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Qolganini ilovada toʻlash' }),
    ).not.toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    stub(partial, { [BOOKING]: new Promise(() => {}) })
    renderApp('/bookings/b1')
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })

  it('says the booking was not found on a 404', async () => {
    stub(partial, { [BOOKING]: jsonResponse(404, null, 'Booking not found') })
    renderApp('/bookings/b1')
    expect(await screen.findByText('Bron topilmadi')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub(partial, {
      [BOOKING]: () => (fail ? jsonResponse(500, null, 'Internal server error') : partial),
    })
    renderApp('/bookings/b1')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Bunyodkor Arena' }),
    ).toBeInTheDocument()
  })
})
