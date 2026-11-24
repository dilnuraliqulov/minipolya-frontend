import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Challenge } from '../api/games'
import type { TeamDetail } from '../api/teams'
import { stubApi } from '../test/api'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const ME = '018f3a2c-0000-7000-8000-000000000001'
const lions: TeamDetail = {
  id: 't1',
  name: 'Chilonzor Lions',
  leaderId: ME,
  leaderName: 'Test User',
  level: 'orta',
  members: [{ userId: ME, userName: 'Test User', role: 'leader' }],
}
const challenge: Challenge = {
  gameId: 'g1',
  waitingTeamId: 't9',
  waitingTeamName: 'Yunusobod United',
  waitingTeamLevel: 'professional',
  stadiumId: 's1',
  stadiumName: 'Bunyodkor Arena',
  stadiumAddress: 'Bunyodkor koʻchasi 12',
  format: '7x7',
  startsAt: '2026-11-21T15:00:00Z',
  endsAt: '2026-11-21T16:00:00Z',
  durationHours: 1,
  totalPrice: 31_000_000,
  amountToPayNow: 8_800_000,
  remainderAmount: 8_000_000,
  fullAmount: 8_800_000,
}
const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

function stub(overrides: Record<string, unknown> = {}) {
  return stubApi({
    'GET /api/teams/me': [{ id: 't1', name: 'Chilonzor Lions', level: 'orta', memberCount: 1 }],
    'GET /api/teams/t1': lions,
    'GET /api/games/challenges': page([challenge]),
    ...overrides,
  } as Parameters<typeof stubApi>[0])
}

describe('the challenge board filter', () => {
  it('asks the server for the viewer’s own level first', async () => {
    const api = stub()
    renderApp('/team')

    await screen.findByText('Yunusobod United')
    expect(api.queries('GET /api/games/challenges').at(-1)).toMatchObject({ level: 'orta' })
  })

  it('"Hammasi" asks for every level, with no level parameter at all', async () => {
    const api = stub()
    renderApp('/team')

    await screen.findByText('Yunusobod United')
    fireEvent.click(screen.getByRole('button', { name: 'Hammasi' }))

    await waitFor(() =>
      expect(api.queries('GET /api/games/challenges').at(-1)).not.toHaveProperty('level'),
    )
  })

  it('a team with no level starts on "Hammasi"', async () => {
    const api = stub({
      'GET /api/teams/me': [{ id: 't1', name: 'Chilonzor Lions', memberCount: 1 }],
      'GET /api/teams/t1': { ...lions, level: undefined },
    })
    renderApp('/team')

    await screen.findByText('Yunusobod United')
    expect(api.queries('GET /api/games/challenges').at(-1)).not.toHaveProperty('level')
  })

  it('shows the waiting team’s level on its card', async () => {
    stub()
    renderApp('/team')

    const board = await screen.findByRole('region', { name: 'Raqib qidirayotgan jamoalar' })
    expect(await within(board).findByText('Yunusobod United')).toBeInTheDocument()
    expect(within(board).getByText('Professional', { selector: 'span' })).toBeInTheDocument()
  })
})
