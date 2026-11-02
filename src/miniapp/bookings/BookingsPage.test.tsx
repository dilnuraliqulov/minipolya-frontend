import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, stubApi } from '../test/api'
import { makeBooking } from '../test/bookings'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const LIST = 'GET /api/bookings'
const page = (content: unknown[], n = 0, totalPages = 1) => ({
  content,
  page: n,
  size: 20,
  totalElements: content.length,
  totalPages,
})

const confirmed = makeBooking({
  id: 'b1',
  stadiumName: 'Bunyodkor Arena',
  status: 'confirmed',
  startsAt: '2026-11-06T15:00:00Z',
  endsAt: '2026-11-06T16:00:00Z',
})
const pending = makeBooking({ id: 'b2', stadiumName: 'Yunusobod Sport Park', status: 'pending' })
const cancelled = makeBooking({
  id: 'b3',
  stadiumName: 'Chilonzor Arena',
  status: 'cancelled_by_user',
})

describe('Oʻyinlarim — bookings', () => {
  it('lists the bookings in server order with date, time and status', async () => {
    stubApi({ 'GET /api/games/my': page([]), [LIST]: page([confirmed, pending, cancelled]) })
    renderApp('/games')
    expect(await screen.findByRole('heading', { level: 1, name: 'Oʻyinlarim' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Bronlar' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      'Bunyodkor Arena',
      'Yunusobod Sport Park',
      'Chilonzor Arena',
    ])
    expect(
      within(items[0] as HTMLElement).getByText('Juma, 6-noyabr · 20:00\u2060–\u206021:00'),
    ).toBeInTheDocument()
    expect(within(items[0] as HTMLElement).getByText('Tasdiqlangan')).toBeInTheDocument()
    expect(within(items[1] as HTMLElement).getByText('Kutilmoqda')).toBeInTheDocument()
    expect(within(items[2] as HTMLElement).getByText('Bekor qilingan')).toBeInTheDocument()
  })

  it('shows Kelgusi / Oʻtgan as coming soon and never asks for ?when', async () => {
    const api = stubApi({ 'GET /api/games/my': page([]), [LIST]: page([confirmed]) })
    renderApp('/games')
    await screen.findByText('Bunyodkor Arena')
    expect(screen.getByRole('tab', { name: 'Kelgusi' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'Oʻtgan' })).toBeDisabled()
    expect(screen.getByText(/tez orada/)).toBeInTheDocument()
    expect(api.queries(LIST).every((q) => !('when' in q))).toBe(true)
  })

  it('opens a booking', async () => {
    stubApi({ 'GET /api/games/my': page([]), [LIST]: page([confirmed]) })
    renderApp('/games')
    expect(await screen.findByRole('link', { name: /Bunyodkor Arena/ })).toHaveAttribute(
      'href',
      '/bookings/b1',
    )
  })

  it('loads the next page', async () => {
    const api = stubApi({
      'GET /api/games/my': page([]),
      [LIST]: (() => {
        let n = 0
        return () => (n++ === 0 ? page([confirmed], 0, 2) : page([pending], 1, 2))
      })(),
    })
    renderApp('/games')
    fireEvent.click(await screen.findByRole('button', { name: 'Yana koʻrsatish' }))
    expect(await screen.findByText('Yunusobod Sport Park')).toBeInTheDocument()
    expect(api.queries(LIST).map((q) => q.page)).toEqual(['0', '1'])
    expect(screen.queryByRole('button', { name: 'Yana koʻrsatish' })).not.toBeInTheDocument()
  })

  it('lists the games first, from their own endpoint', async () => {
    stubApi({
      'GET /api/games/my': page([
        {
          id: 'g1',
          type: 'team_vs_team',
          status: 'open',
          stadiumName: 'Bunyodkor Arena',
          startsAt: '2026-11-06T15:00:00Z',
          endsAt: '2026-11-06T16:00:00Z',
          isPublic: true,
        },
      ]),
      [LIST]: page([confirmed]),
    })
    renderApp('/games')
    const games = await screen.findByRole('list', { name: 'Oʻyinlar' })
    expect(within(games).getByRole('link', { name: /Bunyodkor Arena/ })).toHaveAttribute(
      'href',
      '/games/g1',
    )
    expect(within(games).getByText('Raqib kutilmoqda')).toBeInTheDocument()
    expect(
      within(games).getByText('Jamoa vs jamoa · Juma, 6-noyabr · 20:00\u2060–\u206021:00'),
    ).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    stubApi({ 'GET /api/games/my': page([]), [LIST]: new Promise(() => {}) as unknown as object })
    renderApp('/games')
    expect(screen.getByRole('status', { name: 'Yuklanmoqda' })).toBeInTheDocument()
  })

  it('has an empty state that leads to the pitches', async () => {
    stubApi({ 'GET /api/games/my': page([]), [LIST]: page([]) })
    const { router } = renderApp('/games')
    expect(await screen.findByText('Hali bronlar yoʻq')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Maydon topish' }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('shows the error state and retries', async () => {
    let fail = true
    stubApi({
      'GET /api/games/my': page([]),
      [LIST]: () => (fail ? jsonResponse(500, null, 'Internal server error') : page([confirmed])),
    })
    renderApp('/games')
    const retry = await screen.findByRole('button', { name: 'Qayta urinish' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByText('Bunyodkor Arena')).toBeInTheDocument()
  })
})
