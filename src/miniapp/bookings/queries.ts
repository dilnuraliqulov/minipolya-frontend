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

export function useBooking(id: string) {
  return useQuery({ queryKey: bookingKey(id), queryFn: () => getBooking(id) })
}
