import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { CHALLENGES_KEY, getChallenges } from '../api/games'
import { getMyTeams, getTeam, MY_TEAMS_KEY, teamKey, type TeamDetail } from '../api/teams'
import { useLoginUser } from '../auth/sessionContext'
import type { TeamLevel } from './level'

export function useMyTeams(enabled = true) {
  return useQuery({ queryKey: MY_TEAMS_KEY, queryFn: getMyTeams, enabled })
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: teamKey(id ?? ''),
    queryFn: () => getTeam(id ?? ''),
    enabled: id !== undefined,
  })
}

/**
 * Waiting team games an opponent could still join, soonest first (server order).
 * `level` narrows the board to the waiting teams of that level — the **server**
 * filters, so the level is part of the key and a page is never sliced here.
 */
export function useChallenges(level?: TeamLevel, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...CHALLENGES_KEY, level ?? 'all'],
    queryFn: ({ pageParam }) => getChallenges(pageParam, level),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled,
  })
}

/**
 * The level the challenge board should start on: the first of the player's
 * teams that has one. No team, or no level set yet, means "Hammasi".
 */
export function useMyLevel(): { isPending: boolean; level?: TeamLevel } {
  const mine = useMyTeams()
  return { isPending: mine.isPending, level: mine.data?.find((team) => team.level)?.level }
}

/**
 * The teams the player captains. `GET /api/teams/me` has no leader id, so each team's
 * detail is read (a player is in a handful of teams). A failed read counts as
 * "not a captain" — the team flows simply stay hidden.
 */
export function useLedTeams(enabled = true): { isPending: boolean; teams: TeamDetail[] } {
  const me = useLoginUser()
  const mine = useMyTeams(enabled)
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
