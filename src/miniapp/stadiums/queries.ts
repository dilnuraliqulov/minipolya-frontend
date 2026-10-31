import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getFavorites,
  getStadium,
  getStadiumReviews,
  toggleFavorite,
  type StadiumDetail,
} from '../api/stadiums'

export const stadiumKey = (id: string) => ['stadium', id] as const
export const FAVORITES_KEY = ['favorites'] as const

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
 * stadium's cached detail takes it and the favourites list reloads.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleFavorite(id),
    onSuccess: ({ favorited }, id) => {
      queryClient.setQueryData<StadiumDetail>(stadiumKey(id), (detail) =>
        detail ? { ...detail, isFavorited: favorited } : detail,
      )
      void queryClient.invalidateQueries({ queryKey: FAVORITES_KEY })
    },
  })
}
