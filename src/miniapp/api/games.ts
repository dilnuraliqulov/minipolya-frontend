import { api, type Page } from '../../shared/api'
import type { PaymentOption } from './bookings'

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
  /** What this team owes after joining — the same in the app or in cash, paid yet or not. */
  remainderAmount: number
  remainderStatus: 'unpaid' | 'paid' | string
  /** T9: what the team chose on joining; absent on games created before the choice existed. */
  paymentOption?: 'minimum' | 'full' | string
  /**
   * T9: player money the team has put in — held on its card or arrived, card or cash
   * ("Toʻlangan: X", also while held).
   */
  paidAmount?: number
  /** T9: what the team still owes now (`remainderAmount` while unpaid, else 0). */
  remainingAmount?: number
  /** T10: the stadium owner's mark on the remainder; absent when none. */
  remainderMark?: 'cash_received' | 'not_paid' | string
  /** UTC, with the mark. */
  remainderMarkedAt?: string
  /** UTC, the stadium's owner only: until when the owner may undo the mark. */
  remainderMarkUndoableUntil?: string
  /** Everything this team has paid through the app so far. */
  paidInApp: number
  /**
   * What is on hold on this team's card right now (held, or capture_pending while
   * the capture is asked for, not lapsed); 0 otherwise. Always sent since backend
   * `ba6db84`.
   */
  heldAmount?: number
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
  /** E9: the stadium's cover photo (`/api/uploads/...`); absent when it has none. */
  stadiumPhotoUrl?: string
  /** E9: one of the 12 Tashkent districts; absent for older stadiums. */
  stadiumDistrict?: string
  format: string
  startsAt: string
  endsAt: string
  durationHours: number
  /** Tiyin: both teams together. */
  totalPrice: number
  /**
   * Tiyin: the least the joining team pays now — the minimum option's amount (T8), or
   * the full one when the stadium offers no minimum for this game.
   */
  amountToPayNow: number
  /** Tiyin: what the joining team still owes after `amountToPayNow`. */
  remainderAmount: number
  /** Tiyin, T8: what the joining team pays in full (nothing left afterwards). */
  fullAmount?: number
}

/** One choice of a team-game quote (T7), player amounts. */
export interface TeamQuoteOption {
  option: 'minimum' | 'full' | string
  /** Tiyin: what the team pays now (held when creating, charged when joining). */
  amount: number
  /** Tiyin: what is left to pay after it, in the app or in cash; 0 for `full`. */
  remainderAmount: number
}

/** `TeamGameQuoteResponse`: `minimum` only when offered, `full` always, last. */
export interface TeamGameQuote {
  options: TeamQuoteOption[]
  /** UTC: the last moment the team could cancel and get its money back. */
  cancellationDeadline: string
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

export const GAMES_PAGE_SIZE = 20
/** `@Size(max = 1000)` on a chat message. */
export const MESSAGE_MAX = 1000

export const MY_GAMES_KEY = ['games', 'my'] as const
export const CHALLENGES_KEY = ['games', 'challenges'] as const
export const gameKey = (id: string) => ['game', id] as const
export const messagesKey = (id: string) => ['game', id, 'messages'] as const
export const teamQuoteKey = (stadiumId: string, startsAt: string) =>
  ['team-game-quote', stadiumId, startsAt] as const
export const joinQuoteKey = (gameId: string) => ['game', gameId, 'join-quote'] as const

/** T7 (R33): what a team creating a team game at this hour may pay. Public. */
export function getTeamGameQuote(stadiumId: string, startsAt: string): Promise<TeamGameQuote> {
  return api.get<TeamGameQuote>(`/api/stadiums/${stadiumId}/team-game-quote`, {
    query: { startsAt },
  })
}

/** T7: what the free side of a waiting team game may pay to join it. */
export function getJoinQuote(gameId: string): Promise<TeamGameQuote> {
  return api.get<TeamGameQuote>(`/api/games/${gameId}/join-quote`)
}

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
  /** T6: `MINIMUM` (the backend's default) or `FULL`. */
  paymentOption: PaymentOption
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
export function acceptChallenge(
  gameId: string,
  teamId: string,
  cardId: string,
  paymentOption: PaymentOption,
) {
  return api.post<GameParticipant>(`/api/games/${gameId}/join`, {
    gameId,
    side: 'b',
    teamId,
    cardId,
    paymentOption,
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
 * (`remainderAmount`) and marks it `cash_received` (T10). 409 `"Already paid"` when
 * card or cash came first (400 from older backends).
 */
export function recordGameCash(id: string, side: GameSide): Promise<GameDetail> {
  return api.post<GameDetail>(`/api/games/${id}/cash`, { side })
}

/** T10: the owner marks one team's remainder "Toʻlanmadi" — no charge, no penalty. */
export function markGameNotPaid(id: string, side: GameSide): Promise<GameDetail> {
  return api.post<GameDetail>(`/api/games/${id}/not-paid`, { side })
}

/**
 * T10: the owner undoes their mark on one team, until `remainderMarkUndoableUntil`;
 * undoing cash voids that cash row and the rest is owed again.
 */
export function undoGameRemainderMark(id: string, side: GameSide): Promise<GameDetail> {
  return api.delete<GameDetail>(`/api/games/${id}/remainder-mark`, { query: { side } })
}
