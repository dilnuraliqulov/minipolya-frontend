import { API_MESSAGES, isApiError } from '../../shared/api'
import type { LogoutReason } from './session'

/** Shown on the login page after being sent back there. */
export const LOGOUT_NOTICES: Record<LogoutReason, string> = {
  expired: 'Sessiya tugadi. Qaytadan kiring.',
  revoked: 'Sessiya tugadi, qayta kiring',
  blocked: 'Hisobingiz bloklangan.',
  'roles-changed': 'Huquqlaringiz oʻzgardi. Qaytadan kiring.',
}

/** A failed login request → what the admin should read. Branches on HTTP status first. */
export function loginErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Kirishda xatolik yuz berdi.'
  if (error.isNetworkError) return 'Serverga ulanib boʻlmadi. Backend ishlayaptimi?'
  if (error.status === 401) return 'Telegram maʼlumotlari tasdiqlanmadi. Qaytadan urinib koʻring.'
  if (error.status === 403 && error.message === API_MESSAGES.accountBlocked) {
    return LOGOUT_NOTICES.blocked
  }
  if (error.status === 404) {
    return 'Telegram orqali kirish hali backendda yoʻq (docs/backend-requests.md, R2).'
  }
  return 'Kirishda xatolik yuz berdi.'
}
