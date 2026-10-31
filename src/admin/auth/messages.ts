import { API_CODES, API_MESSAGES, isApiError } from '../../shared/api'
import type { LogoutReason } from './session'

/** Shown on the login page after being sent back there. */
export const LOGOUT_NOTICES: Record<LogoutReason, string> = {
  expired: 'Sessiya tugadi. Qaytadan kiring.',
  revoked: 'Sessiya tugadi, qayta kiring',
  blocked: 'Hisobingiz bloklangan',
  'roles-changed': 'Huquqlaringiz oʻzgardi. Qaytadan kiring.',
}

export const LOGIN_ERRORS = {
  invalidCredentials: 'Login yoki parol notoʻgʻri',
  locked: (minutes: number) => `Juda koʻp urinish. ${minutes} daqiqadan keyin qayta urinib koʻring`,
  tooManyAttempts: 'Juda koʻp urinish. Birozdan keyin qayta urinib koʻring',
  blocked: LOGOUT_NOTICES.blocked,
  server: 'Server bilan bogʻlanib boʻlmadi',
} as const

/** `data.minutesRemaining` of a 423/429, if the backend sent a usable one. */
function minutesRemaining(data: unknown): number | undefined {
  if (typeof data !== 'object' || data === null || !('minutesRemaining' in data)) return undefined
  const minutes = data.minutesRemaining
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
    ? minutes
    : undefined
}

/**
 * A failed `POST /api/auth/admin/login` → what the admin should read. Branches
 * on the backend's `code`, falling back to the HTTP status.
 */
export function loginErrorMessage(error: unknown): string {
  if (!isApiError(error)) return LOGIN_ERRORS.server

  if (error.code === API_CODES.accountLocked || error.status === 423) {
    const minutes = minutesRemaining(error.data)
    return minutes === undefined ? LOGIN_ERRORS.tooManyAttempts : LOGIN_ERRORS.locked(minutes)
  }
  if (error.code === API_CODES.tooManyAttempts || error.status === 429) {
    return LOGIN_ERRORS.tooManyAttempts
  }
  if (
    error.code === API_CODES.accountBlocked ||
    (error.status === 403 && error.message === API_MESSAGES.accountBlocked)
  ) {
    return LOGIN_ERRORS.blocked
  }
  // 400 only for a field the backend rejects (e.g. a login over 64 characters).
  if (error.code === API_CODES.invalidCredentials || error.status === 401 || error.status === 400) {
    return LOGIN_ERRORS.invalidCredentials
  }
  // Network failure, 5xx, or anything unexpected.
  return LOGIN_ERRORS.server
}
