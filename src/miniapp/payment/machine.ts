import { isApiError } from '../../shared/api'
import { getBooking, type Booking } from '../api/bookings'
import { errorMessageKey, type ErrorMessageKey } from '../api/errors'
import { getMyPayments } from '../api/payments'

export type PaymentType = 'booking' | 'remainder'

export type PaymentState =
  | { kind: 'idle' }
  | { kind: 'paying' }
  | { kind: 'success'; booking: Booking }
  | { kind: 'declined'; booking: Booking }
  | { kind: 'checking'; booking: Booking }
  | { kind: 'slotTaken' }
  | { kind: 'failed'; errorKey: ErrorMessageKey }

export interface RunPaymentOptions {
  paymentType: PaymentType
  /** How many times to read the booking while the payment is unsettled. */
  pollTimes?: number
  pollMs?: number
  sleep?: (ms: number) => Promise<void>
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

/** The newest payment row of this booking (and kind), or undefined. */
async function paymentRowStatus(booking: Booking, type: PaymentType): Promise<string | undefined> {
  try {
    const { content } = await getMyPayments(0)
    return content.find(
      (p) => p.bookingId === booking.id && (type === 'booking' || p.paymentType === 'remainder'),
    )?.status
  } catch {
    return undefined
  }
}

/**
 * Runs one charge and works out what happened. `charge` creates and charges
 * the booking (or pays its remainder). An unpaid answer cannot tell declined
 * from still-processing: the payment row says it, and while it is not settled
 * the booking is polled.
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
    if (paymentType === 'booking' && isApiError(error) && error.status === 409) {
      return { kind: 'slotTaken' }
    }
    return { kind: 'failed', errorKey: errorMessageKey(error) }
  }
  if (isSuccess(booking, paymentType)) return { kind: 'success', booking }
  if (isCancelled()) return { kind: 'checking', booking }

  if ((await paymentRowStatus(booking, paymentType)) === 'failed') {
    return { kind: 'declined', booking }
  }

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
    const status = await paymentRowStatus(booking, paymentType)
    if (status === 'failed') return { kind: 'declined', booking }
  }
  return { kind: 'checking', booking }
}
