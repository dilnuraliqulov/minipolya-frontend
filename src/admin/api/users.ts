import { api } from '../../shared/api'
import { viaSample } from './missing'
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
