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

/** R32: the team's invite code (leader only); the link is built with `buildInviteLink('team_' + code)`. */
export interface TeamInvite {
  code: string
}

/** R32: what an invite link points at, for the "Jamoaga qoʻshilish" screen. */
export interface InvitePreview {
  team: Team
  isMember: boolean
}

export const inviteKey = (teamId: string) => ['team', teamId, 'invite'] as const
export const invitePreviewKey = (code: string) => ['team-invite', code] as const

/** The current code, created on first use. 403 for a non-leader. */
export function getTeamInvite(teamId: string): Promise<TeamInvite> {
  return api.get<TeamInvite>(`/api/teams/${teamId}/invite`)
}

/** A new code; the old link stops working. */
export function renewTeamInvite(teamId: string): Promise<TeamInvite> {
  return api.post<TeamInvite>(`/api/teams/${teamId}/invite`)
}

/** 404 "Invite not found" for an unknown or replaced code. */
export function getInvitePreview(code: string): Promise<InvitePreview> {
  return api.get<InvitePreview>(`/api/teams/invite/${encodeURIComponent(code)}`)
}

/** 404 unknown code; 409 already a member. */
export function joinTeam(code: string): Promise<TeamDetail> {
  return api.post<TeamDetail>('/api/teams/join', { code })
}
