import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { CHALLENGES_KEY, getChallenges } from '../api/games'
import { getMyTeams, getTeam, MY_TEAMS_KEY, teamKey, type TeamDetail } from '../api/teams'
import { useLoginUser } from '../auth/sessionContext'

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

/**
 * The teams the player captains. `GET /api/teams/me` has no leader id, so each team's
 * detail is read (a player is in a handful of teams). A failed read counts as
 * "not a captain" — the team flows simply stay hidden.
 */
export function useLedTeams(): { isPending: boolean; teams: TeamDetail[] } {
  const me = useLoginUser()
  const mine = useMyTeams()
  const details = useQueries({
    queries: (mine.data ?? []).map((team) => ({
      queryKey: teamKey(team.id),
      queryFn: () => getTeam(team.id),
    })),
  })
  return {
    isPending: mine.isPending || details.some((d) => d.isPending),
    teams: details.flatMap((d) => (d.data && d.data.leaderId === me.id ? [d.data] : [])),
  }
}
