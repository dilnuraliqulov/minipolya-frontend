/**
 * DEVELOPMENT ONLY — the sample adapter for endpoints the backend has not
 * shipped (`MISSING_ENDPOINTS` in ../missing.ts). It is imported dynamically
 * behind `import.meta.env.DEV`, so none of it reaches a production build.
 *
 * Its state lives in memory, so actions (approve, block, add a note…) change
 * what the next request returns until the page is reloaded.
 */
import type { Page } from '../../../shared/api'
import type { AuditEntry } from '../audit'
import type { StadiumDetail, StadiumListFields, StadiumNote, StadiumRow } from '../stadiums'
import { DISTRICTS } from '../stadiums'
import type { RefundAlerts } from '../stats'
import type { AdminStadium } from '../types'
import type { OwnerLegalDetails, OwnerLegalDetailsUpdate } from '../users'
import {
  ADMINS,
  AMENITY_SETS,
  daysAgo,
  DISTRICT_CENTRES,
  hoursAgo,
  legalFor,
  pick,
  REJECTED_STADIUMS,
  sampleId,
  SAMPLE_NOTES,
  samplePhoto,
  samplePricing,
  seed,
} from './world'

const SOM = 100
const delay = <T>(value: T, ms = 250) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

function pageOf<T>(items: T[], page = 0, size = 20): Page<T> {
  return {
    content: items.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
  }
}

// ---- R8: failed refunds ----

const failedRefunds = [{ createdAt: hoursAgo(3) }]

export function refundAlerts(): RefundAlerts {
  const oldest = failedRefunds.map((r) => r.createdAt).sort()[0]
  return { failedRefunds: failedRefunds.length, oldestFailedRefundAt: oldest }
}

// ---- R11: owner legal details ----

const legalEdits = new Map<string, OwnerLegalDetails>()

export function ownerLegalDetails(userId: string): Promise<OwnerLegalDetails | null> {
  return delay(legalEdits.get(userId) ?? legalFor(userId))
}

export function saveOwnerLegalDetails(
  userId: string,
  update: OwnerLegalDetailsUpdate,
): Promise<OwnerLegalDetails> {
  const saved: OwnerLegalDetails = {
    ...update,
    atmosRecipientId: update.atmosContractStatus === 'signed' ? update.atmosRecipientId : undefined,
    updatedAt: new Date().toISOString(),
    updatedByName: ADMINS[0]!.name,
  }
  legalEdits.set(userId, saved)
  return delay(saved)
}

function contractOf(ownerId: string) {
  return (legalEdits.get(ownerId) ?? legalFor(ownerId))?.atmosContractStatus ?? 'none'
}

// ---- R9: stadium list and detail fields ----

function listFields(stadium: Pick<AdminStadium, 'id' | 'ownerId' | 'address'>): StadiumListFields {
  // A district named in the address wins; otherwise one picked from the id.
  const named = DISTRICTS.find((d) => stadium.address.toLowerCase().includes(d.toLowerCase()))
  return {
    photoUrl: samplePhoto(stadium.id),
    district: named ?? pick(DISTRICTS, stadium.id),
    pricePerHour: (120_000 + (seed(stadium.id) % 7) * 15_000) * SOM,
    ownerContractStatus: contractOf(stadium.ownerId),
  }
}

/** Adds the R9 fields to a real page and applies the district/format filters to it. */
export function stadiumListFields(
  real: Page<StadiumRow>,
  filters: { district?: string; format?: string },
): Page<StadiumRow> {
  const rows = real.content
    .map((row) => ({ ...row, ...listFields(row) }))
    .filter((row) => !filters.district || row.district === filters.district)
    .filter((row) => !filters.format || row.format === filters.format)
  const filtered = Boolean(filters.district || filters.format)
  return {
    ...real,
    content: rows,
    // Filtering one page here is only an approximation of the backend's filter.
    ...(filtered && { totalElements: rows.length, totalPages: 1 }),
  }
}

function detailFields(stadium: AdminStadium): StadiumDetail {
  const fields = listFields(stadium)
  const [lat, lng] = DISTRICT_CENTRES[fields.district ?? ''] ?? [41.3111, 69.2797]
  const jitter = (seed(stadium.id) % 100) / 10_000
  const withMap = seed(stadium.id) % 4 !== 0
  return {
    ...stadium,
    ...fields,
    photos: [0, 1, 2, 3].map((i) => ({
      id: `${stadium.id}-p${i}`,
      url: samplePhoto(`${stadium.id}-${i}`),
      position: i,
    })),
    latitude: withMap ? lat + jitter : undefined,
    longitude: withMap ? lng - jitter : undefined,
    phone: `+998 9${seed(stadium.id) % 10} ${100 + (seed(stadium.id) % 900)} ${10 + (seed(stadium.id) % 90)} ${10 + (seed(stadium.name) % 90)}`,
    description: 'Yopiq va ochiq maydon, kechki yoritish bilan.',
    openTime: '08:00:00',
    closeTime: '23:00:00',
    amenities: pick(AMENITY_SETS, stadium.id),
    minBookingAmount: seed(stadium.id) % 3 === 0 ? undefined : 50_000 * SOM,
    cancellationHours: pick([6, 12, 24], stadium.id),
    pricingRules: samplePricing(stadium.id, fields.pricePerHour ?? 150_000 * SOM),
  }
}

export function stadiumDetailFields(real: StadiumDetail): StadiumDetail {
  // Real values the backend already sends win over sample ones.
  return { ...detailFields(real), ...stripUndefined(real) }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

// ---- R10: rejected stadiums (exist only here) ----

const sampleStatuses = new Map<string, string>(REJECTED_STADIUMS.map((s) => [s.id, 'rejected']))
const sampleDecisions = new Map<string, AuditEntry>(
  REJECTED_STADIUMS.map((s, i) => [
    s.id,
    {
      id: `${s.id}-decision`,
      time: s.decidedAt,
      actor: { id: ADMINS[i % 2]!.id, name: ADMINS[i % 2]!.name, type: 'ADMIN' },
      action: 'STADIUM_REJECTED',
      entity: { type: 'stadium', id: s.id, label: s.name },
      changes: [{ field: 'status', oldValue: 'pending', newValue: 'rejected' }],
      reason: s.reason,
    },
  ]),
)

function sampleAdminStadium(s: (typeof REJECTED_STADIUMS)[number]): AdminStadium {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    ownerName: s.ownerName,
    ownerId: s.ownerId,
    status: (sampleStatuses.get(s.id) ?? 'rejected') as AdminStadium['status'],
    format: s.format,
    surfaceType: s.surfaceType,
    averageRating: 0,
    reviewCount: 0,
    totalBookings: 0,
    totalRevenue: 0,
    createdAt: s.createdAt,
  }
}

export function rejectedStadiums(query: {
  search?: string
  district?: string
  format?: string
  page?: number
  size?: number
}): Promise<Page<StadiumRow>> {
  const search = query.search?.toLowerCase()
  const rows = REJECTED_STADIUMS.filter((s) => sampleStatuses.get(s.id) === 'rejected')
    .map((s) => ({ ...sampleAdminStadium(s), ...listFields(s), district: s.district }))
    .filter(
      (s) =>
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.ownerName.toLowerCase().includes(search),
    )
    .filter((s) => !query.district || s.district === query.district)
    .filter((s) => !query.format || s.format === query.format)
  return delay(pageOf(rows, query.page, query.size))
}

function findSample(id: string) {
  const s = REJECTED_STADIUMS.find((x) => x.id === id)
  if (!s) throw new Error(`No sample stadium ${id}`)
  return s
}

export function sampleStadium(id: string): Promise<StadiumDetail> {
  const s = findSample(id)
  return delay({ ...detailFields(sampleAdminStadium(s)), district: s.district })
}

export function setSampleStadiumStatus(
  id: string,
  status: 'approved' | 'blocked',
  reason?: string,
): Promise<AdminStadium> {
  const s = findSample(id)
  const before = sampleStatuses.get(id) ?? 'rejected'
  sampleStatuses.set(id, status)
  sampleDecisions.set(id, {
    id: `${id}-decision-${Date.now()}`,
    time: new Date().toISOString(),
    actor: { id: ADMINS[0]!.id, name: ADMINS[0]!.name, type: 'ADMIN' },
    action: status === 'approved' ? 'STADIUM_APPROVED' : 'STADIUM_BLOCKED',
    entity: { type: 'stadium', id, label: s.name },
    changes: [{ field: 'status', oldValue: before, newValue: status }],
    reason,
  })
  return delay(sampleAdminStadium(s))
}

export function sampleDecision(id: string): Promise<AuditEntry | null> {
  return delay(sampleDecisions.get(id) ?? null)
}

// ---- R12: internal notes ----

const notes = new Map<string, StadiumNote[]>()

function notesFor(stadiumId: string): StadiumNote[] {
  let list = notes.get(stadiumId)
  if (!list) {
    const count = seed(stadiumId) % 3
    list = Array.from({ length: count }, (_, i) => ({
      id: `${stadiumId}-note-${i}`,
      text: pick(SAMPLE_NOTES, stadiumId, String(i)),
      authorId: ADMINS[i % 2]!.id,
      authorName: ADMINS[i % 2]!.name,
      createdAt: daysAgo(i * 2 + 1),
    }))
    notes.set(stadiumId, list)
  }
  return list
}

export function stadiumNotes(stadiumId: string): Promise<StadiumNote[]> {
  return delay([...notesFor(stadiumId)])
}

export function addStadiumNote(stadiumId: string, text: string): Promise<StadiumNote> {
  const note: StadiumNote = {
    id: sampleId('note', Date.now() % 10_000),
    text,
    authorId: ADMINS[0]!.id,
    authorName: ADMINS[0]!.name,
    createdAt: new Date().toISOString(),
  }
  notes.set(stadiumId, [note, ...notesFor(stadiumId)])
  return delay(note)
}
