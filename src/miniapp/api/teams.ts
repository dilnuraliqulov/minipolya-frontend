import { api } from '../../shared/api'

/** `TeamResponse` — a team the caller leads or belongs to. */
export interface Team {
  id: string
  name: string
  leaderName?: string
  memberCount?: number
}

export type TeamRole = 'leader' | 'member'

export interface TeamMember {
  userId: string
  userName?: string
  role: TeamRole | string
}

/** `TeamDetailResponse`. */
export interface TeamDetail {
  id: string
  name: string
  leaderId: string
  leaderName?: string
  members: TeamMember[]
}

/** R32: a team invite link and joining by it. Not shipped; nothing calls it. */
export const TEAM_INVITE = 'POST /api/teams/join'

export const MY_TEAMS_KEY = ['teams', 'me'] as const
export const teamKey = (id: string) => ['team', id] as const

export function getMyTeams(): Promise<Team[]> {
  return api.get<Team[]>('/api/teams/me')
}

export function getTeam(id: string): Promise<TeamDetail> {
  return api.get<TeamDetail>(`/api/teams/${id}`)
}

export function createTeam(name: string): Promise<TeamDetail> {
  return api.post<TeamDetail>('/api/teams', { name })
}

export function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return api.delete<void>(`/api/teams/${teamId}/members/${userId}`)
}

export function deleteTeam(id: string): Promise<void> {
  return api.delete<void>(`/api/teams/${id}`)
}
