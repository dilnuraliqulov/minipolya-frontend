/**
 * Response types the admin panel uses, copied from docs/api-reference.md
 * (backend commit 00d3bb7). Optional fields are the ones the backend omits
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
  /** Since Monday 00:00 Tashkent — a calendar week. */
  newUsersThisWeek: number
  /** The last 7 × 24 hours, whatever the weekday. */
  newUsersLast7Days: number
  newUsersThisMonth: number
  totalStadiums: number
  approvedStadiums: number
  pendingStadiums: number
  blockedStadiums: number
  rejectedStadiums: number
  totalBookings: number
  /** Bookings STARTING today (Tashkent) with a counted status. */
  todayBookings: number
  weekBookings: number
  monthBookings: number
  /** Card money kept through the app, cash excluded (the backend's one revenue figure). */
  totalRevenue: number
  todayRevenue: number
  weekRevenue: number
  /** Since the 1st of the month (Tashkent). */
  monthRevenue: number
  totalGames: number
  activeGames: number
  pendingOwnerApplications: number
  pendingStadiumApprovals: number
  // The previous period, for the comparison lines (the panel works out the %).
  /** Bookings starting on the same weekday last week, counted like `todayBookings`. */
  todayBookingsLastWeek: number
  /** Last month from the 1st to the same day of the month, counted like `monthRevenue`. */
  previousMonthRevenueToDate: number
  /** Users created 7 to 14 days ago — the period before `newUsersLast7Days`. */
  newUsersPrevious7Days: number
  /** Stadiums that were approved 7 days ago. */
  approvedStadiumsWeekAgo: number
  /** Refunds the provider declined that still wait for an admin. */
  failedRefunds: number
  /** UTC; omitted when there are none. */
  oldestFailedRefundAt?: string
}

/** One day of `GET /api/admin/stats/bookings-daily` — the last 30 days, every day present. */
export interface DailyBookingCount {
  /** `LocalDate` in Tashkent, e.g. "2026-10-22". */
  date: string
  /** Bookings starting that day, counted like `todayBookings`. */
  bookingCount: number
}

export type StadiumStatus = 'pending' | 'approved' | 'blocked' | 'rejected'

/** `AdminStadiumResponse` — §10.9. */
export interface AdminStadium {
  id: string
  name: string
  address: string
  ownerName: string
  ownerId: string
  status: StadiumStatus
  /** Why it is rejected or blocked; absent otherwise. */
  statusReason?: string
  format: string
  surfaceType: string
  averageRating: number
  reviewCount: number
  totalBookings: number
  totalRevenue: number
  createdAt: string
}
