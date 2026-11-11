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

/** The fields of one team of a team game (T9/T10) the team mapping reads; both apps have them. */
export interface TeamRemainderFields {
  remainderAmount: number
  remainderStatus: string
  remainingAmount?: number
  remainderMark?: string
}

/**
 * What a team still owes now (T9 `remainingAmount`). A backend from before T9 sent
 * only `remainderAmount` and `remainderStatus`: the rest is owed while unpaid.
 */
export function teamRemaining(team: TeamRemainderFields): number {
  if (team.remainingAmount !== undefined) return team.remainingAmount
  return team.remainderStatus === 'paid' ? 0 : team.remainderAmount
}

/**
 * The same states for one team of a team game: the owner's cash mark, "not paid"
 * while still owed, owed and unmarked, or paid in full.
 */
export function teamRemainderState(team: TeamRemainderFields): RemainderState {
  if (team.remainderMark === REMAINDER_MARKS.cashReceived) return 'cashReceived'
  const remaining = teamRemaining(team)
  if (team.remainderMark === REMAINDER_MARKS.notPaid && remaining > 0) return 'notPaid'
  return remaining > 0 ? 'remainder' : 'paidInFull'
}
