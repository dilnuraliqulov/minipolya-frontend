/**
 * DEVELOPMENT ONLY — the made-up records behind the sample adapter. Imported
 * only by ./adapter.ts, which is itself loaded only in development.
 *
 * Fields the backend does not send yet are filled in for real records
 * deterministically from their id, so the same stadium always gets the same
 * district, photo and contract.
 */
import { SAMPLE_ID_PREFIX } from '../missing'
import type { Amenities, PricingRule } from '../stadiums'
import type { ContractStatus, LegalType } from '../users'

export const now = () => Date.now()
export const hoursAgo = (hours: number) => new Date(now() - hours * 3_600_000).toISOString()
export const daysAgo = (days: number) => hoursAgo(days * 24)
export const inHours = (hours: number) => hoursAgo(-hours)

/** A stable small number from a string, to pick sample values for a real id. */
export function seed(text: string): number {
  let hash = 7
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

export function pick<T>(items: readonly T[], key: string, salt = ''): T {
  return items[seed(key + salt) % items.length]!
}

export const sampleId = (kind: string, n: number) =>
  `${SAMPLE_ID_PREFIX}${kind}-${String(n).padStart(4, '0')}`

/** A drawn pitch as an inline SVG — no network request for sample photos. */
export function samplePhoto(key: string): string {
  const hues = [138, 150, 160, 128, 145]
  const hue = pick(hues, key)
  const light = 30 + (seed(key) % 12)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% ${light + 12}%)"/><stop offset="1" stop-color="hsl(${hue} 50% ${light}%)"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><g fill="none" stroke="hsl(0 0% 100% / .7)" stroke-width="3"><rect x="20" y="20" width="360" height="220"/><line x1="200" y1="20" x2="200" y2="240"/><circle cx="200" cy="130" r="36"/><rect x="20" y="85" width="44" height="90"/><rect x="336" y="85" width="44" height="90"/></g></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const DISTRICT_CENTRES: Record<string, [number, number]> = {
  Bektemir: [41.2096, 69.3346],
  Chilonzor: [41.2756, 69.2034],
  Mirobod: [41.2906, 69.2808],
  'Mirzo Ulugʻbek': [41.3383, 69.3348],
  Olmazor: [41.3529, 69.2127],
  Sergeli: [41.2266, 69.2198],
  Shayxontohur: [41.3227, 69.2436],
  Uchtepa: [41.2961, 69.1724],
  Yakkasaroy: [41.2849, 69.2512],
  Yangihayot: [41.2075, 69.1897],
  Yashnobod: [41.2984, 69.3367],
  Yunusobod: [41.3644, 69.2868],
}

export const AMENITY_SETS: Amenities[] = [
  {
    parking: true,
    lighting: true,
    showers: true,
    lockerRoom: true,
    wifi: false,
    cafe: false,
    equipmentRental: true,
    tribune: true,
  },
  {
    parking: true,
    lighting: true,
    showers: false,
    lockerRoom: true,
    wifi: true,
    cafe: true,
    equipmentRental: false,
    tribune: false,
  },
  {
    parking: false,
    lighting: true,
    showers: true,
    lockerRoom: true,
    wifi: false,
    cafe: false,
    equipmentRental: false,
    tribune: false,
  },
]

const SOM = 100

export function samplePricing(stadiumId: string, base: number): PricingRule[] {
  const evening = base + 30_000 * SOM
  const weekend = base + 45_000 * SOM
  const rules: PricingRule[] = []
  for (let day = 0; day < 5; day++) {
    rules.push({
      id: `${stadiumId}-pr-${day}`,
      dayOfWeek: day,
      startTime: '18:00:00',
      endTime: '23:00:00',
      pricePerHour: evening,
    })
  }
  for (const day of [5, 6]) {
    rules.push({
      id: `${stadiumId}-pr-${day}`,
      dayOfWeek: day,
      startTime: '08:00:00',
      endTime: '23:00:00',
      pricePerHour: weekend,
    })
  }
  return rules
}

export interface SampleLegal {
  legalType: LegalType
  tin: string
  atmosContractStatus: ContractStatus
  atmosRecipientId?: string
  updatedAt: string
  updatedByName?: string
}

/** A real or sample owner's legal details, or null when "not entered" (about a third). */
export function legalFor(ownerId: string): SampleLegal | null {
  const variant = seed(ownerId) % 3
  if (variant === 0) return null
  const signed = variant === 2
  return {
    legalType: pick(['yatt', 'mchj', 'self_employed'] as const, ownerId),
    tin: String(300_000_000 + (seed(ownerId) % 600_000_000)),
    atmosContractStatus: signed ? 'signed' : 'pending',
    atmosRecipientId: signed ? String(10_000 + (seed(ownerId) % 9_000)) : undefined,
    updatedAt: daysAgo(3 + (seed(ownerId) % 20)),
    updatedByName: pick(['Aziz Rahimov', 'Dilnoza Karimova'], ownerId),
  }
}

export const ADMINS = [
  { id: `${SAMPLE_ID_PREFIX}admin-1`, name: 'Aziz Rahimov' },
  { id: `${SAMPLE_ID_PREFIX}admin-2`, name: 'Dilnoza Karimova' },
]

/** Stadiums that exist only here: the "Rad etilgan" tab (R10). */
export const REJECTED_STADIUMS = [
  {
    id: sampleId('stadium', 1),
    name: 'Qoʻyliq Mini Futbol',
    address: 'Bektemir tumani, Qoʻyliq dahasi, 4-uy',
    ownerName: 'Sardor Toshmatov',
    ownerId: sampleId('user', 31),
    district: 'Bektemir',
    format: '5x5',
    surfaceType: 'artificial',
    pricePerHour: 120_000 * SOM,
    createdAt: daysAgo(9),
    reason: 'Rasmlar mos emas: maydon emas, sport zali suratlari yuklangan.',
    decidedAt: daysAgo(7),
  },
  {
    id: sampleId('stadium', 2),
    name: 'Olmazor Stars',
    address: 'Olmazor tumani, Talabalar shaharchasi, 17',
    ownerName: 'Akmal Yusupov',
    ownerId: sampleId('user', 32),
    district: 'Olmazor',
    format: '7x7',
    surfaceType: 'natural',
    pricePerHour: 180_000 * SOM,
    createdAt: daysAgo(15),
    reason: 'Manzil topilmadi: koʻrsatilgan joyda maydon yoʻq.',
    decidedAt: daysAgo(12),
  },
]

export const SAMPLE_NOTES = [
  'Qoʻngʻiroq qilindi, juma kuni shartnoma imzolanadi.',
  'Egasi STIR hujjatini Telegram orqali yuboradi.',
  'Rasmlar yangilanishi soʻraldi.',
]
