import { API_CODES, API_MESSAGES, isApiError } from '../../shared/api'

/** `data` on the blocked 403 (`code: ACCOUNT_BLOCKED`); either may be absent. */
export interface BlockDetails {
  /** As the admin typed it. */
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

/** Why and when, from the blocked 403's `data`; empty when the backend sent none. */
export function readBlockDetails(error: unknown): BlockDetails {
  if (!isApiError(error)) return {}
  const data = error.data as Partial<Record<keyof BlockDetails, unknown>> | undefined
  return {
    reason: typeof data?.reason === 'string' ? data.reason : undefined,
    blockedAt: typeof data?.blockedAt === 'string' ? data.blockedAt : undefined,
  }
}
