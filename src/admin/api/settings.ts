import { api } from '../../shared/api'

/** `PlatformSettingsResponse` — §10.9. Every field present. */
export interface PlatformSettings {
  id: string
  /** Whole percent, 0–50. */
  bookingCommissionPercent: number
  /** Tiyin, per team. */
  teamGamePlatformFee: number
  /** Tiyin, per player. */
  casualGameServiceFee: number
  /** UTC. */
  updatedAt: string
}

export type SettingsField =
  'bookingCommissionPercent' | 'teamGamePlatformFee' | 'casualGameServiceFee'

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
