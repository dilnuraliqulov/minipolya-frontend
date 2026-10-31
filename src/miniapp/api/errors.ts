import { API_CODES, isApiError } from '../../shared/api'
import i18n from '../i18n'
import { isAccountBlocked } from './blocked'

/**
 * THE mapping from a failed request to the text a player sees. Backend
 * messages are English prose and are never shown; branch on `code` first,
 * then the HTTP status, and only where a flow must tell two same-status
 * failures apart, on an exact string from shared/api/messages.ts — added
 * here, nowhere else.
 */
export type ErrorMessageKey =
  | 'errors.network'
  | 'errors.server'
  | 'errors.session'
  | 'errors.blocked'
  | 'errors.forbidden'
  | 'errors.notFound'
  | 'errors.invalid'
  | 'errors.conflict'
  | 'errors.tooMany'
  | 'errors.unknown'

export function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!isApiError(error)) return 'errors.unknown'
  if (isAccountBlocked(error)) return 'errors.blocked'
  if (error.code === API_CODES.tokenRevoked) return 'errors.session'
  if (error.code === API_CODES.tooManyAttempts) return 'errors.tooMany'
  if (error.isNetworkError) return 'errors.network'
  if (error.status >= 500) return 'errors.server'
  switch (error.status) {
    case 400:
      return 'errors.invalid'
    case 401:
      return 'errors.session'
    case 403:
      return 'errors.forbidden'
    case 404:
      return 'errors.notFound'
    case 409:
      return 'errors.conflict'
    case 429:
      return 'errors.tooMany'
    default:
      return 'errors.unknown'
  }
}

/** The translated message for an error, in the current language. */
export function errorMessage(error: unknown): string {
  return i18n.t(errorMessageKey(error))
}
