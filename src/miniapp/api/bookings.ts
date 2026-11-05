import { api, type Page } from '../../shared/api'

export const BOOKINGS_PAGE_SIZE = 20

/** `booking.status` (api-reference §1.9). */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'expired'
  | 'cancelled_by_user'
  | 'cancelled_by_owner'
  | 'cancelled_opponent_left'

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid'

/**
 * R44: why a card payment was refused. Uppercase on the wire (the backend's
 * `DeclineReason` enum names), unlike the other enums.
 */
export type DeclineReason = 'INSUFFICIENT_FUNDS' | 'CARD_EXPIRED' | 'CARD_DECLINED'

/**
 * Where the booking's latest card payment stands (backend `ccfa4d5`); always sent by
 * that backend. `declined` exactly when `declineReason` is present; `failed` = failed
 * without a refusal (e.g. never acknowledged); `none` = no card payment.
 */
export type BookingPaymentState = 'paid' | 'processing' | 'declined' | 'failed' | 'none'

/** Request side only: uppercase. */
export type PaymentOption = 'MINIMUM' | 'FULL'

/** `BookingResponse`, the player view (api-reference §5). Money is tiyin, times UTC. */
export interface Booking {
  id: string
  stadiumId: string
  stadiumName: string
  userId?: string
  gameId?: string
  seriesId?: string
  /** `app` | `manual` | `game` */
  source: string
  status: BookingStatus
  startsAt: string
  endsAt: string
  durationHours: number
  /** Tiyin: the one price the player pays. */
  price: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: PaymentStatus
  /** Owner view only: the owner's own price (tiyin). */
  ownerPrice?: number
  /** Owner view only: card money paid in the app and kept (tiyin). */
  paidInApp?: number
  /** Owner view only: what the owner receives (tiyin). */
  ownerReceives?: number
  clientName?: string
  clientPhone?: string
  isWalkin: boolean
  /** The hold deadline while `pending`. */
  expiresAt?: string
  cancelledAt?: string
  cancellationReason?: string
  cancellationPolicy: { cancellationHours: number }
  cancellationDeadline?: string
  /** Tiyin; display, never recompute. */
  refundIfCancelledNow?: number
  /** Tiyin; only on a cancellation response. */
  refundAmount?: number
  /** R44: the latest card payment (in full, deposit or remainder) was refused, and why. */
  declineReason?: DeclineReason | string
  /** Absent only from a backend older than `ccfa4d5`. */
  paymentState?: BookingPaymentState | string
  createdAt: string
  /** R30: tiyin taken in cash. Not shipped; the client does not read it. */
  paidInCash?: number
  /** R31: not shipped; the client does not read these. */
  stadiumCoverPhotoUrl?: string
  stadiumDistrict?: string
  stadiumFormat?: string
}

/** R27: `GET /api/stadiums/{id}/quote` — price, deposit, remainder, deadline before paying. */
export const BOOKING_QUOTE = 'GET /api/stadiums/{id}/quote'
/** R28: `POST /api/bookings/{id}/pay` — pay a pending, unpaid booking within its hold. */
export const BOOKING_PAY = 'POST /api/bookings/{id}/pay'
/** R29: `?when=upcoming|past` on the booking list. */
export const BOOKINGS_WHEN = 'GET /api/bookings?when'
/** R30: `paidInCash` on the player `BookingResponse`. */
export const BOOKING_CASH_PAID = 'BookingResponse.paidInCash'
/** R31: `stadiumCoverPhotoUrl`, `stadiumDistrict`, `stadiumFormat` on `BookingResponse`. */
export const BOOKING_STADIUM_FIELDS = 'BookingResponse.stadiumCoverPhotoUrl'

export const BOOKINGS_KEY = ['bookings'] as const
export const bookingKey = (id: string) => ['booking', id] as const

export interface CreateBookingBody {
  stadiumId: string
  /** ISO UTC, on the hour in Tashkent. */
  startsAt: string
  cardId: string
  paymentOption: PaymentOption
}

/**
 * Creates the booking and charges the card in the same call. A decline is
 * still 200: read `paymentStatus`, and `declineReason` for why.
 */
export function createBooking(body: CreateBookingBody): Promise<Booking> {
  return api.post<Booking>('/api/bookings', body)
}

export function getBookings(page: number): Promise<Page<Booking>> {
  return api.get<Page<Booking>>('/api/bookings', {
    query: { page, size: BOOKINGS_PAGE_SIZE },
  })
}

export function getBooking(id: string): Promise<Booking> {
  return api.get<Booking>(`/api/bookings/${id}`)
}

/** Pays the whole remainder of a `partially_paid` booking from a saved card. */
export function payRemainder(id: string, cardId: string): Promise<Booking> {
  return api.post<Booking>(`/api/bookings/${id}/pay-remainder`, { cardId })
}

export function cancelBooking(id: string): Promise<Booking> {
  return api.post<Booking>(`/api/bookings/${id}/cancel`)
}
