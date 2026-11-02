import { api, type Page } from '../../shared/api'
import type { Booking } from './bookings'

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
}

export interface StadiumBasics {
  name?: string
  address?: string
  district?: string
  format?: string
  surfaceType?: string
}

/** `PUT /api/owner/stadiums/{id}`: only non-null fields change. */
export interface UpdateStadiumBody extends StadiumBasics {
  /** Tiyin, the owner's amount; at least 50 000. The API cannot clear it back to "full payment only". */
  minBookingAmount?: number
}

export interface CreateStadiumBody extends Required<
  Pick<StadiumBasics, 'name' | 'address' | 'format' | 'surfaceType'>
> {
  district?: string
  phone?: string
  description?: string
  /** `"09:00:00"` */
  openTime: string
  closeTime: string
  /** Tiyin. */
  pricePerHour: number
  minBookingAmount?: number
  cancellationHours?: number
}

export const OWNER_STADIUMS = 'GET /api/owner/stadiums'
/** R35–R39: not shipped; nothing calls them. */
export const OWNER_STADIUM_DETAIL = 'GET /api/owner/stadiums/{id}'
export const STADIUM_PHOTO_UPLOAD = 'POST /api/owner/stadiums/{id}/photos'
export const OWNER_BOOKING_CASH = 'POST /api/owner/bookings/{id}/cash'
export const OWNER_UNPAID = 'GET /api/owner/dashboard/stadiums/{id}/bookings?unpaid'
export const OWNER_LEGAL = 'GET /api/owner/legal-details'

export const OWNER_STADIUMS_KEY = ['owner', 'stadiums'] as const
export const pricingKey = (id: string) => ['owner', 'pricing', id] as const
export const closuresKey = (id: string) => ['owner', 'closures', id] as const
export const scheduleKey = (id: string, date: string) => ['owner', 'schedule', id, date] as const
export const statsKey = (id: string) => ['owner', 'stats', id] as const

/** The calling owner's stadiums, any status (not paged). Needs the `isOwner` claim. */
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

export function getOwnerBookings(stadiumId: string, page: number): Promise<Page<Booking>> {
  return api.get<Page<Booking>>(`/api/owner/stadiums/${stadiumId}/bookings`, {
    query: { page, size: 20 },
  })
}
