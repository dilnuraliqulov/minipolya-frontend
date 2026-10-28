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

export const AMENITY_LABELS: Record<keyof Amenities, string> = {
  lockerRoom: 'Kiyinish xonasi',
  showers: 'Dush',
  parking: 'Avtoturargoh',
  lighting: 'Yoritish',
  tribune: 'Tribuna',
  wifi: 'Wi-Fi',
  cafe: 'Kafe',
  equipmentRental: 'Jihoz ijarasi',
}

/** 0 = Monday, as the backend counts. */
export const DAYS_SHORT = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya']

export const REJECT_REASONS = ['Rasmlar mos emas', 'Notoʻgʻri maʼlumot', 'Manzil topilmadi']
export const BLOCK_REASONS = ['Koʻp shikoyatlar', 'Notoʻgʻri maʼlumot', 'Egasining soʻrovi']
