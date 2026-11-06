import { api, uploadWithProgress, type Page } from '../../shared/api'
import type { Booking } from './bookings'
import type { Amenities, Review } from './stadiums'

/** `StadiumResponse` in the owner's view — the owner's own prices (§1.10). */
export interface OwnerStadium {
  id: string
  name: string
  address?: string
  district?: string
  format?: string
  surfaceType?: string
  coverPhotoUrl?: string
  /** Tiyin: the owner's own hourly price. */
  pricePerHour?: number
  /** Tiyin: what players pay for that hour. */
  playerPrice?: number
  /** `pending` | `approved` | `rejected` | `blocked` */
  status: string
  /** Why a stadium is rejected or blocked. */
  statusReason?: string
  /** "Moʻljal". */
  landmark?: string
  isActive?: boolean
  averageRating?: number
  reviewCount?: number
}

export interface PricingRule {
  id: string
  stadiumId: string
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number
  /** `"18:00:00"` */
  startTime: string
  endTime: string
  /** Tiyin, the owner's own price. */
  pricePerHour: number
  playerPrice?: number
  isActive: boolean
}

/** `PromotionResponse` (api-reference §10.5): a discount over a time window. */
export interface Promotion {
  id: string
  stadiumId: string
  stadiumName?: string
  name: string
  description?: string
  /** 1–100. */
  discountPercent: number
  /** ISO UTC; the window is inclusive at both ends. */
  startsAt: string
  endsAt: string
  /** 0 = Monday … 6 = Sunday; absent = every day. */
  dayOfWeek?: number
  /** `"18:00:00"`, Tashkent; absent = all hours. */
  startTime?: string
  endTime?: string
  isActive: boolean
  createdAt?: string
}

export interface CreatePromotionBody {
  name: string
  discountPercent: number
  startsAt: string
  endsAt: string
}

export interface Closure {
  id: string
  stadiumId: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  reason?: string
}

export interface WaitingGame {
  gameId: string
  teamName?: string
  startsAt: string
  endsAt: string
}

/** `OwnerScheduleResponse` — one day. */
export interface ScheduleDay {
  date: string
  bookings: Booking[]
  waitingGames: WaitingGame[]
  totalSlots: number
  bookedSlots: number
  /** Tiyin. */
  revenue: number
}

export interface OwnerStats {
  stadiumId: string
  stadiumName: string
  todayBookings: number
  weekBookings: number
  monthBookings: number
  totalBookings: number
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  totalRevenue: number
  averageRating: number
  reviewCount: number
  occupancyPercent: number
  /** R38, tiyin: completed payments in the app / in cash, and what is still owed, per period. */
  todayPaidInApp: number
  todayPaidInCash: number
  todayOutstanding: number
  weekPaidInApp: number
  weekPaidInCash: number
  weekOutstanding: number
  monthPaidInApp: number
  monthPaidInCash: number
  monthOutstanding: number
}

export interface StadiumBasics {
  name?: string
  address?: string
  district?: string
  format?: string
  surfaceType?: string
}

/**
 * `PUT /api/owner/stadiums/{id}`: only non-null fields change, each checked like on
 * create. Booking terms are the admin's (design D2/D3) and photos go through the upload.
 */
export interface UpdateStadiumBody extends StadiumBasics {
  /** `+998XXXXXXXXX`. */
  phone?: string
  /** At most 500 characters. */
  description?: string
  /** At most 150 characters; blank clears it. */
  landmark?: string
  /** Both or neither, inside Uzbekistan. */
  latitude?: number
  longitude?: number
  /** Tiyin, the owner's own base hourly price: 1 000 000–500 000 000. */
  pricePerHour?: number
  /** `"09:00:00"` — whole hours, close after open. */
  openTime?: string
  closeTime?: string
  /** The whole block replaces the old one: send all twelve flags. */
  amenities?: Amenities
}

/** `POST /api/owner/stadiums` (design D1, D8–D15). */
export interface CreateStadiumBody {
  name: string
  address: string
  /** One of `DISTRICTS`. */
  district: string
  landmark?: string
  latitude: number
  longitude: number
  /** `+998XXXXXXXXX`. */
  phone: string
  description?: string
  format: string
  surfaceType: string
  /** `"09:00:00"` */
  openTime: string
  closeTime: string
  /** Tiyin, the owner's own price. */
  pricePerHour: number
  amenities: Amenities
}

export const OWNER_STADIUMS = 'GET /api/owner/stadiums'

export const OWNER_STADIUMS_KEY = ['owner', 'stadiums'] as const
export const pricingKey = (id: string) => ['owner', 'pricing', id] as const
export const closuresKey = (id: string) => ['owner', 'closures', id] as const
export const promotionsKey = (id: string) => ['owner', 'promotions', id] as const
export const ownerGameKey = (id: string) => ['owner', 'game', id] as const
export const OWNER_SCHEDULE_KEY = ['owner', 'schedule'] as const
export const scheduleKey = (id: string, date: string) => [...OWNER_SCHEDULE_KEY, id, date] as const
export const statsKey = (id: string) => ['owner', 'stats', id] as const
export const OWNER_LEGAL_KEY = ['owner', 'legal'] as const

/**
 * The caller's stadiums, any status (not paged). Since R42 any signed-in user
 * may call it — a player who submitted a stadium sees it here as `pending`.
 */
export function getOwnerStadiums(): Promise<OwnerStadium[]> {
  return api.get<OwnerStadium[]>('/api/owner/stadiums')
}

export function createStadium(body: CreateStadiumBody): Promise<{ id: string }> {
  return api.post<{ id: string }>('/api/owner/stadiums', body)
}

/** Only the fields given are changed (the API applies non-null values). */
export function updateStadium(id: string, body: UpdateStadiumBody): Promise<unknown> {
  return api.put(`/api/owner/stadiums/${id}`, body)
}

export function getPricing(stadiumId: string): Promise<PricingRule[]> {
  return api.get<PricingRule[]>(`/api/owner/stadiums/${stadiumId}/pricing`)
}

export function addPricing(
  stadiumId: string,
  body: { dayOfWeek: number; startTime: string; endTime: string; pricePerHour: number },
): Promise<PricingRule> {
  return api.post<PricingRule>(`/api/owner/stadiums/${stadiumId}/pricing`, body)
}

export interface PricingRuleBody {
  dayOfWeek: number
  startTime: string
  endTime: string
  pricePerHour: number
}

/** `PUT /api/owner/stadiums/{id}/pricing/{ruleId}`: one weekday per rule, like a new one. */
export function updatePricing(
  stadiumId: string,
  id: string,
  body: PricingRuleBody,
): Promise<PricingRule> {
  return api.put<PricingRule>(`/api/owner/stadiums/${stadiumId}/pricing/${id}`, body)
}

export function removePricing(stadiumId: string, id: string): Promise<void> {
  return api.delete<void>(`/api/owner/stadiums/${stadiumId}/pricing/${id}`)
}

export function getClosures(stadiumId: string): Promise<Closure[]> {
  return api.get<Closure[]>(`/api/owner/stadiums/${stadiumId}/closures`)
}

export function addClosure(
  stadiumId: string,
  body: { startDate: string; endDate: string; reason?: string },
): Promise<Closure> {
  return api.post<Closure>(`/api/owner/stadiums/${stadiumId}/closures`, { stadiumId, ...body })
}

export function removeClosure(id: string): Promise<void> {
  return api.delete<void>(`/api/owner/closures/${id}`)
}

export function getSchedule(stadiumId: string, date: string): Promise<ScheduleDay[]> {
  return api.get<ScheduleDay[]>(`/api/owner/dashboard/stadiums/${stadiumId}/schedule`, {
    query: { from: date, to: date },
  })
}

export function getOwnerStats(stadiumId: string): Promise<OwnerStats> {
  return api.get<OwnerStats>(`/api/owner/dashboard/stadiums/${stadiumId}/stats`)
}

export interface ManualBookingBody {
  clientName: string
  clientPhone: string
  /** ISO UTC, on the hour in Tashkent. */
  startsAt: string
  notes?: string
  paymentMethod?: 'cash'
}

export function createManualBooking(stadiumId: string, body: ManualBookingBody): Promise<Booking> {
  return api.post<Booking>(`/api/owner/stadiums/${stadiumId}/bookings`, body)
}

/** The owner cancels: always a full refund of every card payment. */
export function ownerCancelBooking(id: string): Promise<Booking> {
  return api.delete<Booking>(`/api/owner/bookings/${id}`)
}

/** Newest first. The backend has no filter, so the schedule reads one large page. */
export function getPromotions(stadiumId: string): Promise<Page<Promotion>> {
  return api.get<Page<Promotion>>(`/api/owner/stadiums/${stadiumId}/promotions`, {
    query: { page: 0, size: 100 },
  })
}

export function createPromotion(stadiumId: string, body: CreatePromotionBody): Promise<Promotion> {
  return api.post<Promotion>(`/api/owner/stadiums/${stadiumId}/promotions`, body)
}

export function deactivatePromotion(id: string): Promise<void> {
  return api.put<void>(`/api/owner/promotions/${id}/deactivate`)
}

/** R39: the owner's legal form and ATMOS contract status, read-only. */
export interface OwnerLegal {
  /** `yatt` | `mchj` | `self_employed` */
  legalType?: string
  /** `none` | `pending` | `signed` */
  atmosContractStatus: string
}

export function getOwnerLegal(): Promise<OwnerLegal> {
  return api.get<OwnerLegal>('/api/owner/legal-details')
}

export const ownerReviewsKey = (id: string) => ['owner', 'reviews', id] as const

/** Newest first. */
export function getOwnerReviews(stadiumId: string, page: number): Promise<Page<Review>> {
  return api.get<Page<Review>>(
    `/api/owner/dashboard/stadiums/${stadiumId}/reviews?page=${page}&size=20`,
  )
}

/** The stadium's owner answers a review (2000 characters at most). */
export function replyToReview(reviewId: string, reply: string): Promise<Review> {
  return api.post<Review>(`/api/reviews/${reviewId}/reply`, { reply })
}

/** `PhotoResponse`: the lowest `position` is the cover. `url` may be relative — show it with `mediaUrl`. */
export interface StadiumPhoto {
  id: string
  url: string
  position: number
}

/** R35: `StadiumDetailResponse` in the owner's view (own prices + what players pay), any status. */
export interface OwnerStadiumDetail extends OwnerStadium {
  phone?: string
  description?: string
  /** `"08:00:00"` */
  openTime: string
  closeTime: string
  /** Tiyin, the owner's own minimum; absent = the platform default (T1). */
  minBookingAmount?: number
  /** Tiyin, what a player pays as the effective minimum (own or default); always sent since T1. */
  playerMinBookingAmount?: number
  cancellationPolicy?: { cancellationHours: number }
  photos?: StadiumPhoto[]
  latitude?: number
  longitude?: number
  amenities?: Amenities
}

export const ownerStadiumKey = (id: string) => ['owner', 'stadium', id] as const

export function getOwnerStadium(id: string): Promise<OwnerStadiumDetail> {
  return api.get<OwnerStadiumDetail>(`/api/owner/stadiums/${id}`)
}

/**
 * R36 / D5: JPEG/PNG/WebP up to 5 MB, at most 10 per stadium; goes last. Any
 * signed-in user for their own stadium (D6). `onProgress` gets 0–1 as it uploads.
 */
export function uploadStadiumPhoto(
  stadiumId: string,
  file: Blob,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<StadiumPhoto> {
  const body = new FormData()
  body.append('file', file, file instanceof File ? file.name : 'photo.jpg')
  return uploadWithProgress<StadiumPhoto>(`/api/owner/stadiums/${stadiumId}/photos`, body, {
    onProgress,
    signal,
  })
}

export function deleteStadiumPhoto(stadiumId: string, photoId: string): Promise<null> {
  return api.delete<null>(`/api/owner/stadiums/${stadiumId}/photos/${photoId}`)
}

/** Every photo id exactly once, in the new order; the first is the cover. */
export function reorderStadiumPhotos(
  stadiumId: string,
  photoIds: string[],
): Promise<StadiumPhoto[]> {
  return api.put<StadiumPhoto[]>(`/api/owner/stadiums/${stadiumId}/photos/order`, { photoIds })
}

/**
 * R37/E5: the owner took the booking's remaining amount in cash ("Naqd olindi"); also sets
 * `remainderMark: cash_received`. 403 not the owner; 409 cancelled/expired or nothing left.
 */
export function markBookingCash(bookingId: string): Promise<Booking> {
  return api.post<Booking>(`/api/owner/bookings/${bookingId}/cash`)
}

/**
 * E5: "Toʻlanmadi" — the player did not pay the rest. No charge, no penalty; the booking
 * keeps its remainder and the player can still pay it. Same 403/409 as the cash mark.
 */
export function markBookingNotPaid(bookingId: string): Promise<Booking> {
  return api.post<Booking>(`/api/owner/bookings/${bookingId}/not-paid`)
}

/**
 * E5/E6: undoes the mark until `remainderMarkUndoableUntil` (the end of the Tashkent day it
 * was set); the cash row of a `cash_received` mark is voided. Later: 409, admin only.
 */
export function undoRemainderMark(bookingId: string): Promise<Booking> {
  return api.delete<Booking>(`/api/owner/bookings/${bookingId}/remainder-mark`)
}

/** R43: one entry per day of the window, oldest first, zero days included. */
export interface OwnerRevenue {
  stadiumId: string
  dailyRevenue: { date: string; revenue: number; bookingCount: number }[]
}

export const revenueKey = (id: string, days: number) => ['owner', 'revenue', id, days] as const

export function getOwnerRevenue(stadiumId: string, days: 7 | 30): Promise<OwnerRevenue> {
  return api.get<OwnerRevenue>(`/api/owner/dashboard/stadiums/${stadiumId}/revenue?days=${days}`)
}

export const unpaidKey = (id: string) => ['owner', 'unpaid', id] as const

/** R38: live bookings with a remaining amount, soonest first (owner view). */
export function getUnpaidBookings(stadiumId: string, page: number): Promise<Page<Booking>> {
  return api.get<Page<Booking>>(
    `/api/owner/dashboard/stadiums/${stadiumId}/bookings?unpaid=true&page=${page}&size=20`,
  )
}
