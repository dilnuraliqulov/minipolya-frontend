import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '../api/bookings'
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
const SCHEDULE = 'GET /api/owner/dashboard/stadiums/s1/schedule'
const at = (hour: number) => ({
  startsAt: `${TODAY}T${String(hour - 5).padStart(2, '0')}:00:00Z`,
  endsAt: `${TODAY}T${String(hour - 4).padStart(2, '0')}:00:00Z`,
})
const partial = makeBooking({
  id: 'b1',
  stadiumId: 's1',
  clientName: 'Aziz Karimov',
  status: 'confirmed',
  paymentStatus: 'partially_paid',
  price: 15_500_000,
  paidAmount: 5_500_000,
  remainingAmount: 10_000_000,
  paidInCash: 0,
  ...at(16),
})
const later = new Date(Date.now() + 3 * 3600_000).toISOString()
const earlier = new Date(Date.now() - 3600_000).toISOString()

function stub(bookings: Booking[], overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': [stadium],
    [SCHEDULE]: [
      {
        date: TODAY,
        bookings,
        waitingGames: [],
        totalSlots: 4,
        bookedSlots: bookings.length,
        revenue: 0,
      },
    ],
    'GET /api/stadiums/s1/availability': {
      stadiumId: 's1',
      stadiumName: 'Bunyodkor Arena',
      date: TODAY,
      slots: [16, 17, 18, 19].map((h) =>
        makeSlot(`${h}:00`, { status: 'booked', available: false, pricePerHour: undefined }),
      ),
    },
    'GET /api/users/me': owner,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

async function openSheet(name = /Aziz Karimov/) {
  renderApp('/owner', { session })
  fireEvent.click(await screen.findByRole('button', { name }))
  return screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
}

describe('Jadval — remainder status chips (E10)', () => {
  it('shows Qoldiq, Naqd olindi, Toʻlanmadi and Toʻliq toʻlangan from the API fields', async () => {
    stub([
      partial,
      makeBooking({
        id: 'b2',
        clientName: 'Cash Client',
        paidInCash: 10_000_000,
        remainderMark: 'cash_received',
        ...at(17),
      }),
      makeBooking({
        id: 'b3',
        clientName: 'Unpaid Client',
        paymentStatus: 'partially_paid',
        paidAmount: 5_500_000,
        remainingAmount: 10_000_000,
        remainderMark: 'not_paid',
        ...at(18),
      }),
      makeBooking({ id: 'b4', clientName: 'Full Client', paidInCash: 0, ...at(19) }),
    ])
    renderApp('/owner', { session })
    const row = async (name: RegExp) => screen.findByRole('button', { name })
    expect(within(await row(/Aziz Karimov/)).getByText('Qoldiq: 100 000 soʻm')).toBeInTheDocument()
    expect(within(await row(/Cash Client/)).getByText('Naqd olindi')).toBeInTheDocument()
    expect(within(await row(/Unpaid Client/)).getByText('Toʻlanmadi')).toBeInTheDocument()
    expect(within(await row(/Full Client/)).getByText('Toʻliq toʻlangan')).toBeInTheDocument()
  })
})

describe('Jadval — Naqd olindi / Toʻlanmadi (E5–E8)', () => {
  it('offers both marks on a booking that still owes', async () => {
    stub([partial])
    const sheet = await openSheet()
    // The Qoldiq row already shows the amount, so no "Qoldiq: X" chip repeats it.
    expect(within(sheet).getByText('100 000 soʻm')).toBeInTheDocument()
    expect(within(sheet).queryByText('Qoldiq: 100 000 soʻm')).not.toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Naqd olindi' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Toʻlanmadi' })).toBeInTheDocument()
  })

  it('marks Toʻlanmadi only after confirming, then refreshes the schedule', async () => {
    const api = stub([partial], {
      'POST /api/owner/bookings/b1/not-paid': { ...partial, remainderMark: 'not_paid' },
    })
    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Toʻlanmadi' }))
    const confirm = await screen.findByRole('dialog', { name: 'Toʻlanmadi deb belgilash' })
    expect(confirm).toHaveTextContent('Mijoz qolgan 100 000 soʻmni toʻlamaganini belgilaysizmi?')
    expect(confirm).toHaveTextContent(/Aziz Karimov · 16:00–17:00 · Bunyodkor Arena\./)
    expect(confirm).toHaveTextContent(/Jarima olinmaydi/)
    expect(api.calls('POST /api/owner/bookings/b1/not-paid')).toHaveLength(0)
    const before = api.calls(SCHEDULE).length
    fireEvent.click(within(confirm).getByRole('button', { name: 'Toʻlanmadi' }))
    expect(await screen.findByText('Toʻlanmadi deb belgilandi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/bookings/b1/not-paid')).toHaveLength(1)
    await vi.waitFor(() => expect(api.calls(SCHEDULE).length).toBeGreaterThan(before))
  })

  it('goes back from the confirmation without marking', async () => {
    const api = stub([partial])
    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Naqd olindi' }))
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    expect(confirm).toHaveTextContent(/Bugun oxirigacha bekor qilish mumkin/)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Ortga' }))
    expect(await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })).toBeInTheDocument()
    expect(api.calls('POST /api/owner/bookings/b1/cash')).toHaveLength(0)
  })

  it('records Naqd olindi after confirming', async () => {
    const api = stub([partial], {
      'POST /api/owner/bookings/b1/cash': { ...partial, remainderMark: 'cash_received' },
    })
    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Naqd olindi' }))
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Naqd toʻlov qayd etildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/bookings/b1/cash')).toHaveLength(1)
  })

  it.each([
    [403, 'You do not own this stadium', 'Bu bron sizning maydoningizga tegishli emas.'],
    [409, 'Already paid', 'Bu toʻlov allaqachon qayd etilgan.'],
    [
      409,
      'This booking has no part payment to complete',
      'Bu bronda belgilanadigan qoldiq yoʻq — u bekor qilingan, muddati oʻtgan yoki toʻliq toʻlangan.',
    ],
  ])('maps %i "%s" from Toʻlanmadi', async (status, message, text) => {
    stub([partial], {
      'POST /api/owner/bookings/b1/not-paid': jsonResponse(status, null, message),
    })
    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Toʻlanmadi' }))
    const confirm = await screen.findByRole('dialog', { name: 'Toʻlanmadi deb belgilash' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Toʻlanmadi' }))
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it('shows the cash mark with "Bekor qilish" while the server allows it, and undoes it', async () => {
    const marked = {
      ...partial,
      paymentStatus: 'paid' as const,
      paidAmount: 15_500_000,
      remainingAmount: 0,
      paidInCash: 10_000_000,
      remainderMark: 'cash_received',
      remainderMarkedAt: earlier,
      remainderMarkUndoableUntil: later,
    }
    const api = stub([marked], {
      'DELETE /api/owner/bookings/b1/remainder-mark': partial,
    })
    const sheet = await openSheet()
    expect(within(sheet).getByText('Naqd olindi · 100 000 soʻm')).toBeInTheDocument()
    expect(within(sheet).getByText(/gacha bekor qilish mumkin/)).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Toʻlanmadi' })).not.toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Bekor qilish' }))
    expect(await screen.findByText('Belgi bekor qilindi')).toBeInTheDocument()
    expect(api.calls('DELETE /api/owner/bookings/b1/remainder-mark')).toHaveLength(1)
  })

  it('shows the last minute of the day the mark can be undone', async () => {
    const tomorrowEnd = new Date(Date.now() + 2 * 86_400_000)
    tomorrowEnd.setUTCHours(19, 0, 0, 0) // 00:00 Tashkent, the next midnight
    stub([
      {
        ...partial,
        remainderMark: 'not_paid',
        remainderMarkUndoableUntil: tomorrowEnd.toISOString(),
      },
    ])
    const sheet = await openSheet()
    expect(within(sheet).getByText('Toʻlanmadi deb belgilangan')).toBeInTheDocument()
    expect(within(sheet).getByText('Bugun 23:59 gacha bekor qilish mumkin')).toBeInTheDocument()
    // A Toʻlanmadi booking can still be marked cash later; not Toʻlanmadi again.
    expect(within(sheet).getByRole('button', { name: 'Naqd olindi' })).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Toʻlanmadi' })).not.toBeInTheDocument()
  })

  it('hides "Bekor qilish" once the undo window is over', async () => {
    stub([
      {
        ...partial,
        remainderMark: 'not_paid',
        remainderMarkUndoableUntil: earlier,
      },
    ])
    const sheet = await openSheet()
    expect(within(sheet).queryByRole('button', { name: 'Bekor qilish' })).not.toBeInTheDocument()
    expect(
      within(sheet).getByText('Belgini endi faqat administrator oʻzgartira oladi'),
    ).toBeInTheDocument()
  })

  it.each([
    [
      409,
      'Only an admin can change this mark',
      'Bu belgini endi faqat administrator oʻzgartira oladi.',
    ],
    [
      409,
      'This booking has no remainder mark',
      'Bu bronda belgi yoʻq — u allaqachon bekor qilingan.',
    ],
  ])('maps %i "%s" from the undo', async (status, message, text) => {
    stub([{ ...partial, remainderMark: 'not_paid', remainderMarkUndoableUntil: later }], {
      'DELETE /api/owner/bookings/b1/remainder-mark': jsonResponse(status, null, message),
    })
    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Bekor qilish' }))
    expect(await screen.findByText(text)).toBeInTheDocument()
  })
})

describe('Hisobot — unpaid list marks', () => {
  it('shows the Toʻlanmadi chip and still takes cash through the same confirmation', async () => {
    const notPaid = { ...partial, remainderMark: 'not_paid' }
    const api = stubApi({
      'GET /api/owner/stadiums': [stadium],
      'GET /api/owner/dashboard/stadiums/s1/stats': {
        todayBookings: 1,
        weekBookings: 1,
        monthBookings: 1,
        totalBookings: 1,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        averageRating: 0,
        reviewCount: 0,
        occupancyPercent: 0,
        todayPaidInApp: 0,
        todayPaidInCash: 0,
        todayOutstanding: 0,
        weekPaidInApp: 0,
        weekPaidInCash: 0,
        weekOutstanding: 0,
        monthPaidInApp: 0,
        monthPaidInCash: 0,
        monthOutstanding: 0,
      },
      'GET /api/owner/dashboard/stadiums/s1/revenue': { stadiumId: 's1', dailyRevenue: [] },
      'GET /api/owner/dashboard/stadiums/s1/bookings': {
        content: [notPaid],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
      'POST /api/owner/bookings/b1/cash': { ...notPaid, remainderMark: 'cash_received' },
      'GET /api/users/me': owner,
    })
    renderApp('/owner/report', { session })
    expect(await screen.findByText('Toʻlanmadi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Naqd olindi' }))
    const confirm = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    expect(confirm).toHaveTextContent(/Aziz Karimov · 16:00–17:00 · Bunyodkor Arena\./)
    fireEvent.click(within(confirm).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Naqd toʻlov qayd etildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/bookings/b1/cash')).toHaveLength(1)
  })
})
