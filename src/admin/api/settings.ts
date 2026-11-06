import { api } from '../../shared/api'

/**
 * `PlatformSettingsResponse` — §10.9. Every field present. There is no booking
 * commission: the platform takes nothing from ordinary bookings (old audit
 * entries can still mention `bookingCommissionPercent`).
 */
export interface PlatformSettings {
  id: string
  /** Tiyin, per team. */
  teamGamePlatformFee: number
  /** Tiyin, per player. */
  casualGameServiceFee: number
  /** What ATMOS takes of a card payment, in basis points: 150 = 1.5%. 0–1000. */
  cardFeeBps: number
  /** Player prices are rounded up to a multiple of it. Tiyin, 1–1 000 000. */
  paymentRoundingStep: number
  /**
   * T1: tiyin, the owner's terms — the minimum booking amount of every stadium
   * without its own. Must be more than `teamGamePlatformFee`.
   */
  defaultMinBookingAmount: number
  /** UTC. */
  updatedAt: string
}

export type SettingsField =
  | 'teamGamePlatformFee'
  | 'casualGameServiceFee'
  | 'cardFeeBps'
  | 'paymentRoundingStep'
  | 'defaultMinBookingAmount'

/** Every field optional; only the ones sent are changed. */
export type SettingsUpdate = Partial<Pick<PlatformSettings, SettingsField>>

export function getSettings(): Promise<PlatformSettings> {
  return api.get<PlatformSettings>('/api/admin/settings')
}

export function updateSettings(update: SettingsUpdate): Promise<PlatformSettings> {
  return api.put<PlatformSettings>('/api/admin/settings', update)
}

/** The audit actions a settings change is logged under (the second on old rows). */
export const SETTINGS_ACTIONS = ['SETTINGS_CHANGED', 'PLATFORM_SETTINGS_UPDATED']
