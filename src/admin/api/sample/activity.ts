/**
 * DEVELOPMENT ONLY — sample users, teams, stadiums, bookings and games, for
 * the endpoints of requests R13–R15 (and the payments built on them, R16).
 * Generated from a fixed seed, so every reload shows the same data; times are
 * relative to now, so "today" always has bookings.
 */
import type { AdminBooking, AdminGameDetail, GamePlayer } from '../bookings'
import type { AdminUser, UserTeam } from '../users'
import { daysAgo, sampleId } from './world'

const SOM = 100

/** mulberry32 — a tiny seeded random generator. */
function random(seedValue: number) {
  let a = seedValue
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}
const rnd = random(20261028)
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1))
const choose = <T>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)]!

const phone = () =>
  `+998 ${choose(['90', '91', '93', '94', '97', '99'])} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`

// ---- People ----

const PLAYER_NAMES = [
  'Bekzod Rahmatov',
  'Alisher Mirzayev',
  'Umid Karimov',
  'Diyor Saidov',
  'Temur Oripov',
  'Jasur Aliyev',
  'Sherzod Qodirov',
  'Otabek Nurmatov',
  'Farrux Ismoilov',
  'Azamat Tursunov',
  'Ulugʻbek Hamidov',
  'Nodir Xolmatov',
  'Islom Rajabov',
  'Bobur Ergashev',
  'Sanjar Yoqubov',
  'Kamron Abdullayev',
]
const OWNER_NAMES = [
  'Malika Rashidova',
  'Sardor Yusupov',
  'Akbar Nazarov',
  'Javlon Mamatov',
  'Rustam Hakimov',
  'Doniyor Sobirov',
]

export const USERS: AdminUser[] = [
  ...PLAYER_NAMES.map((name, i) => ({
    id: sampleId('user', i + 1),
    name,
    phone: phone(),
    telegramId: 500_000_000 + i * 7919,
    language: choose(['uz', 'uz', 'ru'] as const),
    isOwner: false,
    isAdmin: false,
    // Umid Karimov is the blocked one.
    isBlocked: i === 2,
    bookingCount: 0,
    stadiumCount: 0,
    createdAt: daysAgo(int(10, 300)),
    lastActiveAt: daysAgo(int(0, 9)),
  })),
  ...OWNER_NAMES.map((name, i) => ({
    id: sampleId('user', i + 21),
    name,
    phone: phone(),
    telegramId: 600_000_000 + i * 104_729,
    language: 'uz' as const,
    isOwner: true,
    isAdmin: false,
    isBlocked: false,
    bookingCount: int(0, 8),
    stadiumCount: 1,
    createdAt: daysAgo(int(120, 400)),
    lastActiveAt: daysAgo(int(0, 3)),
  })),
]

export const BLOCKS = new Map<string, { reason: string; time: string; admin: string }>([
  [
    sampleId('user', 3),
    {
      reason: 'Koʻp bekor qilishlar: oxirgi oyda 6 ta bron oxirgi daqiqada bekor qilingan.',
      time: daysAgo(6),
      admin: 'Dilnoza Karimova',
    },
  ],
])

const players = USERS.slice(0, PLAYER_NAMES.length)
const owners = USERS.slice(PLAYER_NAMES.length)

// ---- Stadiums (approved; the rejected ones live in world.ts) ----

export const STADIUMS = [
  ['Bunyodkor Arena', 'Chilonzor', 'Chilonzor tumani, Bunyodkor shoh koʻchasi, 44', '5x5', 180_000],
  ['Yunusobod Arena', 'Yunusobod', 'Yunusobod tumani, Amir Temur 107', '7x7', 220_000],
  ['Olmazor Futsal', 'Olmazor', 'Olmazor tumani, Qorasaroy 3', '5x5', 130_000],
  ['Yakkasaroy Futsal', 'Yakkasaroy', 'Yakkasaroy tumani, Shota Rustaveli 21', '5x5', 120_000],
  ['Mirobod Sport', 'Mirobod', 'Mirobod tumani, Nukus koʻchasi 9', '7x7', 200_000],
  ['Uchtepa Stadion', 'Uchtepa', 'Uchtepa tumani, Lutfiy 16', '11x11', 350_000],
].map(([name, district, address, format, price], i) => ({
  id: sampleId('stadium', i + 11),
  name: name as string,
  district: district as string,
  address: address as string,
  format: format as string,
  surfaceType: i % 3 === 0 ? 'natural' : 'artificial',
  pricePerHour: (price as number) * SOM,
  ownerId: owners[i]!.id,
  ownerName: owners[i]!.name,
  createdAt: daysAgo(200 - i * 20),
}))

// ---- Teams ----

export const TEAMS = [
  'Chilonzor Lions',
  'Yunusobod FC',
  'Sergeli Boys',
  'Olmazor United',
  'Toshkent Tigers',
  'Mirobod Stars',
].map((name, i) => {
  const members = [0, 1, 2, 3, 4].map((k) => players[(i * 3 + k) % players.length]!)
  return { id: sampleId('team', i + 1), name, leader: members[0]!, members }
})

export function teamsOf(userId: string): UserTeam[] {
  return TEAMS.filter((team) => team.members.some((m) => m.id === userId)).map((team) => ({
    id: team.id,
    name: team.name,
    leaderName: team.leader.name,
    memberCount: team.members.length,
    role: team.leader.id === userId ? 'leader' : 'member',
  }))
}

// ---- Bookings ----

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Today 00:00 in Tashkent (UTC+5, no DST) as a UTC timestamp. */
function tashkentMidnight(offsetDays: number): number {
  const now = Date.now() + 5 * HOUR
  return Math.floor(now / DAY) * DAY - 5 * HOUR + offsetDays * DAY
}

function makeBooking(n: number): AdminBooking {
  const stadium = choose(STADIUMS)
  const walkIn = rnd() < 0.15
  const user = choose(players)
  const day = int(-25, 6)
  const hour = int(8, 21)
  const duration = rnd() < 0.7 ? 1 : 2
  const startsAt = tashkentMidnight(day) + hour * HOUR
  const endsAt = startsAt + duration * HOUR
  const past = endsAt < Date.now()
  const price = stadium.pricePerHour * duration
  const minimum = 50_000 * SOM

  let status: string
  const roll = rnd()
  if (past)
    status =
      roll < 0.75
        ? 'completed'
        : roll < 0.87
          ? 'cancelled_by_user'
          : roll < 0.94
            ? 'cancelled_by_owner'
            : 'expired'
  else status = roll < 0.85 ? 'confirmed' : roll < 0.92 ? 'pending' : 'cancelled_by_user'

  let paidInApp = 0
  let cash: number | undefined
  if (walkIn) {
    cash = status === 'completed' ? price : undefined
  } else if (status !== 'expired' && status !== 'pending') {
    paidInApp = rnd() < 0.55 ? Math.min(minimum, price) : price
    if (paidInApp < price && status === 'completed') {
      // The rest paid on the spot in cash, or in the app.
      if (rnd() < 0.6) cash = price - paidInApp
      else paidInApp = price
    }
  }
  const cancelled = status.startsWith('cancelled')
  const paid = paidInApp + (cash ?? 0)
  const createdAt = new Date(startsAt - int(2, 120) * HOUR).toISOString()
  return {
    id: sampleId('booking', n),
    stadiumId: stadium.id,
    stadiumName: stadium.name,
    userId: walkIn ? undefined : user.id,
    userName: walkIn ? undefined : user.name,
    userPhone: walkIn ? undefined : user.phone,
    source: walkIn ? 'manual' : 'app',
    status,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    durationHours: duration,
    price,
    paidAmount: paid,
    remainingAmount: Math.max(0, price - paid),
    paymentStatus: paid === 0 ? 'unpaid' : paid < price ? 'partially_paid' : 'paid',
    paidInApp,
    cashReceived: cash,
    cashReceivedAt: cash ? new Date(startsAt + 10 * 60_000).toISOString() : undefined,
    clientName: walkIn ? choose(['Anvar aka', 'Shavkat', 'Ravshan', 'Oybek jamoasi']) : undefined,
    clientPhone: walkIn ? phone() : undefined,
    isWalkin: walkIn,
    cancelledAt: cancelled ? new Date(startsAt - int(1, 30) * HOUR).toISOString() : undefined,
    cancellationReason: cancelled
      ? status === 'cancelled_by_owner'
        ? 'Maydonda taʼmirlash ishlari'
        : choose(['Rejalar oʻzgardi', 'Jamoa yigʻilmadi', undefined])
      : undefined,
    createdAt,
  }
}

export const BOOKINGS: AdminBooking[] = Array.from({ length: 72 }, (_, i) => makeBooking(i + 1))

// ---- Games ----

function makeGame(n: number): AdminGameDetail {
  const stadium = choose(STADIUMS)
  const type = n <= 8 ? 'team_vs_team' : n <= 12 ? 'casual' : 'open'
  const day = int(-12, 5)
  const startsAt = tashkentMidnight(day) + int(17, 21) * HOUR
  const endsAt = startsAt + HOUR
  const past = endsAt < Date.now()
  const totalPrice = stadium.pricePerHour
  const base = {
    id: sampleId('game', n),
    type,
    stadiumId: stadium.id,
    stadiumName: stadium.name,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    totalPrice,
    createdAt: new Date(startsAt - int(24, 96) * HOUR).toISOString(),
  }

  if (type === 'team_vs_team') {
    const teamA = TEAMS[n % TEAMS.length]!
    const waiting = !past && n % 3 === 0
    const teamB = waiting ? undefined : TEAMS[(n + 2) % TEAMS.length]!
    const cancelled = past && waiting
    const status = waiting
      ? 'open'
      : past
        ? n === 5
          ? 'cancelled_not_filled'
          : 'completed'
        : 'confirmed'
    const fee = 25_000 * SOM
    const advance = Math.round(totalPrice / 2 / 4)
    const side = (team: (typeof TEAMS)[number], s: 'a' | 'b') => {
      const remainderPaid = status === 'completed' || (status === 'confirmed' && s === 'a')
      const remainder = totalPrice / 2 - advance
      return {
        side: s,
        teamId: team.id,
        teamName: team.name,
        leaderId: team.leader.id,
        leaderName: team.leader.name,
        feeAmount: fee,
        advanceAmount: advance,
        remainderAmount: remainderPaid ? 0 : remainder,
        remainderStatus: remainderPaid ? ('paid' as const) : ('unpaid' as const),
        paidInApp: fee + advance + (remainderPaid && s === 'a' ? remainder : 0),
        players: team.members.map((m) => ({ userId: m.id, userName: m.name, status: 'joined' })),
      }
    }
    return {
      ...base,
      status: cancelled ? 'cancelled_not_filled' : status,
      creatorId: teamA.leader.id,
      creatorName: teamA.leader.name,
      teamAName: teamA.name,
      teamBName: teamB?.name,
      teams: teamB ? [side(teamA, 'a'), side(teamB, 'b')] : [side(teamA, 'a')],
      cancelledAt:
        status === 'cancelled_not_filled' ? new Date(startsAt - 3 * HOUR).toISOString() : undefined,
      cancellationReason: status === 'cancelled_not_filled' ? 'Raqib jamoa topilmadi' : undefined,
    }
  }

  const creator = choose(players)
  const count = int(6, 10)
  const participants: GamePlayer[] = Array.from({ length: count }, (_, k) => {
    const p = players[(players.indexOf(creator) + k) % players.length]!
    return { userId: p.id, userName: p.name, status: past || k < count - 2 ? 'paid' : 'joined' }
  })
  return {
    ...base,
    status: past ? 'completed' : 'confirmed',
    creatorId: creator.id,
    creatorName: creator.name,
    currentPlayers: count,
    maxPlayers: 10,
    participants,
    serviceFeePerPerson: type === 'casual' ? 5_000 * SOM : undefined,
  }
}

export const GAMES: AdminGameDetail[] = Array.from({ length: 14 }, (_, i) => makeGame(i + 1))

// Each user's booking count, as the backend would report it.
for (const user of USERS) {
  if (!user.isOwner) user.bookingCount = BOOKINGS.filter((b) => b.userId === user.id).length
}
