import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Challenge } from '../api/games'
import type { TeamDetail } from '../api/teams'
import { jsonResponse, stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'
import { makeStadium, page } from '../test/stadiums'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ME = '018f3a2c-0000-7000-8000-000000000001'
const OTHER = '018f3a2c-0000-7000-8000-000000000002'
const LIST = 'GET /api/stadiums'
const CHALLENGES = 'GET /api/games/challenges'
const TITLE = 'Raqib qidirayotgan jamoalar'

const team = (leaderId: string): TeamDetail => ({
  id: 't1',
  name: 'Chilonzor Lions',
  leaderId,
  leaderName: 'Test User',
  members: [
    { userId: ME, userName: 'Test User', role: leaderId === ME ? 'leader' : 'member' },
    { userId: OTHER, userName: 'Bobur', role: leaderId === ME ? 'member' : 'leader' },
  ],
})
const challenge: Challenge = {
  gameId: 'g1',
  waitingTeamId: 't9',
  waitingTeamName: 'Yunusobod United',
  stadiumId: 's1',
  stadiumName: 'Bunyodkor Arena',
  stadiumAddress: 'Bunyodkor koʻchasi 12',
  stadiumPhotoUrl: '/api/uploads/stadiums/s1/cover.jpg',
  stadiumDistrict: 'Chilonzor',
  format: '7x7',
  startsAt: '2026-11-06T15:00:00Z',
  endsAt: '2026-11-06T16:00:00Z',
  durationHours: 1,
  totalPrice: 31_000_000,
  amountToPayNow: 15_500_000,
  remainderAmount: 0,
}

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    [LIST]: page([makeStadium()]),
    [CHALLENGES]: page([challenge]),
    'GET /api/teams/me': [
      { id: 't1', name: 'Chilonzor Lions', leaderName: 'Test User', memberCount: 2 },
    ],
    'GET /api/teams/t1': team(ME),
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

const carousel = () => screen.findByRole('heading', { level: 2, name: TITLE })

describe('Bosh sahifa — Raqib qidirayotgan jamoalar (E11)', () => {
  it('shows a card per challenge with photo, stadium, time, team and the amount', async () => {
    stub()
    renderApp('/')
    const section = (await carousel()).closest('section')!
    const card = within(section).getByRole('link', { name: /Bunyodkor Arena/ })
    expect(card).toHaveTextContent('Yunusobod United')
    expect(card).toHaveTextContent('Jamoangiz toʻlaydi: 155 000 soʻm')
    expect(card).toHaveTextContent(/Juma, 6-noyabr · 20:00/)
    expect(card.querySelector('img')?.getAttribute('src')).toContain(
      '/api/uploads/stadiums/s1/cover.jpg',
    )
    expect(within(section).getByRole('link', { name: 'Hammasi' })).toHaveAttribute(
      'href',
      '/challenges',
    )
  })

  it('gives a captain "Qabul qilish" for the team they lead', async () => {
    stub()
    renderApp('/')
    const section = (await carousel()).closest('section')!
    const card = within(section).getByRole('link', { name: /Bunyodkor Arena/ })
    expect(card).toHaveTextContent('Qabul qilish')
    expect(card).not.toHaveTextContent('Sardoringiz qabul qila oladi')
    expect(card).toHaveAttribute('href', '/challenges/g1?team=t1')
  })

  it('tells a member (or a player with no team) that the captain accepts', async () => {
    stub({ 'GET /api/teams/t1': team(OTHER) })
    renderApp('/')
    const section = (await carousel()).closest('section')!
    const card = within(section).getByRole('link', { name: /Bunyodkor Arena/ })
    expect(card).toHaveTextContent('Sardoringiz qabul qila oladi')
    expect(card).not.toHaveTextContent('Qabul qilish')
    expect(card).toHaveAttribute('href', '/challenges/g1')
  })

  it('falls back to the mark without a stadium photo', async () => {
    stub({ [CHALLENGES]: page([{ ...challenge, stadiumPhotoUrl: undefined }]) })
    renderApp('/')
    const section = (await carousel()).closest('section')!
    expect(
      within(section)
        .getByRole('link', { name: /Bunyodkor Arena/ })
        .querySelector('img'),
    ).toBeNull()
  })

  it('shows a skeleton while loading', async () => {
    stub({ [CHALLENGES]: () => new Promise(() => {}) })
    renderApp('/')
    expect(await screen.findAllByTestId('challenge-skeleton')).toHaveLength(2)
  })

  it('is hidden when no team is looking, and reads no teams', async () => {
    const api = stub({ [CHALLENGES]: page([]) })
    renderApp('/')
    await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    await vi.waitFor(() => expect(api.calls(CHALLENGES)).toHaveLength(1))
    expect(screen.queryByRole('heading', { name: TITLE })).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('challenge-skeleton')).toHaveLength(0)
    expect(api.calls('GET /api/teams/me')).toHaveLength(0)
  })

  it('is hidden when the board fails', async () => {
    const api = stub({ [CHALLENGES]: jsonResponse(500, null, 'Internal server error') })
    renderApp('/')
    await screen.findByRole('article', { name: 'Bunyodkor Arena' })
    await vi.waitFor(() => expect(api.calls(CHALLENGES).length).toBeGreaterThan(0))
    await vi.waitFor(() => expect(screen.queryAllByTestId('challenge-skeleton')).toHaveLength(0))
    expect(screen.queryByRole('heading', { name: TITLE })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Qayta urinish' })).not.toBeInTheDocument()
  })
})

describe('/challenges — the full board outside Jamoam', () => {
  it('lists the challenges with "Qabul qilish" for a captain', async () => {
    stub()
    renderApp('/challenges')
    expect(await screen.findByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument()
    const accept = await screen.findByRole('link', { name: 'Qabul qilish' })
    expect(accept).toHaveAttribute('href', '/challenges/g1?team=t1')
  })

  it('tells a member that only the captain accepts', async () => {
    stub({ 'GET /api/teams/t1': team(OTHER) })
    renderApp('/challenges')
    expect(await screen.findByText('Yunusobod United')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Qabul qilish' })).not.toBeInTheDocument()
  })
})
