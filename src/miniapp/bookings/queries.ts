import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { BOOKINGS_KEY, bookingKey, getBooking, getBookings } from '../api/bookings'

/** The player's bookings, newest `startsAt` first as the server orders them, paged. */
export function useBookings() {
  return useInfiniteQuery({
    queryKey: BOOKINGS_KEY,
    queryFn: ({ pageParam }) => getBookings(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}

export function useBooking(id: string) {
  return useQuery({ queryKey: bookingKey(id), queryFn: () => getBooking(id) })
}
