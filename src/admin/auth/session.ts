import { useSyncExternalStore } from 'react'
import {
  API_CODES,
  type ApiError,
  getTokenStore,
  isApiError,
  isJwtExpired,
  readJwtClaims,
} from '../../shared/api'
import { getMe } from '../api/auth'
import type { User } from '../api/types'
import { queryClient } from '../queryClient'

/**
 * The admin session. The JWT lives in the token store the admin entry
 * configures (localStorage), so it survives reloads until it expires (24 h).
 *
 * The backend authorises by the token's claims, while /api/users/me reads the
 * live row (api-reference Q11). If they disagree — e.g. someone was made admin
 * after logging in — the token is useless for /api/admin/**, so we log out.
 */

/** Why the user was sent back to the login page; shown there once. */
export type LogoutReason = 'expired' | 'revoked' | 'blocked' | 'roles-changed'

export type Session =
  | { status: 'loading' }
  /** A token is stored but the backend could not be reached to check it. */
  | { status: 'unavailable' }
  | { status: 'anonymous'; reason?: LogoutReason }
  | { status: 'authenticated'; user: User }

let session: Session = { status: 'loading' }
const listeners = new Set<() => void>()

function set(next: Session): void {
  session = next
  listeners.forEach((listener) => listener())
}

export function getSession(): Session {
  return session
}

export function useSession(): Session {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, getSession)
}

/** Drops the token and every cached query. There is no logout endpoint. */
export function logout(reason?: LogoutReason): void {
  // A failed login attempt also answers 401; that is not an "expired session".
  const hadSession = session.status === 'authenticated' || session.status === 'loading'
  getTokenStore().clear()
  queryClient.clear()
  set({ status: 'anonymous', reason: hadSession ? reason : undefined })
}

/**
 * Which notice a 401 earns: a revoked token or a plain expired one. Resetting an
 * admin's password in the database revokes every token issued before it.
 */
export function unauthorizedReason(error: ApiError): LogoutReason {
  return error.code === API_CODES.tokenRevoked ? 'revoked' : 'expired'
}

function rolesMatch(token: string, user: User): boolean {
  const claims = readJwtClaims(token)
  return claims?.isAdmin === undefined || claims.isAdmin === user.isAdmin
}

/** After a successful login request. */
export function startSession(token: string, user: User): void {
  getTokenStore().set(token)
  set({ status: 'authenticated', user })
}

/** On startup: resume from a stored token, if it is still good. */
export async function restoreSession(): Promise<void> {
  const token = getTokenStore().get()
  const claims = token ? readJwtClaims(token) : null
  if (!token || !claims || isJwtExpired(claims)) {
    getTokenStore().clear()
    set({ status: 'anonymous' })
    return
  }
  set({ status: 'loading' })
  try {
    const user = await getMe()
    if (!rolesMatch(token, user)) {
      logout('roles-changed')
      return
    }
    set({ status: 'authenticated', user })
  } catch (error) {
    if (isApiError(error) && error.isClientError) {
      // 401 and "Account is blocked" already logged out via the API client hooks.
      if (session.status === 'loading') logout()
      return
    }
    // Backend down or 5xx: keep the token and offer a retry.
    set({ status: 'unavailable' })
  }
}

/** For tests. */
export function resetSessionForTests(): void {
  session = { status: 'loading' }
  listeners.clear()
}
