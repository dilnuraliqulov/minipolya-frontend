import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import type { Page } from '../../shared/api'
import {
  getFavorites,
  getStadium,
  getStadiumReviews,
  toggleFavorite,
  type Stadium,
  type StadiumDetail,
} from '../api/stadiums'

export const stadiumKey = (id: string) => ['stadium', id] as const
export const FAVORITES_KEY = ['favorites'] as const
/** Every Bosh sahifa list, whatever its filters (`['stadiums', filters]`). */
export const STADIUM_LISTS_KEY = ['stadiums'] as const
export const availabilityKey = (id: string, date: string) => ['availability', id, date] as const

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
