import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { CHALLENGES_KEY, getChallenges } from '../api/games'
import { getMyTeams, getTeam, MY_TEAMS_KEY, teamKey } from '../api/teams'

export function useMyTeams() {
  return useQuery({ queryKey: MY_TEAMS_KEY, queryFn: getMyTeams })
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: teamKey(id ?? ''),
    queryFn: () => getTeam(id ?? ''),
    enabled: id !== undefined,
  })
}

/** Waiting team games an opponent could still join, soonest first (server order). */
export function useChallenges(enabled = true) {
  return useInfiniteQuery({
    queryKey: CHALLENGES_KEY,
    queryFn: ({ pageParam }) => getChallenges(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled,
  })
}
