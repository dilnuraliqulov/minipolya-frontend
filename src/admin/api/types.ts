/**
 * Response types the admin panel uses, copied from docs/api-reference.md
 * (backend commit ed5dec6). Optional fields are the ones the backend omits
 * when null (`@JsonInclude(NON_NULL)`). Money is tiyin, timestamps UTC.
 */

export type Language = 'uz' | 'ru' | 'en'

/** `UserResponse` — §3. */
export interface User {
  id: string
  phone?: string
  name: string
  telegramId?: number
  language: Language
  isOwner: boolean
  isAdmin: boolean
  /** Admins who sign in with a password only. */
  username?: string
  createdAt: string
}

/** `AuthResponse` — §2 (Telegram and admin password login). Every field always present. */
export interface AuthResponse {
  token: string
  user: User
}

/** `AdminPlatformStatsResponse` — §10.9. All present; revenue in tiyin. */
export interface PlatformStats {
  totalUsers: number
  totalOwners: number
  newUsersToday: number
  /** Since Monday 00:00 Tashkent — a calendar week, not the last 7 days. */
  newUsersThisWeek: number
  newUsersThisMonth: number
  totalStadiums: number
  approvedStadiums: number
  pendingStadiums: number
  blockedStadiums: number
  totalBookings: number
  /** Bookings STARTING today (Tashkent) with a counted status. */
  todayBookings: number
  weekBookings: number
  monthBookings: number
  totalRevenue: number
  todayRevenue: number
  weekRevenue: number
  /**
   * Payments with status `completed` since the 1st of the month (Tashkent).
   * Misses card payments (`paid`/`captured`) — backend-requests R6.
   */
  monthRevenue: number
  totalGames: number
  activeGames: number
  pendingStadiumApprovals: number
  /** Refunds the provider failed to make. Not shipped yet — request R8. */
  failedRefunds?: number
  /** UTC. Not shipped yet — request R8. */
  oldestFailedRefundAt?: string
}

/** One day of `OwnerRevenueResponse.dailyRevenue` — §10.7. */
export interface DailyRevenue {
  /** `LocalDate` in Tashkent, e.g. "2026-10-22". */
  date: string
  revenue: number
  /**
   * Named bookingCount, but counts payments with status `completed` that day
   * (backend-requests R4, R6). Days without payments are omitted.
   */
  bookingCount: number
}

/** `GET /api/admin/stats/revenue` — the last 30 days, platform-wide. */
export interface PlatformRevenue {
  stadiumId?: string
  dailyRevenue: DailyRevenue[]
}

export type StadiumStatus = 'pending' | 'approved' | 'blocked'

/** `AdminStadiumResponse` — §10.9. */
export interface AdminStadium {
  id: string
  name: string
  address: string
  ownerName: string
  ownerId: string
  status: StadiumStatus
  format: string
  surfaceType: string
  averageRating: number
  reviewCount: number
  totalBookings: number
  totalRevenue: number
  createdAt: string
}
