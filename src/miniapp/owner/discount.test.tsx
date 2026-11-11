import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OwnerStadium, Promotion } from '../api/owner'
import { tashkentToUtc, tashkentToday } from '../../shared/format'
import { makeUser, stubApi } from '../test/api'
import { readySession, renderApp } from '../test/renderApp'
import { makeSlot } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const owner = makeUser({ isOwner: true })
const session = readySession(owner)
const stadium: OwnerStadium = {
  id: 's1',
  name: 'Bunyodkor Arena',
  pricePerHour: 15_000_000,
  status: 'approved',
}
const TODAY = tashkentToday()
const START = tashkentToUtc(TODAY, '19:00')
/** The promotion covers exactly the hour: its end is one second before the next hour. */
const END = new Date(Date.parse(START) + 3_600_000 - 1000).toISOString()

const existing: Promotion = {
  id: 'pr1',
  stadiumId: 's1',
  name: '19:00 chegirmasi',
  discountPercent: 20,
  startsAt: START,
  endsAt: END,
  isActive: true,
}

function stub(discounted: boolean, overrides: Record<string, unknown> = {}) {
  const slot = discounted
    ? makeSlot('19:00', {
        pricePerHour: 12_400_000,
        originalPrice: 15_500_000,
        discountPercent: 20,
      })
    : makeSlot('19:00')
  return stubApi({
    'GET /api/owner/stadiums': [stadium],
    'GET /api/owner/dashboard/stadiums/s1/schedule': [
      { date: TODAY, bookings: [], waitingGames: [], totalSlots: 2, bookedSlots: 0, revenue: 0 },
    ],
    'GET /api/stadiums/s1/availability': {
      stadiumId: 's1',
      stadiumName: 'Bunyodkor Arena',
      date: TODAY,
      slots: [slot, makeSlot('20:00', { status: 'closed', available: false })],
    },
    'GET /api/owner/stadiums/s1/promotions': {
      content: discounted ? [existing] : [],
      page: 0,
      size: 100,
      totalElements: discounted ? 1 : 0,
      totalPages: 1,
    },
    'GET /api/users/me': owner,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

async function openSheet() {
  renderApp('/owner', { session })
  fireEvent.click(await screen.findByRole('button', { name: '19:00 narxini oʻzgartirish' }))
  return screen.findByRole('dialog', { name: 'Narxni oʻzgartirish' })
}

describe('Ega rejimi — Jadval — Narxni oʻzgartirish', () => {
  it('offers the price change only on free hours', async () => {
    stub(false)
    renderApp('/owner', { session })
    expect(
      await screen.findByRole('button', { name: '19:00 narxini oʻzgartirish' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '20:00 narxini oʻzgartirish' })).toBeNull()
  })

  it('sets a discount for exactly that hour through the promotions API', async () => {
    const api = stub(false, { 'POST /api/owner/stadiums/s1/promotions': existing })
    const sheet = await openSheet()
    expect(sheet).toHaveTextContent(`19:00–20:00`)
    // What players see now, straight from availability.
    expect(within(sheet).getByText('Oʻyinchilar koʻradi').parentElement).toHaveTextContent(
      '155 000 soʻm',
    )
    const save = within(sheet).getByRole('button', { name: 'Saqlash' })
    const field = within(sheet).getByLabelText('Chegirma (%)')
    fireEvent.change(field, { target: { value: '0' } })
    expect(save).toBeDisabled()
    fireEvent.change(field, { target: { value: '101' } })
    expect(save).toBeDisabled()
    fireEvent.change(field, { target: { value: '20' } })
    fireEvent.click(save)
    expect(await screen.findByText('Chegirma saqlandi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums/s1/promotions')).toEqual([
      { name: '19:00 chegirmasi', discountPercent: 20, startsAt: START, endsAt: END },
    ])
  })

  it('shows the current discount and removes it', async () => {
    const api = stub(true, { 'PUT /api/owner/promotions/pr1/deactivate': null })
    const sheet = await openSheet()
    const players = within(sheet).getByText('Oʻyinchilar koʻradi').parentElement!
    expect(players).toHaveTextContent('155 000 soʻm')
    expect(players).toHaveTextContent('124 000 soʻm')
    expect(players).toHaveTextContent('-20%')
    expect(within(sheet).getByLabelText('Chegirma (%)')).toHaveValue('20')
    fireEvent.click(await within(sheet).findByRole('button', { name: 'Chegirmani olib tashlash' }))
    expect(await screen.findByText('Chegirma olib tashlandi')).toBeInTheDocument()
    expect(api.calls('PUT /api/owner/promotions/pr1/deactivate')).toHaveLength(1)
  })

  it('replaces the hour’s discount: the old one is deactivated first', async () => {
    const api = stub(true, {
      'PUT /api/owner/promotions/pr1/deactivate': null,
      'POST /api/owner/stadiums/s1/promotions': { ...existing, id: 'pr2', discountPercent: 30 },
    })
    const sheet = await openSheet()
    await within(sheet).findByRole('button', { name: 'Chegirmani olib tashlash' })
    fireEvent.change(within(sheet).getByLabelText('Chegirma (%)'), { target: { value: '30' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Saqlash' }))
    expect(await screen.findByText('Chegirma saqlandi')).toBeInTheDocument()
    await waitFor(() =>
      expect(api.calls('POST /api/owner/stadiums/s1/promotions')).toEqual([
        { name: '19:00 chegirmasi', discountPercent: 30, startsAt: START, endsAt: END },
      ]),
    )
    expect(api.calls('PUT /api/owner/promotions/pr1/deactivate')).toHaveLength(1)
  })
})
