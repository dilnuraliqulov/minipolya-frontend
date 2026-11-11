import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient, createMemoryTokenStore } from '../../shared/api'
import { stubApi } from '../test/api'
import {
  acceptChallenge,
  createTeamGame,
  getJoinQuote,
  getTeamGameQuote,
  markGameNotPaid,
  recordGameCash,
  undoGameRemainderMark,
} from './games'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('games API', () => {
  it('starts a team game with the type, the option and the unused maxPlayers the API requires', async () => {
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const api = stubApi({ 'POST /api/games': {} })
    await createTeamGame({
      stadiumId: 's1',
      startsAt: '2026-11-06T15:00:00.000Z',
      teamAId: 't1',
      cardId: 'c1',
      paymentOption: 'FULL',
    })
    expect(api.calls('POST /api/games')).toEqual([
      {
        stadiumId: 's1',
        startsAt: '2026-11-06T15:00:00.000Z',
        teamAId: 't1',
        cardId: 'c1',
        paymentOption: 'FULL',
        type: 'team_vs_team',
        maxPlayers: 2,
      },
    ])
  })

  it('accepts a challenge with gameId and the option in the body (the DTO requires gameId)', async () => {
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const api = stubApi({ 'POST /api/games/g1/join': {} })
    await acceptChallenge('g1', 't2', 'c1', 'MINIMUM')
    expect(api.calls('POST /api/games/g1/join')).toEqual([
      { gameId: 'g1', side: 'b', teamId: 't2', cardId: 'c1', paymentOption: 'MINIMUM' },
    ])
  })

  it('asks for both quotes', async () => {
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const quote = { options: [], cancellationDeadline: '2026-11-08T15:00:00Z' }
    const api = stubApi({
      'GET /api/stadiums/s1/team-game-quote': quote,
      'GET /api/games/g1/join-quote': quote,
    })
    await getTeamGameQuote('s1', '2026-11-08T15:00:00.000Z')
    await getJoinQuote('g1')
    expect(api.queries('GET /api/stadiums/s1/team-game-quote')).toEqual([
      { startsAt: '2026-11-08T15:00:00.000Z' },
    ])
    expect(api.calls('GET /api/games/g1/join-quote')).toHaveLength(1)
  })

  it('sends the owner’s team marks with the side', async () => {
    configureApiClient({ tokenStore: createMemoryTokenStore() })
    const api = stubApi({
      'POST /api/games/g1/cash': {},
      'POST /api/games/g1/not-paid': {},
      'DELETE /api/games/g1/remainder-mark': {},
    })
    await recordGameCash('g1', 'a')
    await markGameNotPaid('g1', 'b')
    await undoGameRemainderMark('g1', 'b')
    expect(api.calls('POST /api/games/g1/cash')).toEqual([{ side: 'a' }])
    expect(api.calls('POST /api/games/g1/not-paid')).toEqual([{ side: 'b' }])
    expect(api.queries('DELETE /api/games/g1/remainder-mark')).toEqual([{ side: 'b' }])
  })
})
