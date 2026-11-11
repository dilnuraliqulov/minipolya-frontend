import { API_CODES, isApiError } from '../../shared/api'
import { getBooking, type Booking } from '../api/bookings'
import { errorMessageKey, type ErrorMessageKey } from '../api/errors'
import { getMyPayments } from '../api/payments'

export type PaymentType = 'booking' | 'remainder'

export type PaymentState =
  | { kind: 'idle' }
  | { kind: 'paying' }
  | { kind: 'success'; booking: Booking }
  /** `reason`: R44 `declineReason`, when the backend says why. */
  | { kind: 'declined'; booking: Booking; reason?: string }
  | { kind: 'checking'; booking: Booking }
  | { kind: 'slotTaken' }
  /** R28: the booking's hold ran out before it was paid; the slot must be booked again. */
  | { kind: 'holdExpired' }
  | { kind: 'failed'; errorKey: ErrorMessageKey }

export interface RunPaymentOptions {
  paymentType: PaymentType
  /** How many times to read the booking while the payment is unsettled. */
  pollTimes?: number
  pollMs?: number
  sleep?: (ms: number) => Promise<void>
  /**
   * R28: the pending booking being paid again. Its 409s are read against it: a
   * payment already on its way, or the booking no longer pending, is looked up
   * instead of being reported as a failure.
   */
  booking?: Booking
  /** Checked after every await; when true nothing more is requested. */
  isCancelled?: () => boolean
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * A booking payment succeeds on `paid` or `partially_paid` (the deposit). A
 * remainder payment that fails leaves `partially_paid`, so only `paid` counts.
 */
export function isSuccess(booking: Booking, type: PaymentType): boolean {
  return type === 'remainder'
    ? booking.paymentStatus === 'paid'
    : booking.paymentStatus === 'paid' || booking.paymentStatus === 'partially_paid'
}

/** Retrying re-charges, so it is offered only after a request that errored. */
export function canRetry(state: PaymentState): boolean {
  return state.kind === 'failed'
}

const declined = (booking: Booking): PaymentState => ({
  kind: 'declined',
  booking,
  reason: booking.declineReason,
})

/**
 * What the booking itself says (backend ccfa4d5+): true = refused (or failed without a
 * refusal), false = not refused, undefined = an older backend that does not say — then
 * the payment row in GET /api/payments/my is read instead.
 */
function refusedOnBooking(booking: Booking): boolean | undefined {
  if (booking.declineReason) return true
  if (booking.paymentState === undefined) return undefined
  return booking.paymentState === 'declined' || booking.paymentState === 'failed'
}

/** Refused, from the booking when it says, else from its payment row. */
async function isRefused(booking: Booking, type: PaymentType): Promise<boolean> {
  const said = refusedOnBooking(booking)
  if (said !== undefined) return said
  return (await paymentRowStatus(booking, type)) === 'failed'
}

/** The newest payment row of this booking (and kind), or undefined. */
async function paymentRowStatus(booking: Booking, type: PaymentType): Promise<string | undefined> {
  try {
    const { content } = await getMyPayments(0)
    return content.find((p) => p.bookingId === booking.id && p.paymentType === type)?.status
  } catch {
    return undefined
  }
}

/**
 * Runs one charge and works out what happened. `charge` creates and charges
 * the booking (or pays its remainder). An unpaid answer is told apart by the
 * booking's own `paymentState` / `declineReason` (R44) — or, from an older
 * backend, by the payment row — and while it is not settled the booking is polled.
 */
export async function runPayment(
  charge: () => Promise<Booking>,
  opts: RunPaymentOptions,
): Promise<PaymentState> {
  const {
    paymentType,
    pollTimes = 5,
    pollMs = 3000,
    sleep = defaultSleep,
    isCancelled = () => false,
  } = opts

  let booking: Booking
  try {
    booking = await charge()
  } catch (error) {
    const code = isApiError(error) ? error.code : undefined
    if (code === API_CODES.bookingExpired) return { kind: 'holdExpired' }
    const elsewhere = code === API_CODES.paymentInProgress || code === API_CODES.bookingNotPending
    if (elsewhere && opts.booking) {
      // Not this call's charge: see where the booking stands now, and if a payment
      // of it is still on its way, wait for it like any unsettled payment.
      try {
        booking = await getBooking(opts.booking.id)
      } catch {
        return { kind: 'checking', booking: opts.booking }
      }
      if (isSuccess(booking, paymentType)) return { kind: 'success', booking }
      if (booking.status !== 'pending') return { kind: 'holdExpired' }
    } else if (code === API_CODES.bookingNotPending) {
      return { kind: 'holdExpired' }
    } else if (paymentType === 'booking' && isApiError(error) && error.status === 409) {
      return { kind: 'slotTaken' }
    } else {
      return { kind: 'failed', errorKey: errorMessageKey(error) }
    }
  }
  if (isSuccess(booking, paymentType)) return { kind: 'success', booking }
  if (isCancelled()) return { kind: 'checking', booking }

  if (await isRefused(booking, paymentType)) return declined(booking)

  for (let i = 0; i < pollTimes; i++) {
    if (isCancelled()) break
    await sleep(pollMs)
    if (isCancelled()) break
    try {
      booking = await getBooking(booking.id)
    } catch {
      continue
    }
    if (isCancelled()) break
    if (isSuccess(booking, paymentType)) return { kind: 'success', booking }
    if (await isRefused(booking, paymentType)) return declined(booking)
  }
  return { kind: 'checking', booking }
}
