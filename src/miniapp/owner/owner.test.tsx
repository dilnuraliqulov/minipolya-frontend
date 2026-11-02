import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OwnerStadium, OwnerStats, PricingRule, ScheduleDay } from '../api/owner'
import { tashkentToUtc } from '../../shared/format'
import { tashkentToday } from '../stadiums/dates'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { makeBooking } from '../test/bookings'
import { readySession, renderApp } from '../test/renderApp'
import { makeSlot } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const owner = makeUser({ isOwner: true })
const session = readySession(owner)
const approved: OwnerStadium = {
  id: 's1',
  name: 'Bunyodkor Arena',
  district: 'Chilonzor',
  format: '7x7',
  surfaceType: 'artificial',
  pricePerHour: 15_000_000,
  playerPrice: 15_500_000,
  status: 'approved',
}
const rejected: OwnerStadium = {
  id: 's2',
  name: 'Sergeli Park',
  status: 'rejected',
  statusReason: 'Rasmlar yetarli emas',
}
const TODAY = tashkentToday()
const day: ScheduleDay = {
  date: TODAY,
  bookings: [
    makeBooking({
      id: 'b1',
      stadiumId: 's1',
      startsAt: `${TODAY}T15:00:00Z`,
      endsAt: `${TODAY}T16:00:00Z`,
      clientName: 'Sardor aka',
      clientPhone: '+998901234567',
      isWalkin: true,
      price: 15_000_000,
      paidAmount: 15_000_000,
      remainingAmount: 0,
    }),
  ],
  waitingGames: [],
  totalSlots: 14,
  bookedSlots: 1,
  revenue: 15_000_000,
}
const stats: OwnerStats = {
  stadiumId: 's1',
  stadiumName: 'Bunyodkor Arena',
  todayBookings: 9,
  weekBookings: 40,
  monthBookings: 150,
  totalBookings: 400,
  todayRevenue: 182_000_000,
  weekRevenue: 800_000_000,
  monthRevenue: 3_000_000_000,
  totalRevenue: 9_000_000_000,
  averageRating: 4.83,
  reviewCount: 128,
  occupancyPercent: 64.4,
}

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': [approved, rejected],
    'GET /api/owner/dashboard/stadiums/s1/schedule': [day],
    'GET /api/stadiums/s1/availability': {
      stadiumId: 's1',
      stadiumName: 'Bunyodkor Arena',
      date: TODAY,
      slots: [makeSlot('19:00'), makeSlot('20:00'), makeSlot('21:00')],
    },
    'GET /api/owner/dashboard/stadiums/s1/stats': stats,
    'GET /api/users/me': owner,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('Ega rejimi — Jadval', () => {
  it('shows the day with bookings in their hour and free hours', async () => {
    stub()
    renderApp('/owner', { session })
    expect(await screen.findByRole('heading', { level: 1, name: 'Jadval' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Jadval' })
    expect(within(list).getByText('Sardor aka')).toBeInTheDocument()
    expect(within(list).getAllByText('Boʻsh')).toHaveLength(2)
    expect(screen.getByText('Band: 1/14 · Tushum: 150 000 soʻm')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Ega rejimi boʻlimlari' })).toBeInTheDocument()
  })

  it('adds a walk-in for a free hour', async () => {
    const api = stub({ 'POST /api/owner/stadiums/s1/bookings': makeBooking() })
    renderApp('/owner', { session })
    const list = await screen.findByRole('list', { name: 'Jadval' })
    fireEvent.click(within(list).getAllByText('Boʻsh')[0] as HTMLElement)
    const sheet = await screen.findByRole('dialog', { name: 'Qoʻlda band qilish' })
    fireEvent.change(within(sheet).getByLabelText('Mijoz ismi'), { target: { value: 'Aziz' } })
    fireEvent.change(within(sheet).getByLabelText('Mijoz telefoni'), {
      target: { value: '+998901112233' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Bron qoʻshildi')).toBeInTheDocument()
    const [body] = api.calls('POST /api/owner/stadiums/s1/bookings') as Array<
      Record<string, string>
    >
    expect(body).toMatchObject({
      clientName: 'Aziz',
      clientPhone: '+998901112233',
      startsAt: tashkentToUtc(TODAY, '19:00'),
    })
    expect(body?.paymentMethod).toBeUndefined()
  })

  it('opens a booking, keeps cash for R37 and cancels with a full refund', async () => {
    const api = stub({
      'DELETE /api/owner/bookings/b1': makeBooking({ status: 'cancelled_by_owner' }),
    })
    renderApp('/owner', { session })
    fireEvent.click(await screen.findByRole('button', { name: /Sardor aka/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
    expect(within(sheet).getByRole('link', { name: /\+998901234567/ })).toHaveAttribute(
      'href',
      'tel:+998901234567',
    )
    fireEvent.click(within(sheet).getByRole('button', { name: 'Bronni bekor qilish' }))
    const confirm = await screen.findByRole('dialog', { name: 'Bronni bekor qilasizmi?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Bronni bekor qilish' }))
    expect(await screen.findByText('Bron bekor qilindi')).toBeInTheDocument()
    expect(api.calls('DELETE /api/owner/bookings/b1')).toHaveLength(1)
  })

  it('shows the owner’s own price, and the player price only as “Oʻyinchi toʻlaydi”', async () => {
    const own = makeBooking({
      ...day.bookings[0],
      id: 'b1',
      ownerPrice: 14_000_000,
      price: 15_000_000,
    })
    stub({ 'GET /api/owner/dashboard/stadiums/s1/schedule': [{ ...day, bookings: [own] }] })
    renderApp('/owner', { session })
    const row = await screen.findByRole('button', { name: /Sardor aka/ })
    expect(row).toHaveTextContent('140 000 soʻm')
    expect(row).not.toHaveTextContent('150 000 soʻm')
    fireEvent.click(row)
    const sheet = await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
    const price = within(sheet).getByText('Narx').closest('div')!
    expect(price).toHaveTextContent('140 000 soʻm')
    expect(within(sheet).getByText('Oʻyinchi toʻlaydi').closest('div')).toHaveTextContent(
      '150 000 soʻm',
    )
  })

  it('never shows the player price as the owner’s when ownerPrice is missing', async () => {
    const bare = makeBooking({ ...day.bookings[0], id: 'b1', price: 15_000_000 })
    delete (bare as { ownerPrice?: number }).ownerPrice
    stub({ 'GET /api/owner/dashboard/stadiums/s1/schedule': [{ ...day, bookings: [bare] }] })
    renderApp('/owner', { session })
    const row = await screen.findByRole('button', { name: /Sardor aka/ })
    expect(row).not.toHaveTextContent('150 000 soʻm')
    fireEvent.click(row)
    const sheet = await screen.findByRole('dialog', { name: 'Bron tafsilotlari' })
    expect(within(sheet).queryByText('Narx')).not.toBeInTheDocument()
    expect(sheet).not.toHaveTextContent('150 000 soʻm')
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stub({
      'GET /api/owner/stadiums': () =>
        fail ? jsonResponse(500, null, 'Internal server error') : [approved],
    })
    renderApp('/owner', { session })
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('list', { name: 'Jadval' })).toBeInTheDocument()
  })

  it('an owner without stadiums is offered to add one', async () => {
    stub({ 'GET /api/owner/stadiums': [] })
    const { router } = renderApp('/owner', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Yangi maydon qoʻshish' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/owner/new'))
  })
})

describe('Ega rejimi — Jadval details', () => {
  it('an expired hold does not hide the live booking or the free hour', async () => {
    const at = (h: string) => tashkentToUtc(TODAY, h)
    stub({
      'GET /api/owner/dashboard/stadiums/s1/schedule': [
        {
          ...day,
          bookings: [
            makeBooking({
              id: 'x1',
              status: 'expired',
              startsAt: at('19:00'),
              endsAt: at('20:00'),
            }),
            makeBooking({
              id: 'x2',
              status: 'confirmed',
              clientName: 'Aziz',
              startsAt: at('19:00'),
              endsAt: at('20:00'),
              ownerPrice: 15_000_000,
              price: 15_500_000,
            }),
            makeBooking({
              id: 'x3',
              status: 'expired',
              startsAt: at('20:00'),
              endsAt: at('21:00'),
            }),
          ],
        },
      ],
    })
    renderApp('/owner', { session })
    const list = await screen.findByRole('list', { name: 'Jadval' })
    expect(within(list).getByText('Aziz')).toBeInTheDocument()
    expect(within(list).getByText('150 000 soʻm')).toBeInTheDocument()
    expect(within(list).getAllByText('Boʻsh')).toHaveLength(2)
  })

  it('warns before a walk-in on an hour a team is waiting on', async () => {
    stub({
      'GET /api/owner/dashboard/stadiums/s1/schedule': [
        {
          ...day,
          bookings: [],
          waitingGames: [
            {
              gameId: 'g1',
              teamName: 'Team Alpha',
              startsAt: tashkentToUtc(TODAY, '20:00'),
              endsAt: tashkentToUtc(TODAY, '21:00'),
            },
          ],
        },
      ],
    })
    renderApp('/owner', { session })
    fireEvent.click(await screen.findByText('Jamoa kutmoqda'))
    const sheet = await screen.findByRole('dialog', { name: 'Qoʻlda band qilish' })
    expect(within(sheet).getByRole('alert')).toHaveTextContent('ularning oʻyini bekor qilinadi')
  })
})

describe('Ega rejimi — Maydonim', () => {
  it('shows the status banner with the reason for a rejected stadium', async () => {
    stub()
    renderApp('/owner/stadium?stadium=s2', { session })
    expect(await screen.findByText('Rad etildi')).toBeInTheDocument()
    expect(screen.getByText('Sabab: Rasmlar yetarli emas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ish vaqti/ })).toBeDisabled()
  })

  it('lists pricing rules in owner prices and adds one in soʻm', async () => {
    const rule: PricingRule = {
      id: 'r1',
      stadiumId: 's1',
      dayOfWeek: 4,
      startTime: '18:00:00',
      endTime: '23:00:00',
      pricePerHour: 18_000_000,
      playerPrice: 18_600_000,
      isActive: true,
    }
    const api = stub({
      'GET /api/owner/stadiums/s1/pricing': [rule],
      'POST /api/owner/stadiums/s1/pricing': rule,
    })
    renderApp('/owner/stadium/s1/prices', { session })
    expect(await screen.findByText('Juma, 18:00–23:00')).toBeInTheDocument()
    expect(screen.getByText('180 000 soʻm')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Narx qoidasi qoʻshish' }))
    const sheet = await screen.findByRole('dialog', { name: 'Narx qoidasi qoʻshish' })
    fireEvent.change(within(sheet).getByLabelText('Soatlik narx (soʻm)'), {
      target: { value: '200 000' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Qoʻshish' }))
    expect(await screen.findByText('Narx qoidasi qoʻshildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums/s1/pricing')).toEqual([
      { dayOfWeek: 0, startTime: '18:00:00', endTime: '23:00:00', pricePerHour: 20_000_000 },
    ])
  })

  it('edits the details with the save button in the bottom bar', async () => {
    const api = stub({ 'PUT /api/owner/stadiums/s1': { id: 's1' } })
    renderApp('/owner/stadium/s1/info', { session })
    const name = await screen.findByLabelText('Maydon nomi')
    fireEvent.change(name, { target: { value: 'Bunyodkor Arena 2' } })
    fireEvent.change(screen.getByLabelText('Manzil'), { target: { value: 'Bunyodkor 1' } })
    const save = screen.getByRole('button', { name: 'Saqlash' })
    expect(save.closest('main')).toBeNull()
    fireEvent.click(save)
    expect(await screen.findByText('Saqlandi')).toBeInTheDocument()
    expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([
      {
        name: 'Bunyodkor Arena 2',
        address: 'Bunyodkor 1',
        district: 'Chilonzor',
        format: '7x7',
        surfaceType: 'artificial',
      },
    ])
  })

  it('sets the minimum booking amount in soʻm and sends tiyin', async () => {
    const api = stub({
      'GET /api/owner/stadiums/s1/pricing': [],
      'PUT /api/owner/stadiums/s1': { id: 's1' },
    })
    renderApp('/owner/stadium/s1/prices', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Oldindan toʻlov' }))
    const sheet = await screen.findByRole('dialog', { name: 'Oldindan toʻlov' })
    fireEvent.change(within(sheet).getByLabelText('Eng kam toʻlov (soʻm)'), {
      target: { value: '50 000' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Saqlandi')).toBeInTheDocument()
    expect(api.calls('PUT /api/owner/stadiums/s1')).toEqual([{ minBookingAmount: 5_000_000 }])
  })

  it('explains the API floor when the minimum is too low', async () => {
    stub({
      'GET /api/owner/stadiums/s1/pricing': [],
      'PUT /api/owner/stadiums/s1': jsonResponse(
        400,
        null,
        "minBookingAmount must be at least 50000 tiyin (500 so'm)",
      ),
    })
    renderApp('/owner/stadium/s1/prices', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Oldindan toʻlov' }))
    const sheet = await screen.findByRole('dialog', { name: 'Oldindan toʻlov' })
    fireEvent.change(within(sheet).getByLabelText('Eng kam toʻlov (soʻm)'), {
      target: { value: '100' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Saqlash' }))
    expect(await within(sheet).findByRole('alert')).toHaveTextContent('kamida 500 soʻm')
  })
})

describe('Ega rejimi — Hisobot', () => {
  it('shows the totals per period from the stats', async () => {
    stub()
    renderApp('/owner/report', { session })
    expect(await screen.findByText('9')).toBeInTheDocument()
    expect(screen.getByText('1 820 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('★ 4.8 (128)')).toBeInTheDocument()
    expect(screen.getByText('64%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Hafta' }))
    expect(screen.getByText('40')).toBeInTheDocument()
  })
})

describe('Maydon qoʻshish', () => {
  it('walks the steps and submits the stadium in tiyin', async () => {
    const api = stub({ 'POST /api/owner/stadiums': { id: 's9' } })
    renderApp('/owner/new', { session })
    fireEvent.change(await screen.findByLabelText('Maydon nomi'), {
      target: { value: 'Yangi Arena' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    fireEvent.change(screen.getByLabelText('Manzil'), { target: { value: 'Navoiy 5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    fireEvent.change(screen.getByLabelText('Soatlik narx (soʻm)'), { target: { value: '150 000' } })
    fireEvent.change(screen.getByLabelText('Oldindan toʻlov (soʻm, ixtiyoriy)'), {
      target: { value: '50000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Davom etish' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tekshiruvga yuborish' }))
    expect(await screen.findByText('Maydon tekshiruvga yuborildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums')).toEqual([
      {
        name: 'Yangi Arena',
        address: 'Navoiy 5',
        format: '5x5',
        surfaceType: 'artificial',
        openTime: '08:00:00',
        closeTime: '23:00:00',
        pricePerHour: 15_000_000,
        minBookingAmount: 5_000_000,
        cancellationHours: 24,
      },
    ])
  })
})
