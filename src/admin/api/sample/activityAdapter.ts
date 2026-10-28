/**
 * DEVELOPMENT ONLY — sample answers for requests R13–R15: user filters and
 * sample users, teams, an owner's stadiums, bookings and games. Re-exported
 * by ./adapter.ts.
 */
import { ApiError, type Page } from '../../../shared/api'
import type { AuditEntry } from '../audit'
import type { AdminBooking, AdminGame, AdminGameDetail, BookingFilters } from '../bookings'
import type { StadiumDetail, StadiumRow } from '../stadiums'
import type { AdminUser, UserRole, UserStatus, UserTeam } from '../users'
import { BLOCKS, BOOKINGS, GAMES, STADIUMS, TEAMS, teamsOf, USERS } from './activity'
import { contractOf, delay, detailFields, listFields, pageOf } from './adapter'
import { ADMINS, samplePhoto, seed } from './world'

// ---- R13: user list filters; sample users ----

export function filterUsers(
  real: Page<AdminUser>,
  filters: { role?: UserRole; status?: UserStatus },
): Page<AdminUser> {
  if (!filters.role && !filters.status) return real
  const rows = real.content.filter((user) => {
    const role =
      !filters.role ||
      (filters.role === 'admin' && user.isAdmin) ||
      (filters.role === 'owner' && user.isOwner) ||
      (filters.role === 'player' && !user.isAdmin && !user.isOwner)
    const status = !filters.status || (filters.status === 'blocked') === user.isBlocked
    return role && status
  })
  // Filtering one page here only approximates the backend's filter.
  return { ...real, content: rows, totalElements: rows.length, totalPages: 1 }
}

function findUser(id: string): AdminUser {
  const user = USERS.find((u) => u.id === id)
  if (!user) throw new ApiError('User not found', 404)
  return user
}

export function sampleUser(id: string): Promise<AdminUser> {
  return delay({ ...findUser(id) })
}

export function setSampleUserBlocked(
  id: string,
  isBlocked: boolean,
  reason?: string,
): Promise<AdminUser> {
  const user = findUser(id)
  user.isBlocked = isBlocked
  if (isBlocked) {
    BLOCKS.set(id, { reason: reason ?? '', time: new Date().toISOString(), admin: ADMINS[0]!.name })
  } else {
    BLOCKS.delete(id)
  }
  return delay({ ...user })
}

export function sampleUserBlock(id: string): Promise<AuditEntry | null> {
  const user = findUser(id)
  const block = BLOCKS.get(id)
  if (!block) return delay(null)
  return delay({
    id: `${id}-block`,
    time: block.time,
    actor: { name: block.admin, type: 'ADMIN' },
    action: 'USER_BLOCKED',
    entity: { type: 'user', id, label: user.name },
    changes: [{ field: 'isBlocked', oldValue: false, newValue: true }],
    reason: block.reason,
  })
}

// ---- R14: teams; an owner's stadiums ----

const isSampleUser = (id: string) => USERS.some((u) => u.id === id)

export function userTeams(id: string): Promise<UserTeam[]> {
  if (isSampleUser(id)) return delay(teamsOf(id))
  // A real user gets none, one or two sample teams, picked from the id.
  const count = seed(id) % 3
  return delay(
    TEAMS.slice(0, count).map((team, i) => ({
      id: team.id,
      name: team.name,
      leaderName: i === 0 ? undefined : team.leader.name,
      memberCount: team.members.length + 1,
      role: i === 0 ? ('leader' as const) : ('member' as const),
    })),
  )
}

function worldStadiumRow(s: (typeof STADIUMS)[number]): StadiumRow {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    ownerName: s.ownerName,
    ownerId: s.ownerId,
    status: 'approved',
    format: s.format,
    surfaceType: s.surfaceType,
    averageRating: 4.5,
    reviewCount: 20,
    totalBookings: BOOKINGS.filter((b) => b.stadiumId === s.id).length,
    totalRevenue: 0,
    createdAt: s.createdAt,
    photoUrl: samplePhoto(s.id),
    district: s.district,
    pricePerHour: s.pricePerHour,
    ownerContractStatus: contractOf(s.ownerId),
  }
}

/** The sample stadiums that sample bookings link to. */
export function worldStadium(id: string): StadiumDetail | null {
  const s = STADIUMS.find((x) => x.id === id)
  if (!s) return null
  const row = worldStadiumRow(s)
  return { ...detailFields(row), ...row }
}

export async function ownerStadiums(
  ownerId: string,
  fetchAll: () => Promise<Page<StadiumRow>>,
): Promise<Page<StadiumRow>> {
  const sample = STADIUMS.filter((s) => s.ownerId === ownerId).map(worldStadiumRow)
  if (sample.length) return delay(pageOf(sample))
  const all = await fetchAll()
  return pageOf(
    all.content.filter((s) => s.ownerId === ownerId).map((s) => ({ ...s, ...listFields(s) })),
  )
}

// ---- R15: bookings and games ----

const tashkentDay = (iso: string) =>
  new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 10)

function inFilters(filters: BookingFilters, startsAt: string, stadiumId: string, status: string) {
  const day = tashkentDay(startsAt)
  return (
    (!filters.stadiumId || stadiumId === filters.stadiumId) &&
    (!filters.status || status === filters.status) &&
    (!filters.from || day >= filters.from) &&
    (!filters.to || day <= filters.to)
  )
}

const squash = (text: string) => text.toLowerCase().replace(/\s/g, '')

/**
 * A real user has no sample bookings; stand a sample player in for them
 * (picked from the id), so their page shows a realistic list.
 */
function standIn(userId: string | undefined): string | undefined {
  if (!userId || isSampleUser(userId)) return userId
  const players = USERS.filter((u) => !u.isOwner)
  return players[seed(userId) % players.length]!.id
}

export function listBookings(filters: BookingFilters): Promise<Page<AdminBooking>> {
  const search = filters.search ? squash(filters.search) : ''
  const userId = standIn(filters.userId)
  const rows = BOOKINGS.filter(
    (b) =>
      inFilters(filters, b.startsAt, b.stadiumId, b.status) &&
      (!userId || b.userId === userId) &&
      (!search ||
        [b.userName, b.userPhone, b.clientName, b.clientPhone].some(
          (v) => v !== undefined && squash(v).includes(search),
        )),
  ).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  return delay(pageOf(rows, filters.page, filters.size))
}

export function getBooking(id: string): Promise<AdminBooking> {
  const booking = BOOKINGS.find((b) => b.id === id)
  return booking ? delay({ ...booking }) : Promise.reject(new ApiError('Booking not found', 404))
}

export function listGames(filters: BookingFilters): Promise<Page<AdminGame>> {
  const search = filters.search ? squash(filters.search) : ''
  const userId = standIn(filters.userId)
  const rows = GAMES.filter(
    (g) =>
      inFilters(filters, g.startsAt, g.stadiumId, g.status) &&
      (!userId ||
        g.creatorId === userId ||
        Boolean(g.participants?.some((p) => p.userId === userId)) ||
        Boolean(g.teams?.some((t) => t.players.some((p) => p.userId === userId)))) &&
      (!search ||
        [g.creatorName, g.teamAName, g.teamBName].some(
          (v) => v !== undefined && squash(v).includes(search),
        )),
  ).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  return delay(pageOf(rows, filters.page, filters.size))
}

export function getGame(id: string): Promise<AdminGameDetail> {
  const game = GAMES.find((g) => g.id === id)
  return game ? delay(structuredClone(game)) : Promise.reject(new ApiError('Game not found', 404))
}

const SYSTEM = { type: 'SYSTEM' as const }
const OWNER = { name: 'Maydon egasi', type: 'OWNER' as const }
const later = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

function bookingTimeline(b: AdminBooking): AuditEntry[] {
  const entity = { type: 'booking', id: b.id, label: b.stadiumName }
  const player = { id: b.userId, name: b.userName, type: 'PLAYER' as const }
  const list: AuditEntry[] = [
    {
      id: `${b.id}-1`,
      time: b.createdAt,
      actor: b.isWalkin ? OWNER : player,
      action: b.isWalkin ? 'MANUAL_BOOKING_CREATED' : 'BOOKING_CREATED',
      entity,
      changes: [{ field: 'status', newValue: b.isWalkin ? 'confirmed' : 'pending' }],
    },
  ]
  if (!b.isWalkin && b.paidInApp > 0) {
    list.push({
      id: `${b.id}-2`,
      time: later(b.createdAt, 1),
      actor: SYSTEM,
      action: 'BOOKING_CONFIRMED',
      entity,
      changes: [
        { field: 'status', oldValue: 'pending', newValue: 'confirmed' },
        { field: 'paidAmount', oldValue: 0, newValue: b.paidInApp },
      ],
    })
  }
  if (b.cashReceived && b.cashReceivedAt) {
    list.push({
      id: `${b.id}-3`,
      time: b.cashReceivedAt,
      actor: OWNER,
      action: 'CASH_RECEIVED',
      entity,
      changes: [{ field: 'paidAmount', oldValue: b.paidInApp, newValue: b.paidAmount }],
    })
  }
  const endings: Record<string, [string, AuditEntry['actor']]> = {
    completed: ['BOOKING_COMPLETED', SYSTEM],
    expired: ['BOOKING_EXPIRED', SYSTEM],
    cancelled_by_user: ['BOOKING_CANCELLED_BY_USER', player],
    cancelled_by_owner: ['BOOKING_CANCELLED_BY_OWNER', OWNER],
  }
  const ending = endings[b.status]
  if (ending) {
    list.push({
      id: `${b.id}-4`,
      time: b.cancelledAt ?? b.endsAt,
      actor: ending[1],
      action: ending[0],
      entity,
      changes: [
        {
          field: 'status',
          oldValue: b.status === 'expired' ? 'pending' : 'confirmed',
          newValue: b.status,
        },
      ],
      reason: b.cancellationReason,
    })
  }
  return list
}

function gameTimeline(g: AdminGameDetail): AuditEntry[] {
  const entity = { type: 'game', id: g.id, label: g.stadiumName }
  const list: AuditEntry[] = [
    {
      id: `${g.id}-1`,
      time: g.createdAt,
      actor: { id: g.creatorId, name: g.creatorName, type: 'PLAYER' },
      action: 'GAME_CREATED',
      entity,
      changes: [{ field: 'status', newValue: 'open' }],
    },
  ]
  const opponent = g.teams?.[1]
  if (opponent) {
    list.push({
      id: `${g.id}-2`,
      time: later(g.createdAt, 300),
      actor: { id: opponent.leaderId, name: opponent.leaderName, type: 'PLAYER' },
      action: 'GAME_JOINED',
      entity,
      changes: [{ field: 'team', newValue: opponent.teamName }],
    })
  }
  if (g.status !== 'open') {
    const cancelled = g.status.startsWith('cancelled')
    list.push({
      id: `${g.id}-3`,
      time: g.cancelledAt ?? later(g.createdAt, 301),
      actor: SYSTEM,
      action: cancelled ? 'GAME_AUTO_CANCELLED' : 'GAME_CONFIRMED',
      entity,
      changes: [
        { field: 'status', oldValue: 'open', newValue: cancelled ? g.status : 'confirmed' },
      ],
      reason: g.cancellationReason,
    })
  }
  if (g.status === 'completed') {
    list.push({
      id: `${g.id}-4`,
      time: g.endsAt,
      actor: SYSTEM,
      action: 'BOOKING_COMPLETED',
      entity,
      changes: [{ field: 'status', oldValue: 'confirmed', newValue: 'completed' }],
    })
  }
  return list
}

/** A plausible status history for a sample booking or game, oldest first. */
export function timeline(type: 'booking' | 'game', id: string): Promise<AuditEntry[]> {
  if (type === 'booking') {
    const booking = BOOKINGS.find((b) => b.id === id)
    return delay(booking ? bookingTimeline(booking) : [])
  }
  const game = GAMES.find((g) => g.id === id)
  return delay(game ? gameTimeline(game) : [])
}

/** The stadiums sample bookings belong to, for the Bronlar stadium filter. */
export function sampleStadiumOptions(): Array<{ id: string; name: string }> {
  return STADIUMS.map((s) => ({ id: s.id, name: s.name }))
}
