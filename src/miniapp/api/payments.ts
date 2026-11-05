import { api, type Page } from '../../shared/api'

/** `PaymentResponse`, the player view (no fee split). */
export interface Payment {
  id: string
  bookingId?: string
  gameId?: string
  userId?: string
  /** Tiyin; negative on a refund row. */
  amount: number
  /** `card` | `cash` */
  method: string
  /** `booking` | `remainder` | `team_game` | `game_share` | `service_fee` | `refund` */
  paymentType: string
  provider: string
  providerTxnId?: string
  status: string
  refundReason?: string
  /** R44: on a failed row the provider refused, why (uppercase). */
  declineReason?: string
  createdAt: string
}

export const PAYMENTS_PAGE_SIZE = 20

/** Newest first. */
export function getMyPayments(page = 0): Promise<Page<Payment>> {
  return api.get<Page<Payment>>('/api/payments/my', {
    query: { page, size: PAYMENTS_PAGE_SIZE },
  })
}
