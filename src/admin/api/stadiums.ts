import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'
import type { AdminStadium, StadiumStatus } from './types'
import type { ContractStatus } from './users'

// ---- What an admin reviews about a stadium (request R9) ----

/** The review fields on `GET /api/admin/stadiums` rows. */
export interface StadiumListFields {
  /** The first photo, for the list thumbnail. */
  photoUrl?: string
  /** One of `DISTRICTS`. */
  district?: string
  /** Base price, tiyin, net — what the owner set. */
  pricePerHour?: number
  /** The same hour by card, tiyin. */
  price?: number
  /** The owner's ATMOS contract (R11); approval needs `signed`. */
  ownerContractStatus?: ContractStatus
}

export type StadiumRow = AdminStadium & StadiumListFields

/** `PricingRuleResponse` — §10.4. */
export interface PricingRule {
  id: string
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: number
  /** `LocalTime`, "18:00:00". */
  startTime: string
  endTime: string
  /** Tiyin, net. */
  pricePerHour: number
  /** Tiyin, by card. */
  price?: number
}

export interface Amenities {
  parking: boolean
  lighting: boolean
  showers: boolean
  lockerRoom: boolean
  wifi: boolean
  cafe: boolean
  equipmentRental: boolean
  tribune: boolean
}

/** `GET /api/admin/stadiums/{id}` — the public detail's fields, for any status, in the owner's prices. */
export interface StadiumDetailFields extends StadiumListFields {
  photos?: { id: string; url: string; position: number }[]
  latitude?: number
  longitude?: number
  phone?: string
  description?: string
  ownerPhone?: string
  /** `LocalTime`. */
  openTime?: string
  closeTime?: string
  amenities?: Amenities
  /** Tiyin; absent ⇒ players pay in full. */
  minBookingAmount?: number
  cancellationHours?: number
  pricingRules?: PricingRule[]
}

export type StadiumDetail = AdminStadium & StadiumDetailFields

/** Tashkent's districts, as the backend accepts them (`util/Districts`). */
export const DISTRICTS = [
  'Bektemir',
  'Chilonzor',
  'Mirobod',
  'Mirzo Ulugʻbek',
  'Olmazor',
  'Sergeli',
  'Shayxontohur',
  'Uchtepa',
  'Yakkasaroy',
  'Yangihayot',
  'Yashnobod',
  'Yunusobod',
]

export const STADIUM_LIST_FIELDS =
  'GET /api/admin/stadiums → photoUrl, district, pricePerHour, ownerContractStatus; ?district, ?format'
export const STADIUM_DETAIL_FIELDS =
  'GET /api/admin/stadiums/{id} → photos, location, hours, amenities, pricing, booking terms'
/** Request R10: a stadium status of its own for a rejection. */
export const REJECTED_STATUS = 'GET /api/admin/stadiums?status=rejected'

export type StadiumTab = StadiumStatus | 'all'

export interface StadiumListParams {
  tab: StadiumTab
  search?: string
  district?: string
  format?: string
  page?: number
  size?: number
}

export function listStadiums(params: StadiumListParams): Promise<Page<StadiumRow>> {
  const { tab, search, district, format, page = 0, size = 20 } = params
  const query = {
    status: tab === 'all' ? undefined : tab,
    search: search?.trim() || undefined,
    district,
    format,
    page,
    size,
  }
  return api.get<Page<StadiumRow>>('/api/admin/stadiums', { query })
}

export function getStadium(id: string): Promise<StadiumDetail> {
  return api.get<StadiumDetail>(`/api/admin/stadiums/${id}`)
}

/**
 * `PUT /api/admin/stadiums/{id}/status`. `rejected` only from pending; it and
 * `blocked` need a reason, which the owner sees. `approved` needs the owner's
 * signed ATMOS contract (400 otherwise).
 */
export function setStadiumStatus(
  id: string,
  status: 'approved' | 'rejected' | 'blocked',
  reason?: string,
): Promise<AdminStadium> {
  return api.put<AdminStadium>(`/api/admin/stadiums/${id}/status`, { status, reason })
}

/** The audit actions that change a stadium's status. */
export const STADIUM_DECISIONS = [
  'STADIUM_APPROVED',
  'STADIUM_REJECTED',
  'STADIUM_BLOCKED',
  'STADIUM_UNBLOCKED',
  'STADIUM_STATUS_CHANGED',
]

/** The latest status decision: who blocked or rejected it, when, and why. */
export async function getLatestDecision(id: string): Promise<AuditEntry | null> {
  const page = await getAuditLog({
    entityType: 'stadium',
    entityId: id,
    actions: STADIUM_DECISIONS,
    size: 1,
  })
  return page.content[0] ?? null
}

// ---- Internal notes (request R12) ----

export interface StadiumNote {
  id: string
  text: string
  authorId: string
  authorName: string
  /** UTC. */
  createdAt: string
}

export const NOTES_GET = 'GET /api/admin/stadiums/{id}/notes'
export const NOTES_POST = 'POST /api/admin/stadiums/{id}/notes'

/** Newest first. */
export function getStadiumNotes(id: string): Promise<StadiumNote[]> {
  return api.get<StadiumNote[]>(`/api/admin/stadiums/${id}/notes`)
}

/** `text`: 1–1000 characters. */
export function addStadiumNote(id: string, text: string): Promise<StadiumNote> {
  return api.post<StadiumNote>(`/api/admin/stadiums/${id}/notes`, { text })
}

/** Request R14: one owner's stadiums (`?ownerId=` on the admin list). */
export const OWNER_STADIUMS = 'GET /api/admin/stadiums → ?ownerId'

export function listOwnerStadiums(ownerId: string, page = 0): Promise<Page<StadiumRow>> {
  return api.get<Page<StadiumRow>>('/api/admin/stadiums', { query: { ownerId, page, size: 20 } })
}
