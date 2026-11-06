import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OwnerStadium, OwnerStats } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { makeBooking } from '../test/bookings'
import { readySession, renderApp } from '../test/renderApp'
import { page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const session = readySession(makeUser({ isOwner: true }))
const stadium: OwnerStadium = { id: 's1', name: 'Bunyodkor Arena', status: 'approved' }
const stats: OwnerStats = {
  stadiumId: 's1',
  stadiumName: 'Bunyodkor Arena',
  todayBookings: 2,
  weekBookings: 10,
  monthBookings: 30,
  totalBookings: 50,
  todayRevenue: 30_000_000,
  weekRevenue: 150_000_000,
  monthRevenue: 400_000_000,
  totalRevenue: 900_000_000,
  averageRating: 4.5,
  reviewCount: 3,
  occupancyPercent: 40,
  todayPaidInApp: 20_000_000,
  todayPaidInCash: 10_000_000,
  todayOutstanding: 5_000_000,
  weekPaidInApp: 100_000_000,
  weekPaidInCash: 50_000_000,
  weekOutstanding: 7_000_000,
  monthPaidInApp: 300_000_000,
  monthPaidInCash: 100_000_000,
  monthOutstanding: 9_000_000,
}
const days = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    revenue: i === n - 1 ? 13_500_000 : 0,
    bookingCount: i === n - 1 ? 1 : 0,
  }))
const REVENUE = 'GET /api/owner/dashboard/stadiums/s1/revenue'
const UNPAID = 'GET /api/owner/dashboard/stadiums/s1/bookings'

function stub(routes: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': [stadium],
    'GET /api/owner/dashboard/stadiums/s1/stats': stats,
    [REVENUE]: { stadiumId: 's1', dailyRevenue: days(7) },
    [UNPAID]: page([]),
    ...routes,
  } as Parameters<typeof stubApi>[0])
}

describe('Hisobot', () => {
  it('shows the app / cash split and what is still owed for the period', async () => {
    stub()
    renderApp('/owner/report', { session })
    expect(await screen.findByText('Ilova orqali olingan')).toBeInTheDocument()
    expect(screen.getByText('200 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('100 000 soʻm')).toBeInTheDocument()
    expect(screen.getByText('50 000 soʻm')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Hafta' }))
    expect(screen.getByText('70 000 soʻm')).toBeInTheDocument()
  })

  it('charts 7 days, then 30 days, from ?days=', async () => {
    const api = stub({
      [REVENUE]: () => ({ stadiumId: 's1', dailyRevenue: days(7) }),
    })
    renderApp('/owner/report', { session })
    const table = await screen.findByRole('table', { name: 'Kunlik tushum' })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    expect(screen.getByText('Davr boʻyicha jami')).toBeInTheDocument()
    expect(api.queries(REVENUE)[0]).toMatchObject({ days: '7' })
    fireEvent.click(screen.getByRole('tab', { name: '30 kun' }))
    await waitFor(() => expect(api.queries(REVENUE).some((q) => q.days === '30')).toBe(true))
  })

  it('the chart has its own error state', async () => {
    let fail = true
    stub({
      [REVENUE]: () =>
        fail
          ? jsonResponse(400, null, 'days must be 7 or 30')
          : { stadiumId: 's1', dailyRevenue: days(7) },
    })
    renderApp('/owner/report', { session })
    await screen.findByText('Ilova orqali olingan')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('table', { name: 'Kunlik tushum' })).toBeInTheDocument()
  })

  it('lists unpaid remainders and records cash after confirming', async () => {
    const owing = makeBooking({ id: 'b7', clientName: 'Jasur', remainingAmount: 9_000_000 })
    let paid = false
    const api = stub({
      [UNPAID]: () => page(paid ? [] : [owing]),
      'POST /api/owner/bookings/b7/cash': () => {
        paid = true
        return { ...owing, remainingAmount: 0 }
      },
    })
    renderApp('/owner/report', { session })
    expect(await screen.findByText('Qoldiq: 90 000 soʻm')).toBeInTheDocument()
    expect(api.queries(UNPAID)[0]).toMatchObject({ unpaid: 'true' })
    fireEvent.click(screen.getByRole('button', { name: 'Naqd olindi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Naqd toʻlov qayd etildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/bookings/b7/cash')).toHaveLength(1)
    expect(await screen.findByText('Toʻlanmagan qoldiqlar yoʻq.')).toBeInTheDocument()
  })

  it('maps "Already paid" from the cash button', async () => {
    stub({
      [UNPAID]: page([makeBooking({ id: 'b7', remainingAmount: 9_000_000 })]),
      'POST /api/owner/bookings/b7/cash': jsonResponse(400, null, 'Already paid'),
    })
    renderApp('/owner/report', { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Naqd olindi' }))
    const sheet = await screen.findByRole('dialog', { name: 'Naqd toʻlovni tasdiqlash' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Tasdiqlash' }))
    expect(await screen.findByText('Bu toʻlov allaqachon qayd etilgan.')).toBeInTheDocument()
  })
})
