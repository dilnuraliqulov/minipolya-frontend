import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { gameKey, getGame, getMyGames, MY_GAMES_KEY } from '../api/games'

/** While a team is joining (R45), re-read every 10 s until the backend settles it. */
export const JOIN_PENDING_REFRESH_MS = 10_000

export function useGame(id: string) {
  return useQuery({
    queryKey: gameKey(id),
    queryFn: () => getGame(id),
    refetchInterval: (query) => (query.state.data?.joinPending ? JOIN_PENDING_REFRESH_MS : false),
  })
}

/** Games the player is in, latest first (server order), paged. */
export function useMyGames() {
  return useInfiniteQuery({
    queryKey: MY_GAMES_KEY,
    queryFn: ({ pageParam }) => getMyGames(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}
