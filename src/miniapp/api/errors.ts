import { API_CODES, API_MESSAGES, isApiError } from '../../shared/api'
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
  | 'errors.phoneTaken'
  | 'errors.tooMany'
  | 'errors.alreadyReviewed'
  | 'errors.reviewNotPlayed'
  | 'errors.cardDeclined'
  | 'errors.tooLate'
  | 'errors.paymentConfirming'
  | 'errors.paymentUnclear'
  | 'errors.unknown'

export function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!isApiError(error)) return 'errors.unknown'
  if (isAccountBlocked(error)) return 'errors.blocked'
  if (error.code === API_CODES.tokenRevoked) return 'errors.session'
  if (error.code === API_CODES.tooManyAttempts) return 'errors.tooMany'
  if (error.code === API_CODES.phoneTaken) return 'errors.phoneTaken'
  if (error.isNetworkError) return 'errors.network'
  if (error.status >= 500) return 'errors.server'
  switch (error.status) {
    case 400:
      // POST /api/reviews: two 400s the review form tells apart.
      if (error.message === API_MESSAGES.alreadyReviewed) return 'errors.alreadyReviewed'
      if (error.message === API_MESSAGES.reviewNotPlayed) return 'errors.reviewNotPlayed'
      // Team games: a declined card and the 3-hour cut-off are 400s too.
      if (
        error.message === API_MESSAGES.joinDeclined ||
        error.message === API_MESSAGES.createGameDeclined ||
        error.message === API_MESSAGES.gameRemainderDeclined
      )
        return 'errors.cardDeclined'
      if (error.message === API_MESSAGES.joinTooLate) return 'errors.tooLate'
      if (error.message === API_MESSAGES.gameRemainderConfirming) return 'errors.paymentConfirming'
      if (
        error.message === API_MESSAGES.joinPaymentUnconfirmed ||
        error.message === API_MESSAGES.joinOtherTeamConfirming ||
        error.message === API_MESSAGES.joinOtherTeamFailed
      )
        return 'errors.paymentUnclear'
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

/**
 * A failed money request whose outcome the player cannot know from the answer:
 * no answer, a server error, or a payment step still being settled. Never
 * offer a retry for these — the charge may have gone through.
 */
export function isUnclearPaymentError(error: unknown): boolean {
  const key = errorMessageKey(error)
  return (
    key === 'errors.network' ||
    key === 'errors.server' ||
    key === 'errors.paymentConfirming' ||
    key === 'errors.paymentUnclear'
  )
}
