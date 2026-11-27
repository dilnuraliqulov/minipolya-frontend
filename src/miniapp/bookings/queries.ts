import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  BOOKINGS_KEY,
  bookingKey,
  getBooking,
  getBookings,
  type BookingsWhen,
} from '../api/bookings'

/**
 * One tab of the player's bookings (R29), paged, in the server's order. Keyed
 * under BOOKINGS_KEY, so invalidating that refreshes both tabs.
 */
export function useBookings(when: BookingsWhen) {
  return useInfiniteQuery({
    queryKey: [...BOOKINGS_KEY, when],
    queryFn: ({ pageParam }) => getBookings(pageParam, when),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}

/** How often a booking whose card payment is still being checked is read again. */
export const PROCESSING_POLL_MS = 3000

/**
 * How long until the booking is read again: a few seconds while its card payment is still
 * being checked, never otherwise. `false` is react-query's "do not poll".
 */
export function pollWhileProcessing(booking?: { paymentState?: string }): number | false {
  return booking?.paymentState === 'processing' ? PROCESSING_POLL_MS : false
}

/**
 * One booking. While its latest card payment is still being checked
 * (`paymentState === 'processing'`) the booking is read again every few seconds, so the page
 * becomes "paid" or "declined" by itself: ATMOS answers the confirmation with a connection
 * error for money it has in fact taken, and the backend then asks it again — moments later
 * the same booking says `paid`. The polling stops as soon as it does, so a settled booking
 * costs no extra request.
 */
export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKey(id),
    queryFn: () => getBooking(id),
    refetchInterval: (query) => pollWhileProcessing(query.state.data),
  })
}
