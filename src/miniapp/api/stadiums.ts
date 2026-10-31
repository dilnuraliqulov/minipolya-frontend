import { api, type Page } from '../../shared/api'
import { isAvailable } from './missing'

/** `stadium.format` (api-reference §1.9). */
export const FORMATS = ['5x5', '7x7', '9x9', '11x11'] as const
export type StadiumFormat = (typeof FORMATS)[number]

/** `StadiumResponse` — a list item (public: `pricePerHour` is the player price). */
export interface Stadium {
  id: string
  name: string
  address: string
  district?: string
  latitude?: number
  longitude?: number
  format: string
  /** `natural` | `artificial` | `hybrid` */
  surfaceType: string
  status: string
  /** Tiyin. The ONE price per hour players pay (§1.10). */
  pricePerHour: number
  ownerName?: string
  isActive: boolean
  averageRating?: number
  reviewCount?: number
  /** R23 — not sent yet. */
  coverPhotoUrl?: string
  /** R23 — not sent yet on list items. */
  isFavorited?: boolean
}

export interface Photo {
  id: string
  url: string
  position: number
}

export interface Amenities {
  parking: boolean
  lighting: boolean
  showers: boolean
  lockerRoom: boolean
  wifi: boolean
  cafe: boolean
  equipmentRental: boolean
  tribune: boolean
}

/** `StadiumDetailResponse`. */
export interface StadiumDetail extends Omit<Stadium, 'averageRating' | 'reviewCount'> {
  ownerId: string
  ownerPhone?: string
  phone?: string
  description?: string
  /** `"09:00:00"`, Tashkent */
  openTime: string
  closeTime: string
  /** Tiyin. Absent ⇒ the player pays in full. */
  minBookingAmount?: number
  /** Only for a logged-in caller. */
  isFavorited?: boolean
  cancellationPolicy: { cancellationHours: number }
  photos: Photo[]
  amenities: Amenities
  createdAt: string
  updatedAt: string
  /** R23 — not sent yet on the detail. */
  averageRating?: number
  /** R23 — not sent yet on the detail. */
  reviewCount?: number
}

/** `TimeSlot` — one hour, Tashkent local time. */
export interface TimeSlot {
  /** `"20:00:00"` */
  startTime: string
  endTime: string
  available: boolean
  /** Tiyin; the one price for this hour. Absent when not available. */
  pricePerHour?: number
  /** Tiyin; the price before a promotion. */
  originalPrice?: number
  discountPercent?: number
  promotionName?: string
  hasWaitingGame: boolean
  waitingGameId?: string
  waitingGameType?: string
  playersJoined?: number
  playersNeeded?: number
  /** R23 — not sent yet. */
  unavailableReason?: 'booked' | 'closed'
}

export interface Availability {
  stadiumId: string
  stadiumName: string
  /** `"2026-11-02"` */
  date: string
  slots: TimeSlot[]
}

/** `ReviewResponse`. */
export interface Review {
  id: string
  stadiumId: string
  userId: string
  stadiumName?: string
  userName?: string
  bookingId?: string
  /** 1–5 */
  rating: number
  comment?: string
  ownerReply?: string
  ownerReplyAt?: string
  /** UTC */
  createdAt: string
}

/** R23: the `district` parameter on GET /api/stadiums. */
export const STADIUM_DISTRICT_FILTER = 'GET /api/stadiums district'
/** R23: `coverPhotoUrl` and `isFavorited` on list items. */
export const STADIUM_LIST_PHOTO_FAVORITE = 'StadiumResponse coverPhotoUrl, isFavorited'
/** R23: `averageRating` / `reviewCount` on the detail. */
export const STADIUM_DETAIL_RATING = 'StadiumDetailResponse averageRating, reviewCount'
/** R23: `unavailableReason` on a slot. */
export const SLOT_UNAVAILABLE_REASON = 'TimeSlot unavailableReason'

export const PAGE_SIZE = 20

export interface StadiumFilters {
  q: string
  format: StadiumFormat | null
  /** Tiyin — the player price per hour, upper bound. */
  maxPrice: number | null
  /** Only sent once R23 ships. */
  district: string | null
}

export const NO_FILTERS: StadiumFilters = { q: '', format: null, maxPrice: null, district: null }

/** The query for GET /api/stadiums: only what the API supports, nothing empty. */
export function stadiumListQuery(filters: StadiumFilters, page: number) {
  const q = filters.q.trim()
  return {
    q: q || undefined,
    format: filters.format ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    district:
      filters.district && isAvailable(STADIUM_DISTRICT_FILTER) ? filters.district : undefined,
    page,
    size: PAGE_SIZE,
  }
}

export function getStadiums(filters: StadiumFilters, page: number): Promise<Page<Stadium>> {
  return api.get<Page<Stadium>>('/api/stadiums', { query: stadiumListQuery(filters, page) })
}

export function getStadium(id: string): Promise<StadiumDetail> {
  return api.get<StadiumDetail>(`/api/stadiums/${id}`)
}

/** `date` is a Tashkent calendar date, `"2026-11-02"`. */
export function getAvailability(id: string, date: string): Promise<Availability> {
  return api.get<Availability>(`/api/stadiums/${id}/availability`, { query: { date } })
}

export function getStadiumReviews(id: string, page: number): Promise<Page<Review>> {
  return api.get<Page<Review>>(`/api/reviews/stadium/${id}`, {
    query: { page, size: PAGE_SIZE },
  })
}

export function getFavorites(page: number): Promise<Page<Stadium>> {
  return api.get<Page<Stadium>>('/api/favorites', { query: { page, size: PAGE_SIZE } })
}

export function toggleFavorite(id: string): Promise<{ favorited: boolean }> {
  return api.post<{ favorited: boolean }>(`/api/favorites/${id}/toggle`)
}
