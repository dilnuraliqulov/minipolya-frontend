import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'
import type { Language } from './types'

/** `AdminUserResponse` — §10.9. */
export interface AdminUser {
  id: string
  name: string
  phone?: string
  telegramId?: number
  language: Language
  isOwner: boolean
  isAdmin: boolean
  isBlocked: boolean
  /** Bookings the user made as a player. */
  bookingCount: number
  stadiumCount: number
  /** UTC. */
  createdAt: string
  lastActiveAt?: string
}

export function getUser(id: string): Promise<AdminUser> {
  return api.get<AdminUser>(`/api/admin/users/${id}`)
}

// ---- Owner legal details and the ATMOS contract — request R11 ----

export type LegalType = 'yatt' | 'mchj' | 'self_employed'
export type ContractStatus = 'none' | 'pending' | 'signed'

/** `OwnerLegalDetailsResponse`. */
export interface OwnerLegalDetails {
  /** Absent only on a row carried over from before legal details existed. */
  legalType?: LegalType
  /** STIR, 9 digits; the 14-digit JShShIR (PINFL) for `self_employed`. Absent like `legalType`. */
  tin?: string
  atmosContractStatus: ContractStatus
  /** Present only when the contract is signed. */
  atmosRecipientId?: string
  /** UTC. */
  updatedAt: string
  updatedByName?: string
}

export interface OwnerLegalDetailsUpdate {
  legalType: LegalType
  tin: string
  atmosContractStatus: ContractStatus
  /** 1–50 characters; required when signed, ignored otherwise. */
  atmosRecipientId?: string
}

export const LEGAL_DETAILS_GET = 'GET /api/admin/users/{id}/legal-details'
export const LEGAL_DETAILS_PUT = 'PUT /api/admin/users/{id}/legal-details'

/** `null` until an admin has entered them. */
export function getOwnerLegalDetails(userId: string): Promise<OwnerLegalDetails | null> {
  return api.get<OwnerLegalDetails | null>(`/api/admin/users/${userId}/legal-details`)
}

export function saveOwnerLegalDetails(
  userId: string,
  update: OwnerLegalDetailsUpdate,
): Promise<OwnerLegalDetails> {
  return api.put<OwnerLegalDetails>(`/api/admin/users/${userId}/legal-details`, update)
}

// ---- The user list ----

export type UserRole = 'player' | 'owner' | 'admin'
export type UserStatus = 'active' | 'blocked'

export interface UserListParams {
  /** Name or phone. */
  search?: string
  /** `player` is neither owner nor admin. */
  role?: UserRole
  status?: UserStatus
  page?: number
  size?: number
}

/** Request R13. */
export const USER_FILTERS = 'GET /api/admin/users → ?role, ?status'

/** Newest first. */
export function listUsers(params: UserListParams): Promise<Page<AdminUser>> {
  const { search, role, status, page = 0, size = 20 } = params
  return api.get<Page<AdminUser>>('/api/admin/users', {
    query: { search: search?.trim() || undefined, role, status, page, size },
  })
}

/** `PUT /api/admin/users/{id}` — the reason is kept in the audit log. */
export function setUserBlocked(
  id: string,
  isBlocked: boolean,
  reason?: string,
): Promise<AdminUser> {
  return api.put<AdminUser>(`/api/admin/users/${id}`, { isBlocked, reason })
}

/** The latest block or unblock: who, when and why. */
export async function getLatestBlock(id: string): Promise<AuditEntry | null> {
  const page = await getAuditLog({
    entityType: 'user',
    entityId: id,
    actions: ['USER_BLOCKED', 'USER_UNBLOCKED'],
    size: 1,
  })
  return page.content[0] ?? null
}

// ---- Request R14: a user's teams ----

/** `AdminUserTeamResponse`. */
export interface UserTeam {
  id: string
  name: string
  leaderName?: string
  memberCount: number
  /** This user's part in it. */
  role: 'leader' | 'member'
}

export const USER_TEAMS = 'GET /api/admin/users/{id}/teams'

/** Not paged. */
export function getUserTeams(id: string): Promise<UserTeam[]> {
  return api.get<UserTeam[]>(`/api/admin/users/${id}/teams`)
}
