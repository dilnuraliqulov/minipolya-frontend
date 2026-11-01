import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { gameKey, getGame, getMyGames, MY_GAMES_KEY } from '../api/games'

export function useGame(id: string) {
  return useQuery({ queryKey: gameKey(id), queryFn: () => getGame(id) })
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
