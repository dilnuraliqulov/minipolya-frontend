import type { BadgeTone } from './components/StatusBadge'

/**
 * Uzbek labels (and badge tones) for the backend's enum values
 * (api-reference §1.9). Unknown values fall back to the raw value.
 */

export interface StatusLabel {
  label: string
  tone: BadgeTone
}

type StatusMap = Record<string, StatusLabel>

export const BOOKING_STATUSES: StatusMap = {
  pending: { label: 'Kutilmoqda', tone: 'warning' },
  confirmed: { label: 'Tasdiqlangan', tone: 'accent' },
  completed: { label: 'Yakunlangan', tone: 'success' },
  expired: { label: 'Muddati oʻtgan', tone: 'neutral' },
  cancelled_by_user: { label: 'Mijoz bekor qildi', tone: 'danger' },
  cancelled_by_owner: { label: 'Ega bekor qildi', tone: 'danger' },
  cancelled_opponent_left: { label: 'Raqib chiqib ketdi', tone: 'danger' },
}

export const BOOKING_PAYMENT_STATUSES: StatusMap = {
  unpaid: { label: 'Toʻlanmagan', tone: 'danger' },
  partially_paid: { label: 'Qisman toʻlangan', tone: 'warning' },
  paid: { label: 'Toʻlangan', tone: 'success' },
}

export const GAME_STATUSES: StatusMap = {
  open: { label: 'Kutilmoqda', tone: 'warning' },
  confirmed: { label: 'Rejalashtirilgan', tone: 'accent' },
  completed: { label: 'Yakunlangan', tone: 'success' },
  cancelled_slot_taken: { label: 'Bekor: vaqt band boʻldi', tone: 'danger' },
  cancelled_by_creator: { label: 'Bekor qilingan', tone: 'danger' },
  cancelled_not_filled: { label: 'Bekor: toʻlmadi', tone: 'danger' },
}

export const STADIUM_STATUSES: StatusMap = {
  pending: { label: 'Kutilmoqda', tone: 'warning' },
  approved: { label: 'Tasdiqlangan', tone: 'success' },
  /** Not a backend value yet — request R10. */
  rejected: { label: 'Rad etilgan', tone: 'danger' },
  blocked: { label: 'Bloklangan', tone: 'danger' },
}

export const PAYMENT_STATUSES: StatusMap = {
  pending: { label: 'Kutilmoqda', tone: 'warning' },
  held: { label: 'Ushlab turilgan', tone: 'warning' },
  captured: { label: 'Yechildi', tone: 'success' },
  paid: { label: 'Toʻlangan', tone: 'success' },
  completed: { label: 'Toʻlangan', tone: 'success' },
  released: { label: 'Boʻshatildi', tone: 'neutral' },
  refunded: { label: 'Qaytarildi', tone: 'accent' },
  failed: { label: 'Muvaffaqiyatsiz', tone: 'danger' },
}

export const PAYMENT_TYPES: Record<string, string> = {
  booking: 'Bron',
  remainder: 'Qoldiq',
  team_game: 'Jamoa oʻyini',
  game_share: 'Oʻyin ulushi',
  service_fee: 'Xizmat haqi',
  refund: 'Qaytarish',
}

export const PAYMENT_METHODS: Record<string, string> = { card: 'Karta', cash: 'Naqd' }

export const PAYMENT_PROVIDERS: Record<string, string> = {
  atmos: 'ATMOS',
  payme: 'Payme',
  click: 'Click',
  cash: 'Naqd',
}

export const GAME_TYPES: Record<string, string> = {
  casual: 'Doʻstlar bilan',
  open: 'Ochiq oʻyin',
  team_vs_team: 'Jamoa vs jamoa',
}

export const SURFACE_TYPES: Record<string, string> = {
  natural: 'Tabiiy maysa',
  artificial: 'Sunʼiy maysa',
  hybrid: 'Gibrid',
}

export const STADIUM_FORMATS = ['5x5', '7x7', '9x9', '11x11']

export const ROLE_LABELS = { player: 'Oʻyinchi', owner: 'Maydon egasi', admin: 'Admin' }

export function statusOf(map: StatusMap, value: string): StatusLabel {
  return map[value] ?? { label: value, tone: 'neutral' }
}

/** A game's status; a team game that is `open` is waiting for an opponent. */
export function gameStatus(type: string, status: string): StatusLabel {
  if (status === 'open' && type === 'team_vs_team')
    return { label: 'Raqib kutilmoqda', tone: 'warning' }
  return statusOf(GAME_STATUSES, status)
}
