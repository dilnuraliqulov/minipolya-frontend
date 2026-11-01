import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import { stubApi } from '../test/api'
import { acceptChallenge, createTeamGame } from './games'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('games API', () => {
  it('starts a team game with the type and the unused maxPlayers the API requires', async () => {
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const api = stubApi({ 'POST /api/games': {} })
    await createTeamGame({
      stadiumId: 's1',
      startsAt: '2026-11-06T15:00:00.000Z',
      teamAId: 't1',
      cardId: 'c1',
    })
    expect(api.calls('POST /api/games')).toEqual([
      {
        stadiumId: 's1',
        startsAt: '2026-11-06T15:00:00.000Z',
        teamAId: 't1',
        cardId: 'c1',
        type: 'team_vs_team',
        maxPlayers: 2,
      },
    ])
  })

  it('accepts a challenge with gameId in the body (the DTO requires it)', async () => {
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const api = stubApi({ 'POST /api/games/g1/join': {} })
    await acceptChallenge('g1', 't2', 'c1')
    expect(api.calls('POST /api/games/g1/join')).toEqual([
      { gameId: 'g1', side: 'b', teamId: 't2', cardId: 'c1' },
    ])
  })
})
