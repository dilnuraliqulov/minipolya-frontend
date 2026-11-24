import { api } from '../../shared/api'
import type { TeamLevel } from '../teams/level'

/** `TeamResponse` — a team the caller leads or belongs to. */
export interface Team {
  id: string
  name: string
  leaderName?: string
  memberCount?: number
  /** Changeset 054; absent on a team created before levels existed ("not set"). */
  level?: TeamLevel
}

export type TeamRole = 'leader' | 'member'

export interface TeamMember {
  userId: string
  userName?: string
  role: TeamRole | string
}

/** `TeamUpcomingGameResponse` — the team's next game, for the "Keyingi oʻyin" card. */
export interface TeamUpcomingGame {
  gameId: string
  /** UTC */
  startsAt: string
  /** `open` while an opponent is awaited, else `confirmed`. */
  status: string
  stadiumName?: string
  /** Absent while the opponent is still awaited — never stand anything in for it. */
  opponentName?: string
}

/** `TeamDetailResponse`. */
export interface TeamDetail {
  id: string
  name: string
  leaderId: string
  leaderName?: string
  members: TeamMember[]
  /** Changeset 054; absent on a team created before levels existed ("not set"). */
  level?: TeamLevel
  /** Confirmed team games of this team whose hour has started — the backend counts them. */
  gamesPlayed?: number
  /** The soonest game ahead of the team; absent when it has none. */
  upcomingGame?: TeamUpcomingGame
}

export const MY_TEAMS_KEY = ['teams', 'me'] as const
export const teamKey = (id: string) => ['team', id] as const

export function getMyTeams(): Promise<Team[]> {
  return api.get<Team[]>('/api/teams/me')
}

export function getTeam(id: string): Promise<TeamDetail> {
  return api.get<TeamDetail>(`/api/teams/${id}`)
}

/** The level is required: a team says how seriously it plays from the moment it exists. */
export function createTeam(name: string, level: TeamLevel): Promise<TeamDetail> {
  return api.post<TeamDetail>('/api/teams', { name, level })
}

/** The captain changes the level. 403 for anyone else; nothing else about a team is editable. */
export function updateTeamLevel(id: string, level: TeamLevel): Promise<TeamDetail> {
  return api.patch<TeamDetail>(`/api/teams/${id}`, { level })
}

/** The captain removing a member. */
export function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return api.delete<void>(`/api/teams/${teamId}/members/${userId}`)
}

/** A member walking out — the same endpoint, with themselves as the member. */
export function leaveTeam(teamId: string, userId: string): Promise<void> {
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
