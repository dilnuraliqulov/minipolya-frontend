/**
 * Design E10: where a booking's money stands, read from the API's own fields —
 * nothing is worked out. One mapping for the Mini App (player and owner) and the
 * admin panel; each app supplies its own words.
 *
 * - `remainder` — something is still owed (`remainingAmount` > 0), unmarked
 * - `notPaid` — the owner marked the remainder "Toʻlanmadi" (it is still owed)
 * - `cashReceived` — the owner took it in cash ("Naqd olindi"), or cash arrived
 * - `paidInFull` — paid in full in the app
 *
 * `null` when there is nothing to say: a cancelled or expired booking, or a hold
 * still waiting for its first payment.
 */
export type RemainderState = 'remainder' | 'notPaid' | 'cashReceived' | 'paidInFull'

/** The booking fields the mapping reads; both apps' booking types have them. */
export interface RemainderFields {
  status: string
  paymentStatus: string
  remainingAmount: number
  paidInCash?: number
  remainderMark?: string
}

export const REMAINDER_MARKS = {
  cashReceived: 'cash_received',
  notPaid: 'not_paid',
} as const

export function remainderState(booking: RemainderFields): RemainderState | null {
  if (booking.status === 'expired' || booking.status.startsWith('cancelled')) return null
  if (booking.status === 'pending') return null
  if (booking.remainderMark === REMAINDER_MARKS.cashReceived) return 'cashReceived'
  if (booking.remainderMark === REMAINDER_MARKS.notPaid && booking.remainingAmount > 0) {
    return 'notPaid'
  }
  if (booking.remainingAmount > 0) return 'remainder'
  if (booking.paymentStatus === 'paid') {
    return (booking.paidInCash ?? 0) > 0 ? 'cashReceived' : 'paidInFull'
  }
  return null
}
