/**
 * Fixture records for the overflow check.
 *
 * Everything here is chosen to STRESS the layout, not to be realistic: the
 * longest names a Tashkent admin could plausibly meet in Uzbek and Russian,
 * long addresses, amounts in the tens of millions of soʻm, full pages of rows,
 * long block reasons and audit entries. A fixture that reads comfortably at
 * 360px proves nothing.
 *
 * Money is TIYIN. Timestamps are UTC.
 */

export const STADIUM_ID = '0b4f6a2e-7c31-4a8d-9e52-1f7b8c3d4e5a'
export const USER_ID = 'a1c2e3f4-5b6d-47a8-9c01-2d3e4f5a6b7c'
export const OWNER_ID = 'f9e8d7c6-b5a4-4321-8765-0a1b2c3d4e5f'
export const BOOKING_ID = '3c7d9e1f-2a4b-46c8-b0d2-5e6f7a8b9c0d'
export const GAME_ID = '8d2b4f6a-1c3e-45a7-9b8c-0d1e2f3a4b5c'
export const PAYMENT_ID = '5a6b7c8d-9e0f-41a2-b3c4-d5e6f7a8b9c0'

// ---- The long strings everything else is built from ----

/** 46 characters: a real-shaped Uzbek stadium name with a number on the end. */
export const LONG_STADIUM_NAME = 'Chilonzor Yangi Zamonaviy Mini Futbol Maydoni №14'
/** A full Uzbek patronymic, the longest ordinary case. */
export const LONG_UZ_NAME = 'Abdurahmonov Shohruhmirzo Bahodirovich'
/** Russian, for the Cyrillic subset and a long surname. */
export const LONG_RU_NAME = 'Константинопольский Владислав Автономович'
export const LONG_ADDRESS =
  'Toshkent shahri, Chilonzor tumani, Bunyodkor shoh koʻchasi, 12/3-uy, 2-qavat, 5-xona'
export const LONG_LANDMARK =
  'Bunyodkor metro bekatidan 300 metr janubda, katta savdo markazi yonida'

/** 500 characters — the backend's limit for a block reason. */
export const LONG_REASON =
  'Foydalanuvchi oxirgi uch hafta ichida oʻn ikki marta bronni oʻyin boshlanishiga ikki soat qolganda bekor qildi va maydon egalariga zarar yetkazdi. ' +
  'Qoʻshimcha ravishda boshqa oʻyinchilarga nisbatan haqoratli xabarlar yozgani uchun uch marta shikoyat tushgan. ' +
  'Qoʻllab-quvvatlash xizmati ikki marta ogohlantirish yuborgan, ammo xatti-harakat oʻzgarmadi. ' +
  'Shu sababli hisob vaqtincha bloklanadi va qayta koʻrib chiqilgunga qadar ilovadan foydalana olmaydi.'

/** The biggest amount the panel can meet: 12 345 000 soʻm. */
export const BIG_AMOUNT = 1_234_500_000
export const HUGE_AMOUNT = 4_865_000_000

const NOW = '2026-11-17T09:00:00Z'

// ---- Users ----

export const admin = {
  id: 'd0d0d0d0-0000-4000-8000-000000000001',
  name: 'Administrator Abdusalomov Jasurbek',
  username: 'admin',
  language: 'uz' as const,
  isOwner: false,
  isAdmin: true,
  createdAt: '2026-01-05T08:00:00Z',
}

export const user = {
  id: USER_ID,
  name: LONG_UZ_NAME,
  phone: '+998 90 123 45 67',
  telegramId: 384756192837,
  language: 'uz' as const,
  isOwner: true,
  isAdmin: false,
  isBlocked: true,
  bookingCount: 1287,
  stadiumCount: 4,
  createdAt: '2026-02-14T06:30:00Z',
  lastActiveAt: NOW,
}

export const owner = {
  id: OWNER_ID,
  name: LONG_RU_NAME,
  phone: '+998 97 654 32 10',
  telegramId: 918273645501,
  language: 'ru' as const,
  isOwner: true,
  isAdmin: false,
  isBlocked: false,
  bookingCount: 42,
  stadiumCount: 7,
  createdAt: '2026-03-01T05:00:00Z',
  lastActiveAt: NOW,
}

export const userRows = Array.from({ length: 20 }, (_, i) => ({
  ...user,
  id: i === 0 ? USER_ID : `${USER_ID.slice(0, -3)}${(i + 16).toString(16).padStart(3, '0')}`,
  name: i % 2 === 0 ? `${LONG_UZ_NAME} ${i}` : `${LONG_RU_NAME} ${i}`,
  isBlocked: i % 3 === 0,
  bookingCount: 1287 - i * 13,
}))

export const teams = [
  { id: 't1', name: 'Yunusobod United Veteranlar Jamoasi', memberCount: 18, role: 'leader' },
  {
    id: 't2',
    name: 'Чиланзарские Орлы Объединённые',
    leaderName: LONG_RU_NAME,
    memberCount: 23,
    role: 'member',
  },
]

export const legalDetails = {
  legalType: 'mchj' as const,
  tin: '305678912',
  atmosContractStatus: 'signed' as const,
  atmosRecipientId: 'ATMOS-RECIPIENT-0b4f6a2e7c314a8d9e52',
  updatedAt: NOW,
  updatedByName: admin.name,
}

// ---- Stadiums ----

const amenities = {
  parking: true,
  lighting: true,
  showers: true,
  lockerRoom: true,
  wifi: true,
  cafe: true,
  equipmentRental: true,
  tribune: true,
  toilet: true,
  covered: true,
  bibs: true,
  drinkingWater: true,
}

export const stadium = {
  id: STADIUM_ID,
  name: LONG_STADIUM_NAME,
  address: LONG_ADDRESS,
  ownerName: LONG_RU_NAME,
  ownerId: OWNER_ID,
  status: 'pending' as const,
  format: '5x5',
  surfaceType: 'artificial',
  averageRating: 4.8,
  reviewCount: 1342,
  totalBookings: 9876,
  totalRevenue: HUGE_AMOUNT,
  createdAt: '2026-04-02T07:15:00Z',
  district: 'Chilonzor',
  pricePerHour: 14_000_000,
  playerPrice: 15_000_000,
  ownerReceives: 13_780_000,
  atmosFee: 220_000,
  ownerContractStatus: 'signed' as const,
  // The map is one of the widest elements on the page, so it must be measured.
  latitude: 41.2745,
  longitude: 69.2031,
  phone: '+998 71 200 30 40',
  description:
    'Zamonaviy sunʼiy qoplamali maydon, yoritgichlar, kiyinish xonalari va dush bilan taʼminlangan. ' +
    'Avtoturargoh 40 ta avtomobilga moʻljallangan. Hafta kunlari ertalab chegirmalar amal qiladi.',
  landmark: LONG_LANDMARK,
  ownerPhone: '+998 97 654 32 10',
  openTime: '06:00:00',
  closeTime: '23:00:00',
  amenities,
  minBookingAmount: 5_000_000,
  playerMinBookingAmount: 5_500_000,
  cancellationHours: 24,
  cancellationPolicy: { cancellationHours: 24 },
  photos: Array.from({ length: 6 }, (_, i) => ({
    id: `photo-${i}`,
    url: `/api/uploads/stadiums/${STADIUM_ID}/${i}.jpg`,
    position: i,
  })),
  photoUrl: `/api/uploads/stadiums/${STADIUM_ID}/0.jpg`,
  pricingRules: Array.from({ length: 7 }, (_, day) => ({
    id: `rule-${day}`,
    dayOfWeek: day,
    startTime: '18:00:00',
    endTime: '23:00:00',
    pricePerHour: 14_000_000 + day * 500_000,
    playerPrice: 15_000_000 + day * 500_000,
    ownerReceives: 13_780_000 + day * 500_000,
    atmosFee: 220_000,
  })),
}

export const stadiumRows = Array.from({ length: 20 }, (_, i) => ({
  ...stadium,
  id: i === 0 ? STADIUM_ID : `${STADIUM_ID.slice(0, -3)}${(i + 16).toString(16).padStart(3, '0')}`,
  name: `${LONG_STADIUM_NAME} ${i}`,
  status: (['pending', 'approved', 'blocked', 'rejected'] as const)[i % 4]!,
  statusReason: i % 4 === 3 ? LONG_REASON : undefined,
}))

export const notes = Array.from({ length: 4 }, (_, i) => ({
  id: `note-${i}`,
  text: `${LONG_REASON.slice(0, 220)} (${i + 1})`,
  authorId: admin.id,
  authorName: admin.name,
  createdAt: `2026-11-1${i}T10:00:00Z`,
}))

// ---- Bookings, games, payments ----

export const booking = {
  id: BOOKING_ID,
  stadiumId: STADIUM_ID,
  stadiumName: LONG_STADIUM_NAME,
  userId: USER_ID,
  userName: LONG_UZ_NAME,
  userPhone: '+998 90 123 45 67',
  source: 'app' as const,
  status: 'confirmed',
  startsAt: '2026-11-20T15:00:00Z',
  endsAt: '2026-11-20T16:00:00Z',
  durationHours: 1,
  price: BIG_AMOUNT,
  ownerPrice: 1_200_000_000,
  paidAmount: 500_000_000,
  remainingAmount: 734_500_000,
  paymentStatus: 'partially_paid',
  paidInApp: 500_000_000,
  ownerReceives: 1_178_000_000,
  atmosFee: 22_000_000,
  paidInCash: 0,
  isWalkin: false,
  clientName: LONG_RU_NAME,
  clientPhone: '+998 97 654 32 10',
  createdAt: NOW,
}

export const bookingRows = Array.from({ length: 20 }, (_, i) => ({
  ...booking,
  id: i === 0 ? BOOKING_ID : `${BOOKING_ID.slice(0, -3)}${(i + 16).toString(16).padStart(3, '0')}`,
  status: (['pending', 'confirmed', 'completed', 'cancelled'] as const)[i % 4]!,
  price: BIG_AMOUNT - i * 1_000_000,
  cancellationReason: i % 4 === 3 ? LONG_REASON : undefined,
}))

const players = Array.from({ length: 12 }, (_, i) => ({
  userId: `player-${i}`,
  userName: i % 2 === 0 ? `${LONG_UZ_NAME} ${i}` : `${LONG_RU_NAME} ${i}`,
  status: (['joined', 'paid', 'cancelled', 'refunded'] as const)[i % 4]!,
}))

const team = (side: 'a' | 'b') => ({
  side,
  teamId: `team-${side}`,
  teamName: side === 'a' ? 'Yunusobod United Veteranlar Jamoasi' : 'Чиланзарские Орлы Объединённые',
  leaderId: side === 'a' ? USER_ID : OWNER_ID,
  leaderName: side === 'a' ? LONG_UZ_NAME : LONG_RU_NAME,
  price: 617_250_000,
  remainderAmount: 300_000_000,
  remainderStatus: 'unpaid' as const,
  paymentOption: 'minimum',
  paidAmount: 317_250_000,
  remainingAmount: 300_000_000,
  paidInApp: 317_250_000,
  platformFee: 2_500_000,
  ownerPart: 314_750_000,
  ownerAdvance: 314_750_000,
  ownerRemainder: 300_000_000,
  ownerReceives: 610_000_000,
  atmosFee: 7_250_000,
  players,
})

export const game = {
  id: GAME_ID,
  type: 'team_vs_team',
  status: 'scheduled',
  stadiumId: STADIUM_ID,
  stadiumName: LONG_STADIUM_NAME,
  startsAt: '2026-11-21T15:00:00Z',
  endsAt: '2026-11-21T16:00:00Z',
  totalPrice: BIG_AMOUNT,
  creatorId: USER_ID,
  creatorName: LONG_UZ_NAME,
  teamAName: 'Yunusobod United Veteranlar Jamoasi',
  teamBName: 'Чиланзарские Орлы Объединённые',
  currentPlayers: 24,
  maxPlayers: 24,
  bookingId: BOOKING_ID,
  createdAt: NOW,
  teams: [team('a'), team('b')],
}

export const gameRows = Array.from({ length: 20 }, (_, i) => ({
  ...game,
  id: i === 0 ? GAME_ID : `${GAME_ID.slice(0, -3)}${(i + 16).toString(16).padStart(3, '0')}`,
  status: (['scheduled', 'completed', 'cancelled'] as const)[i % 3]!,
}))

export const payment = {
  id: PAYMENT_ID,
  createdAt: NOW,
  userId: USER_ID,
  userName: LONG_UZ_NAME,
  userPhone: '+998 90 123 45 67',
  paymentType: 'booking',
  stadiumId: STADIUM_ID,
  stadiumName: LONG_STADIUM_NAME,
  bookingId: BOOKING_ID,
  amount: BIG_AMOUNT,
  ownerAmount: 1_200_000_000,
  platformAmount: 34_500_000,
  ownerNet: 1_178_000_000,
  platformNet: 34_500_000,
  atmosFee: 22_000_000,
  providerCommission: 22_000_000,
  method: 'card',
  provider: 'atmos',
  providerTxnId: 'ATMOS-TXN-0b4f6a2e7c314a8d9e521f7b8c3d4e5a',
  status: 'succeeded',
}

export const paymentRows = Array.from({ length: 20 }, (_, i) => ({
  ...payment,
  id: i === 0 ? PAYMENT_ID : `${PAYMENT_ID.slice(0, -3)}${(i + 16).toString(16).padStart(3, '0')}`,
  status: (['succeeded', 'failed', 'pending', 'refunded'] as const)[i % 4]!,
  paymentType: (['booking', 'remainder', 'team_game', 'refund'] as const)[i % 4]!,
  amount: i % 4 === 3 ? -BIG_AMOUNT : BIG_AMOUNT - i * 1_000_000,
  failureReason: i % 4 === 1 ? LONG_REASON.slice(0, 180) : undefined,
  refundReason: i % 4 === 3 ? LONG_REASON.slice(0, 180) : undefined,
}))

export const paymentSummary = {
  totalAmount: HUGE_AMOUNT,
  ownerAmount: 4_600_000_000,
  platformAmount: 265_000_000,
  atmosFee: 73_000_000,
  refundedAmount: -BIG_AMOUNT,
  count: 4312,
}

// ---- Settings, stats, audit ----

export const settings = {
  id: 'settings-1',
  teamGamePlatformFee: 2_500_000,
  casualGameServiceFee: 500_000,
  cardFeeBps: 150,
  paymentRoundingStep: 100_000,
  defaultMinBookingAmount: 5_000_000,
  updatedAt: NOW,
}

export const stats = {
  totalUsers: 128_430,
  totalOwners: 1_204,
  newUsersToday: 312,
  newUsersThisWeek: 2_145,
  newUsersLast7Days: 2_310,
  newUsersThisMonth: 9_876,
  totalStadiums: 1_432,
  approvedStadiums: 1_201,
  pendingStadiums: 143,
  blockedStadiums: 52,
  rejectedStadiums: 36,
  totalBookings: 486_512,
  todayBookings: 1_287,
  weekBookings: 8_934,
  monthBookings: 38_120,
  totalRevenue: HUGE_AMOUNT,
  todayRevenue: BIG_AMOUNT,
  weekRevenue: 3_200_000_000,
  monthRevenue: 4_100_000_000,
  totalGames: 54_310,
  activeGames: 892,
  pendingOwnerApplications: 27,
  pendingStadiumApprovals: 143,
  todayBookingsLastWeek: 1_104,
  previousMonthRevenueToDate: 3_800_000_000,
  newUsersPrevious7Days: 2_050,
  approvedStadiumsWeekAgo: 1_180,
  failedRefunds: 7,
  oldestFailedRefundAt: '2026-11-09T12:00:00Z',
}

export const dailyBookings = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  bookingCount: 800 + ((i * 97) % 600),
}))

const ACTIONS = [
  'USER_BLOCKED',
  'USER_UNBLOCKED',
  'STADIUM_APPROVED',
  'STADIUM_REJECTED',
  'PLATFORM_SETTINGS_CHANGED',
]

export const auditEntries = Array.from({ length: 20 }, (_, i) => ({
  id: `audit-${i}`,
  time: `2026-11-${String(17 - (i % 17)).padStart(2, '0')}T08:${String(i).padStart(2, '0')}:00Z`,
  actor: { id: admin.id, name: admin.name, type: 'ADMIN' as const },
  action: ACTIONS[i % ACTIONS.length]!,
  entity: { type: 'user', id: USER_ID, label: LONG_UZ_NAME },
  changes: [
    { field: 'isBlocked', oldValue: false, newValue: true },
    // A 36-character UUID in a changed value: the longest unbreakable token
    // the panel can meet (Review Focus 5).
    { field: 'atmosRecipientId', oldValue: null, newValue: STADIUM_ID },
    { field: 'defaultMinBookingAmount', oldValue: 5_000_000, newValue: BIG_AMOUNT },
  ],
  reason: LONG_REASON,
  ip: '213.230.108.242',
}))

export const settingsAudit = auditEntries.map((entry) => ({
  ...entry,
  action: 'PLATFORM_SETTINGS_CHANGED',
  entity: { type: 'settings', id: settings.id, label: 'Platforma sozlamalari' },
  changes: [{ field: 'teamGamePlatformFee', oldValue: 2_000_000, newValue: BIG_AMOUNT }],
}))

export const page = <T>(content: T[], size = 20) => ({
  content,
  page: 0,
  size,
  totalElements: content.length === 0 ? 0 : 137,
  totalPages: content.length === 0 ? 0 : 7,
})
