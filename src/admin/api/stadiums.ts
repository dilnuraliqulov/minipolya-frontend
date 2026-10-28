import { api, type Page } from '../../shared/api'
import { getAuditLog, type AuditEntry } from './audit'
import { isSampleId, loadSampleAdapter, viaSample, withSampleFields } from './missing'
import type { AdminStadium, StadiumStatus } from './types'
import type { ContractStatus } from './users'

// ---- Request R9: what an admin needs to review a stadium ----

/** New fields on `GET /api/admin/stadiums` rows (R9). */
export interface StadiumListFields {
  /** The first photo, for the list thumbnail. */
  photoUrl?: string
  /** One of `DISTRICTS`. */
  district?: string
  /** Base price, tiyin. */
  pricePerHour?: number
  /** The owner's ATMOS contract (R11). */
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
  /** Tiyin. */
  pricePerHour: number
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

/** New fields on `GET /api/admin/stadiums/{id}` (R9) — what the public detail has, for any status. */
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

/** Tashkent's districts, for the `district` field and filter (R9). */
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

export type StadiumTab = StadiumStatus | 'rejected' | 'all'

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
  if (tab === 'rejected') {
    return viaSample(
      REJECTED_STATUS,
      () => api.get<Page<StadiumRow>>('/api/admin/stadiums', { query }),
      (sample) => sample.rejectedStadiums(query),
    )
  }
  return api
    .get<Page<StadiumRow>>('/api/admin/stadiums', { query })
    .then((real) =>
      withSampleFields(STADIUM_LIST_FIELDS, real, (sample, rows) =>
        sample.stadiumListFields(rows, { district, format }),
      ),
    )
}

export async function getStadium(id: string): Promise<StadiumDetail> {
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.sampleStadium(id)
  }
  const real = await api.get<StadiumDetail>(`/api/admin/stadiums/${id}`)
  return withSampleFields(STADIUM_DETAIL_FIELDS, real, (sample, stadium) =>
    sample.stadiumDetailFields(stadium),
  )
}

/**
 * `PUT /api/admin/stadiums/{id}/status`. A rejection is `blocked` today — the
 * backend tells it apart only by the audit action (`STADIUM_REJECTED`);
 * R10 asks for a `rejected` status, and then `reject` sends that instead.
 */
export async function setStadiumStatus(
  id: string,
  status: 'approved' | 'blocked',
  reason?: string,
): Promise<AdminStadium> {
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.setSampleStadiumStatus(id, status, reason)
  }
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
  if (isSampleId(id)) {
    const sample = await loadSampleAdapter()
    return sample.sampleDecision(id)
  }
  const page = await getAuditLog({
    entityType: 'stadium',
    entityId: id,
    actions: STADIUM_DECISIONS,
    size: 1,
  })
  return page.content[0] ?? null
}

// ---- Request R12: internal notes ----

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
  return viaSample(
    NOTES_GET,
    () => api.get<StadiumNote[]>(`/api/admin/stadiums/${id}/notes`),
    (sample) => sample.stadiumNotes(id),
  )
}

export function addStadiumNote(id: string, text: string): Promise<StadiumNote> {
  return viaSample(
    NOTES_POST,
    () => api.post<StadiumNote>(`/api/admin/stadiums/${id}/notes`, { text }),
    (sample) => sample.addStadiumNote(id, text),
  )
}

/** Request R14: one owner's stadiums (`?ownerId=` on the admin list). */
export const OWNER_STADIUMS = 'GET /api/admin/stadiums → ?ownerId'

export function listOwnerStadiums(ownerId: string): Promise<Page<StadiumRow>> {
  return viaSample(
    OWNER_STADIUMS,
    () => api.get<Page<StadiumRow>>('/api/admin/stadiums', { query: { ownerId, size: 50 } }),
    // Until then: the real list, filtered here.
    (sample) =>
      sample.ownerStadiums(ownerId, () =>
        api.get<Page<StadiumRow>>('/api/admin/stadiums', { query: { size: 100 } }),
      ),
  )
}
