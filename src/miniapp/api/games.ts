import { api, type Page } from '../../shared/api'

export type GameType = 'casual' | 'open' | 'team_vs_team'
export type GameSide = 'a' | 'b'

/** `GameResponse` — a listing row. */
export interface Game {
  id: string
  type: GameType | string
  status: string
  title?: string
  stadiumName?: string
  creatorName?: string
  maxPlayers?: number
  currentPlayers?: number
  /** UTC */
  startsAt: string
  endsAt: string
  /** Tiyin: what all the players pay together. */
  totalPrice?: number
  isPublic: boolean
}

/** `GameTeamResponse` — one team on one side of a team game (player prices, tiyin). */
export interface GameTeam {
  side: GameSide
  teamId: string
  leaderId: string
  teamName?: string
  leaderName?: string
  /** What this team pays in the app on joining. */
  price: number
  /** What this team owes after joining — the same in the app or in cash. */
  remainderAmount: number
  remainderStatus: 'unpaid' | 'paid' | string
  /** Everything this team has paid through the app so far. */
  paidInApp: number
  /** UTC */
  cancellationDeadline?: string
  /** 0 when nothing would come back — display, never recompute. */
  refundIfCancelledNow?: number
}

export interface GameParticipant {
  id: string
  gameId: string
  userId: string
  userName?: string
  side?: GameSide
  status: string
  paymentStatus?: string
  joinedAt: string
}

/** `GameDetailResponse`. */
export interface GameDetail extends Game {
  description?: string
  stadiumId: string
  creatorId: string
  minPlayers?: number
  teamAId?: string
  teamAName?: string
  teamBId?: string
  teamBName?: string
  bookingId?: string
  inviteLink?: string
  createdAt: string
  /** Casual/open only: one player's share. */
  price?: number
  /** Team games only. */
  teams?: GameTeam[]
  /**
   * R45, team games only: a team is half-way through joining (its payment being
   * confirmed, e.g. after 202 PAYMENT_PENDING). Settled by the backend.
   */
  joinPending?: boolean
  participants?: GameParticipant[]
}

/** `GameChallengeResponse` — a waiting team game on the challenge board. */
export interface Challenge {
  gameId: string
  title?: string
  waitingTeamId: string
  waitingTeamName?: string
  stadiumId: string
  stadiumName: string
  stadiumAddress: string
  format: string
  startsAt: string
  endsAt: string
  durationHours: number
  /** Tiyin: both teams together. */
  totalPrice: number
  /** Tiyin: what the joining team pays now. */
  amountToPayNow: number
  /** Tiyin: what the joining team still owes afterwards. */
  remainderAmount: number
}

/** `GameMessageResponse`. */
export interface GameMessage {
  id: string
  gameId: string
  userId: string
  userName?: string
  message: string
  createdAt: string
}

/** R33: a team game's price before it is created. Not shipped; nothing calls it. */
export const TEAM_GAME_QUOTE = 'GET /api/stadiums/{id}/team-game-quote'

export const GAMES_PAGE_SIZE = 20
/** `@Size(max = 1000)` on a chat message. */
export const MESSAGE_MAX = 1000

export const MY_GAMES_KEY = ['games', 'my'] as const
export const CHALLENGES_KEY = ['games', 'challenges'] as const
export const gameKey = (id: string) => ['game', id] as const
export const messagesKey = (id: string) => ['game', id, 'messages'] as const

export function getMyGames(page: number): Promise<Page<Game>> {
  return api.get<Page<Game>>('/api/games/my', { query: { page, size: GAMES_PAGE_SIZE } })
}

export function getChallenges(page: number): Promise<Page<Challenge>> {
  return api.get<Page<Challenge>>('/api/games/challenges', {
    query: { page, size: GAMES_PAGE_SIZE },
  })
}

export function getGame(id: string): Promise<GameDetail> {
  return api.get<GameDetail>(`/api/games/${id}`)
}

export interface CreateTeamGameBody {
  stadiumId: string
  /** ISO UTC, on the hour in Tashkent. */
  startsAt: string
  teamAId: string
  cardId: string
}

/**
 * Starts looking for an opponent: the leader's card is put on hold, no slot is
 * booked. `maxPlayers` is required by the API but unused for a team game.
 */
export function createTeamGame(body: CreateTeamGameBody): Promise<GameDetail> {
  return api.post<GameDetail>('/api/games', { ...body, type: 'team_vs_team', maxPlayers: 2 })
}

/**
 * A leader accepts a waiting team game with their team and a card; the backend
 * picks the free side (A when the team left behind sits on B). `side: 'b'` is
 * optional now but kept for now: older backends require it and newer ones
 * accept it from any client. Drop it once every backend decides the side itself.
 */
export function acceptChallenge(gameId: string, teamId: string, cardId: string) {
  return api.post<GameParticipant>(`/api/games/${gameId}/join`, {
    gameId,
    side: 'b',
    teamId,
    cardId,
  })
}

/** A leader pays their own team's remainder. A decline is a 400. */
export function payTeamRemainder(gameId: string, cardId: string): Promise<GameDetail> {
  return api.post<GameDetail>(`/api/games/${gameId}/pay-remainder`, { cardId })
}

export function cancelGame(id: string): Promise<void> {
  return api.delete<void>(`/api/games/${id}`)
}

export function getMessages(gameId: string, page = 0): Promise<Page<GameMessage>> {
  return api.get<Page<GameMessage>>(`/api/games/${gameId}/messages`, {
    query: { page, size: 50 },
  })
}

export function sendMessage(gameId: string, message: string): Promise<GameMessage> {
  return api.post<GameMessage>(`/api/games/${gameId}/messages`, { message })
}

/**
 * The stadium's owner records one team's remainder as received in cash
 * (`remainderAmount`). 400 `"Already paid"` when card or cash came first.
 */
export function recordGameCash(id: string, side: GameSide): Promise<GameDetail> {
  return api.post<GameDetail>(`/api/games/${id}/cash`, { side })
}
