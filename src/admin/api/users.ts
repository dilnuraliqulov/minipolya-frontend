import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'
import { isSampleId, loadSampleAdapter, viaSample, withSampleFields } from './missing'
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

/** `OwnerLegalDetailsResponse` (R11). */
export interface OwnerLegalDetails {
  legalType: LegalType
  /** STIR: 9 digits. */
  tin: string
  atmosContractStatus: ContractStatus
  /** Required when the contract is signed. */
  atmosRecipientId?: string
  /** UTC. */
  updatedAt: string
  updatedByName?: string
}

export type OwnerLegalDetailsUpdate = Pick<
  OwnerLegalDetails,
  'legalType' | 'tin' | 'atmosContractStatus' | 'atmosRecipientId'
>

export const LEGAL_DETAILS_GET = 'GET /api/admin/users/{id}/legal-details'
export const LEGAL_DETAILS_PUT = 'PUT /api/admin/users/{id}/legal-details'

/** `null` until an admin has entered them. */
export function getOwnerLegalDetails(userId: string): Promise<OwnerLegalDetails | null> {
  return viaSample(
    LEGAL_DETAILS_GET,
    () => api.get<OwnerLegalDetails | null>(`/api/admin/users/${userId}/legal-details`),
    (sample) => sample.ownerLegalDetails(userId),
  )
}

export function saveOwnerLegalDetails(
  userId: string,
  update: OwnerLegalDetailsUpdate,
): Promise<OwnerLegalDetails> {
  return viaSample(
    LEGAL_DETAILS_PUT,
    () => api.put<OwnerLegalDetails>(`/api/admin/users/${userId}/legal-details`, update),
    (sample) => sample.saveOwnerLegalDetails(userId, update),
  )
}

// ---- The user list ----

export type UserRole = 'player' | 'owner' | 'admin'
export type UserStatus = 'active' | 'blocked'

export interface UserListParams {
  /** Name or phone. */
  search?: string
  /** Request R13. */
  role?: UserRole
  /** Request R13. */
  status?: UserStatus
  page?: number
  size?: number
}

export const USER_FILTERS = 'GET /api/admin/users → ?role, ?status'

/** Newest first. `role` and `status` are request R13; until then development filters the page. */
export async function listUsers(params: UserListParams): Promise<Page<AdminUser>> {
  const { search, role, status, page = 0, size = 20 } = params
  const real = await api.get<Page<AdminUser>>('/api/admin/users', {
    query: { search: search?.trim() || undefined, role, status, page, size },
  })
  return withSampleFields(USER_FILTERS, real, (sample, users) =>
    sample.filterUsers(users, { role, status }),
  )
}

/** The user's page; sample users (linked from sample bookings) come from the adapter. */
export async function getAdminUser(id: string): Promise<AdminUser> {
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.sampleUser(id)
  }
  return getUser(id)
}

/** `PUT /api/admin/users/{id}` — the reason is kept in the audit log. */
export async function setUserBlocked(
  id: string,
  isBlocked: boolean,
  reason?: string,
): Promise<AdminUser> {
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.setSampleUserBlocked(id, isBlocked, reason)
  }
  return api.put<AdminUser>(`/api/admin/users/${id}`, { isBlocked, reason })
}

/** The latest block or unblock: who, when and why. */
export async function getLatestBlock(id: string): Promise<AuditEntry | null> {
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.sampleUserBlock(id)
  }
  const page = await getAuditLog({
    entityType: 'user',
    entityId: id,
    actions: ['USER_BLOCKED', 'USER_UNBLOCKED'],
    size: 1,
  })
  return page.content[0] ?? null
}

// ---- Request R14: a user's teams ----

/** `TeamResponse` (§8) plus the user's role in it. */
export interface UserTeam {
  id: string
  name: string
  leaderName?: string
  memberCount: number
  role: 'leader' | 'member'
}

export const USER_TEAMS = 'GET /api/admin/users/{id}/teams'

export function getUserTeams(id: string): Promise<UserTeam[]> {
  return viaSample(
    USER_TEAMS,
    () => api.get<UserTeam[]>(`/api/admin/users/${id}/teams`),
    (sample) => sample.userTeams(id),
  )
}
