import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import type { Page } from '../../shared/api'
import {
  getAvailability,
  getFavorites,
  getStadium,
  getStadiumReviews,
  toggleFavorite,
  type Stadium,
  type StadiumDetail,
} from '../api/stadiums'
import { previousDate } from './dates'

export const stadiumKey = (id: string) => ['stadium', id] as const
export const FAVORITES_KEY = ['favorites'] as const
/** Every Bosh sahifa list, whatever its filters (`['stadiums', filters]`). */
export const STADIUM_LISTS_KEY = ['stadiums'] as const
export const availabilityKey = (id: string, date: string) => ['availability', id, date] as const

/**
 * Whether yesterday's working day is still open — a stadium whose hours run past midnight
 * is still serving its night hours after 00:00, and the backend still accepts bookings for
 * them. Asked, never derived: the backend answers 400 for a date that is genuinely past,
 * and a day whose hours have all started comes back with nothing still ahead.
 */
export function useYesterdayStillOpen(stadiumId: string, today: string): boolean {
  const yesterday = previousDate(today)
  const { data } = useQuery({
    queryKey: availabilityKey(stadiumId, yesterday),
    queryFn: () => getAvailability(stadiumId, yesterday),
    // A 400 ("date cannot be in the past") is the answer "no", not a failure to retry.
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  // The backend has already marked every hour that has begun as past and unavailable, so
  // "something is still bookable" is its answer, not a clock reading of ours.
  return (data?.slots ?? []).some((slot) => slot.available)
}

export function useStadium(id: string) {
  return useQuery({ queryKey: stadiumKey(id), queryFn: () => getStadium(id) })
}

/** The first page of a stadium's reviews (newest first), for the preview. */
export function useReviewPreview(id: string) {
  return useQuery({ queryKey: ['reviews', id, 'preview'], queryFn: () => getStadiumReviews(id, 0) })
}

export function useReviews(id: string) {
  return useInfiniteQuery({
    queryKey: ['reviews', id],
    queryFn: ({ pageParam }) => getStadiumReviews(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}

export function useFavorites() {
  return useInfiniteQuery({
    queryKey: FAVORITES_KEY,
    queryFn: ({ pageParam }) => getFavorites(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}

/**
 * POST /api/favorites/{id}/toggle. The answer says what it is now; the
 * stadium's cached detail and the loaded Bosh sahifa cards take it, and the
 * favourites list reloads.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleFavorite(id),
    onSuccess: ({ favorited }, id) => {
      queryClient.setQueryData<StadiumDetail>(stadiumKey(id), (detail) =>
        detail ? { ...detail, isFavorited: favorited } : detail,
      )
      queryClient.setQueriesData<InfiniteData<Page<Stadium>>>(
        { queryKey: STADIUM_LISTS_KEY },
        (lists) =>
          lists && {
            ...lists,
            pages: lists.pages.map((page) => ({
              ...page,
              content: page.content.map((stadium) =>
                stadium.id === id ? { ...stadium, isFavorited: favorited } : stadium,
              ),
            })),
          },
      )
      void queryClient.invalidateQueries({ queryKey: FAVORITES_KEY })
    },
  })
}
