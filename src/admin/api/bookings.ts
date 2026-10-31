import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'

/**
 * Every booking and every game, for the admin panel — request R15. Read only;
 * the status history of either comes from the audit log.
 */

export type BookingSource = 'app' | 'manual' | 'game'

/**
 * `AdminBookingResponse` — the owner's view of `BookingResponse` plus who
 * booked and how it was paid. Only the fields the panel reads.
 */
export interface AdminBooking {
  id: string
  stadiumId: string
  stadiumName: string
  /** Absent on a walk-in. */
  userId?: string
  userName?: string
  userPhone?: string
  gameId?: string
  source: BookingSource
  status: string
  /** UTC. */
  startsAt: string
  endsAt: string
  durationHours: number
  /** Tiyin — what the player pays by card for the whole booking. */
  price: number
  /** Tiyin — the owner's price; `price − netPrice` is the card fee. */
  netPrice?: number
  /** Tiyin — `price − netPrice`. */
  cardFee?: number
  /** Tiyin, net — what has been credited towards `netPrice`, card and cash. */
  paidAmount: number
  /** Tiyin, net — what is still owed of `netPrice`, from the backend. */
  remainingAmount: number
  paymentStatus: string
  /** Tiyin — card money kept on this booking, gross (card fee included). */
  paidInApp?: number
  /** Tiyin — cash the owner marked as received; absent when none. */
  cashReceived?: number
  /** UTC — when the owner marked it. */
  cashReceivedAt?: string
  clientName?: string
  clientPhone?: string
  isWalkin: boolean
  cancelledAt?: string
  cancellationReason?: string
  createdAt: string
}

export interface GamePlayer {
  userId: string
  userName: string
  /** `joined` | `paid` | `cancelled` | `refunded`. */
  status: string
}

/** One side of a team game — `GameTeamResponse` (§9) plus its players. */
export interface AdminGameTeam {
  side: 'a' | 'b'
  teamId: string
  teamName: string
  leaderId: string
  leaderName: string
  /** Tiyin — platform fee. */
  feeAmount: number
  /** Tiyin — advance to the owner. */
  advanceAmount: number
  /** Tiyin — still owed on the pitch. */
  remainderAmount: number
  remainderStatus: 'unpaid' | 'paid'
  /** Tiyin — everything this team paid through the app. */
  paidInApp: number
  players: GamePlayer[]
}

/** `AdminGameResponse` (R15). */
export interface AdminGame {
  id: string
  /** `casual` (with friends) | `open` | `team_vs_team`. */
  type: string
  status: string
  stadiumId: string
  stadiumName: string
  /** UTC. */
  startsAt: string
  endsAt: string
  /** Tiyin. */
  totalPrice: number
  creatorId: string
  creatorName: string
  teamAName?: string
  /** Absent while a team game waits for an opponent. */
  teamBName?: string
  currentPlayers?: number
  maxPlayers?: number
  bookingId?: string
  cancelledAt?: string
  cancellationReason?: string
  createdAt: string
}

export interface AdminGameDetail extends AdminGame {
  /** `team_vs_team` only. */
  teams?: AdminGameTeam[]
  /** Casual and open games: every player. */
  participants?: GamePlayer[]
  /** Tiyin per player — casual games. */
  serviceFeePerPerson?: number
}

export interface BookingFilters {
  /** Client name or phone. */
  search?: string
  stadiumId?: string
  status?: string
  /** Tashkent `LocalDate`s on `startsAt`, both inclusive. */
  from?: string
  to?: string
  /** One user's bookings (as the player). */
  userId?: string
  page?: number
  size?: number
}

export const BOOKINGS_LIST = 'GET /api/admin/bookings'
export const BOOKING_DETAIL = 'GET /api/admin/bookings/{id}'
export const GAMES_LIST = 'GET /api/admin/games'
export const GAME_DETAIL = 'GET /api/admin/games/{id}'

const query = (filters: BookingFilters) => ({
  ...filters,
  search: filters.search?.trim() || undefined,
})

/** Newest start first. */
export function listBookings(filters: BookingFilters): Promise<Page<AdminBooking>> {
  return api.get<Page<AdminBooking>>('/api/admin/bookings', { query: query(filters) })
}

export function getBooking(id: string): Promise<AdminBooking> {
  return api.get<AdminBooking>(`/api/admin/bookings/${id}`)
}

/**
 * `search` matches the creator or any team's name; `userId`: games the user
 * created, played in, or led a team in.
 */
export function listGames(filters: BookingFilters): Promise<Page<AdminGame>> {
  return api.get<Page<AdminGame>>('/api/admin/games', { query: query(filters) })
}

export function getGame(id: string): Promise<AdminGameDetail> {
  return api.get<AdminGameDetail>(`/api/admin/games/${id}`)
}

/** The status timeline of a booking or game: its audit entries, oldest first. */
export async function getTimeline(
  entityType: 'booking' | 'game',
  id: string,
): Promise<AuditEntry[]> {
  const page = await getAuditLog({ entityType, entityId: id, size: 50 })
  return [...page.content].reverse()
}

export interface StadiumOption {
  id: string
  name: string
}

/**
 * Stadiums for the Bronlar "Maydon" filter: the real admin list (every status,
 * as old bookings can be on a blocked stadium).
 */
export async function getStadiumOptions(): Promise<StadiumOption[]> {
  const page = await api.get<Page<StadiumOption>>('/api/admin/stadiums', { query: { size: 200 } })
  return page.content.map(({ id, name }) => ({ id, name }))
}
