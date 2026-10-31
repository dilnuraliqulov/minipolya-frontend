import { API_CODES, API_MESSAGES, isApiError } from '../../shared/api'
import { isAvailable } from './missing'

/** R21: the reason and date on the blocked 403. */
export const BLOCK_DETAILS = '403 Account is blocked data.reason, data.blockedAt'

export interface BlockDetails {
  reason?: string
  /** UTC */
  blockedAt?: string
}

/** 403 "Account is blocked" — from the login or from any endpoint. */
export function isAccountBlocked(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.status === 403 &&
    (error.code === API_CODES.accountBlocked || error.message === API_MESSAGES.accountBlocked)
  )
}

/** The reason and date, once R21 ships; empty until then. */
export function readBlockDetails(error: unknown): BlockDetails {
  if (!isAvailable(BLOCK_DETAILS) || !isApiError(error)) return {}
  const data = error.data as Partial<Record<keyof BlockDetails, unknown>> | undefined
  return {
    reason: typeof data?.reason === 'string' ? data.reason : undefined,
    blockedAt: typeof data?.blockedAt === 'string' ? data.blockedAt : undefined,
  }
}
