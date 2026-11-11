import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Closure, OwnerStadium } from '../api/owner'
import { jsonResponse, makeUser, stubApi } from '../test/api'
import { readySession, renderApp } from '../test/renderApp'
import { tashkentToday } from '../../shared/format'

afterEach(() => {
  vi.unstubAllGlobals()
})

const owner = makeUser({ isOwner: true })
const session = readySession(owner)
const stadium: OwnerStadium = { id: 's1', name: 'Bunyodkor Arena', status: 'approved' }
const TODAY = tashkentToday()
const closures: Closure[] = [
  { id: 'c2', stadiumId: 's1', startDate: '2026-12-31', endDate: '2027-01-02', reason: 'Bayram' },
  { id: 'c1', stadiumId: 's1', startDate: '2026-12-10', endDate: '2026-12-10' },
]

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/owner/stadiums': [stadium],
    'GET /api/owner/stadiums/s1/closures': closures,
    'GET /api/users/me': owner,
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

const PAGE = '/owner/stadium/s1/closures'

describe('Ega rejimi — Yopiq kunlar', () => {
  it('lists closures by start date: a range as "from – to", the reason or "Butun kun"', async () => {
    stub()
    renderApp(PAGE, { session })
    const list = await screen.findByRole('list', { name: 'Yopiq kunlar' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Payshanba, 10-dekabr')
    expect(rows[0]).toHaveTextContent('Butun kun')
    expect(rows[1]).toHaveTextContent('Payshanba, 31-dekabr – Shanba, 2-yanvar')
    expect(rows[1]).toHaveTextContent('Bayram')
  })

  it('shows the empty state', async () => {
    stub({ 'GET /api/owner/stadiums/s1/closures': [] })
    renderApp(PAGE, { session })
    expect(await screen.findByText('Rejalashtirilgan yopilish yoʻq.')).toBeInTheDocument()
  })

  it('shows the error state and retries', async () => {
    let calls = 0
    stub({
      'GET /api/owner/stadiums/s1/closures': () =>
        ++calls === 1 ? jsonResponse(500, null, 'boom') : closures,
    })
    renderApp(PAGE, { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Qayta urinish' }))
    expect(await screen.findByRole('list', { name: 'Yopiq kunlar' })).toBeInTheDocument()
  })

  it('adds a full-day closure from today, with an optional reason', async () => {
    const api = stub({ 'POST /api/owner/stadiums/s1/closures': closures[1] })
    renderApp(PAGE, { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Yopiq kun qoʻshish' }))
    const sheet = await screen.findByRole('dialog', { name: 'Yopiq kun qoʻshish' })
    const start = within(sheet).getByLabelText('Boshlanish sanasi')
    const end = within(sheet).getByLabelText('Tugash sanasi')
    expect(start).toHaveValue(TODAY)
    expect(start).toHaveAttribute('min', TODAY)
    // An end before the start cannot be sent.
    fireEvent.change(start, { target: { value: '2026-12-20' } })
    fireEvent.change(end, { target: { value: '2026-12-19' } })
    expect(within(sheet).getByRole('button', { name: 'Qoʻshish' })).toBeDisabled()
    fireEvent.change(end, { target: { value: '2026-12-21' } })
    fireEvent.change(within(sheet).getByLabelText('Sabab (ixtiyoriy)'), {
      target: { value: '  Taʼmirlash ' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Qoʻshish' }))
    expect(await screen.findByText('Yopiq kun qoʻshildi')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums/s1/closures')).toEqual([
      { stadiumId: 's1', startDate: '2026-12-20', endDate: '2026-12-21', reason: 'Taʼmirlash' },
    ])
  })

  it('sends no reason when none is typed, and shows a failure in the sheet', async () => {
    const api = stub({
      'POST /api/owner/stadiums/s1/closures': jsonResponse(400, null, 'Bad request'),
    })
    renderApp(PAGE, { session })
    fireEvent.click(await screen.findByRole('button', { name: 'Yopiq kun qoʻshish' }))
    const sheet = await screen.findByRole('dialog', { name: 'Yopiq kun qoʻshish' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Qoʻshish' }))
    expect(await within(sheet).findByRole('alert')).toBeInTheDocument()
    expect(api.calls('POST /api/owner/stadiums/s1/closures')).toEqual([
      { stadiumId: 's1', startDate: TODAY, endDate: TODAY },
    ])
  })

  it('removes a closure', async () => {
    const api = stub({ 'DELETE /api/owner/closures/c1': null })
    renderApp(PAGE, { session })
    const list = await screen.findByRole('list', { name: 'Yopiq kunlar' })
    const first = within(list).getAllByRole('listitem')[0]!
    fireEvent.click(within(first).getByRole('button', { name: /oʻchirish$/ }))
    expect(await screen.findByText('Yopiq kun oʻchirildi')).toBeInTheDocument()
    expect(api.calls('DELETE /api/owner/closures/c1')).toHaveLength(1)
  })
})
