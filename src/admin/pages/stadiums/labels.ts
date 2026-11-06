import type { Amenities } from '../../api/stadiums'
import type { ContractStatus, LegalType } from '../../api/users'
import type { BadgeTone } from '../../components/StatusBadge'

export const CONTRACT_LABELS: Record<ContractStatus, { label: string; tone: BadgeTone }> = {
  none: { label: 'Yoʻq', tone: 'neutral' },
  pending: { label: 'Kutilmoqda', tone: 'warning' },
  signed: { label: 'Imzolangan', tone: 'success' },
}

export const LEGAL_TYPE_LABELS: Record<LegalType, string> = {
  yatt: 'YaTT',
  mchj: 'MChJ',
  self_employed: 'Oʻzini oʻzi band qilgan',
}

/** Every amenity of the API, in the Mini App's order (wifi and cafe last: no longer offered, D9). */
export const AMENITY_LABELS: Record<keyof Amenities, string> = {
  parking: 'Avtoturargoh',
  lockerRoom: 'Kiyinish xonasi',
  showers: 'Dush',
  toilet: 'Hojatxona',
  lighting: 'Yoritish (kechki oʻyin)',
  covered: 'Yopiq / usti yopiq',
  equipmentRental: 'Toʻp ijarasi',
  bibs: 'Maykalar (manishka)',
  drinkingWater: 'Ichimlik suvi',
  tribune: 'Tomoshabin oʻrindiqlari',
  wifi: 'Wi-Fi',
  cafe: 'Kafe',
}

export { WEEKDAYS_SHORT as DAYS_SHORT } from '../../format'

export const REJECT_REASONS = ['Rasmlar mos emas', 'Notoʻgʻri maʼlumot', 'Manzil topilmadi']
export const BLOCK_REASONS = ['Koʻp shikoyatlar', 'Notoʻgʻri maʼlumot', 'Egasining soʻrovi']
