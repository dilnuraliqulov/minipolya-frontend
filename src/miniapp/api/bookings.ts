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

/**
 * E5: the owner's mark on what was left to pay — "Naqd olindi" (`POST …/cash`) or
 * "Toʻlanmadi" (`POST …/not-paid`).
 */
export type RemainderMark = 'cash_received' | 'not_paid'

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
  /** E4 (R30): tiyin that arrived in cash at the pitch; absent or 0 when none. */
  paidInCash?: number
  /** E4/E8: the owner's mark on the remainder; absent when none. */
  remainderMark?: RemainderMark | string
  /** E8, owner and admin views: when the mark was set (UTC). */
  remainderMarkedAt?: string
  /** E8, owner view only: the owner may undo the mark until then (UTC); later only an admin. */
  remainderMarkUndoableUntil?: string
  /** R31: not shipped; the client does not read these. */
  stadiumCoverPhotoUrl?: string
  stadiumDistrict?: string
  stadiumFormat?: string
}

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

/**
 * R29: `upcoming` — starting now or later, soonest first; `past` — started
 * already, newest first. The split and the order are the server's.
 */
export type BookingsWhen = 'upcoming' | 'past'

export function getBookings(page: number, when: BookingsWhen): Promise<Page<Booking>> {
  return api.get<Page<Booking>>('/api/bookings', {
    query: { when, page, size: BOOKINGS_PAGE_SIZE },
  })
}

export function getBooking(id: string): Promise<Booking> {
  return api.get<Booking>(`/api/bookings/${id}`)
}

/**
 * R28: pays a pending booking again — the same or another card after a decline —
 * for the same amount as its first attempt (the deposit or the whole price; the
 * server decides). A decline is still 200 with the new `declineReason` and the
 * same `expiresAt` (the hold is never extended). 409 `BOOKING_NOT_PENDING`,
 * `BOOKING_EXPIRED`, `PAYMENT_IN_PROGRESS`.
 */
export function payBooking(id: string, cardId: string): Promise<Booking> {
  return api.post<Booking>(`/api/bookings/${id}/pay`, { cardId })
}

/** Pays the whole remainder of a `partially_paid` booking from a saved card. */
export function payRemainder(id: string, cardId: string): Promise<Booking> {
  return api.post<Booking>(`/api/bookings/${id}/pay-remainder`, { cardId })
}

export function cancelBooking(id: string): Promise<Booking> {
  return api.post<Booking>(`/api/bookings/${id}/cancel`)
}
