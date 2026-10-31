import type { QueryClient } from '@tanstack/react-query'
import { isApiError, readJwtClaims, type TokenStore } from '../../shared/api'
import { isAccountBlocked, readBlockDetails, type BlockDetails } from '../api/blocked'
import { loginWithTelegram, type User } from '../api/users'
import { setLanguage } from '../i18n'
import { getInitData } from '../telegram'

/**
 * The Mini App's login: Telegram initData → POST /api/auth/telegram → JWT.
 *
 * - The JWT lives only in the given (in-memory) token store; every launch logs
 *   in again from initData.
 * - Any 401 → one silent re-login with initData, then the cached queries
 *   refetch. If the token from that re-login is refused too, or the re-login
 *   fails, the full error screen.
 * - 403 "Account is blocked" from anywhere → the blocked screen.
 */
export type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  /** No initData: a plain browser. In development a dev login is request R19. */
  | { status: 'no-telegram' }
  | { status: 'blocked'; details: BlockDetails }
  | { status: 'error'; reason: 'network' | 'server' | 'session' }

export interface Session {
  getState(): SessionState
  subscribe(listener: () => void): () => void
  start(): void
  retry(): void
  /** For the API client's `onUnauthorized`. */
  handleUnauthorized(): void
  /** For the API client's `onAccountBlocked`. */
  handleAccountBlocked(error?: unknown): void
  /** Re-login when /users/me reports role flags that disagree with the token. */
  checkRoles(user: User): void
}

export function createSession({
  tokenStore,
  queryClient,
}: {
  tokenStore: TokenStore
  queryClient: QueryClient
}): Session {
  let state: SessionState = { status: 'loading' }
  const listeners = new Set<() => void>()
  /** The token a re-login produced; a 401 with it means re-login did not help. */
  let reloginToken: string | null = null
  let reloginInFlight: Promise<void> | null = null

  const set = (next: SessionState) => {
    state = next
    listeners.forEach((listener) => listener())
  }

  const block = (error?: unknown) => {
    tokenStore.clear()
    queryClient.clear()
    set({ status: 'blocked', details: readBlockDetails(error) })
  }

  const fail = (error: unknown) => {
    if (isAccountBlocked(error)) return block(error)
    tokenStore.clear()
    const reason = isApiError(error) && error.isNetworkError ? 'network' : 'server'
    set({ status: 'error', reason: isApiError(error) && error.status === 401 ? 'session' : reason })
  }

  /** Posts initData; resolves with the token on success, throws otherwise. */
  const authenticate = async (): Promise<string> => {
    const initData = getInitData()
    if (!initData) throw new Error('no-telegram')
    const { token, user } = await loginWithTelegram(initData)
    tokenStore.set(token)
    await setLanguage(user.language)
    set({ status: 'ready', user })
    return token
  }

  const login = () => {
    if (!getInitData()) {
      set({ status: 'no-telegram' })
      return
    }
    set({ status: 'loading' })
    authenticate().catch(fail)
  }

  const relogin = () => {
    if (reloginInFlight) return
    reloginInFlight = authenticate()
      .then((token) => {
        reloginToken = token
        void queryClient.invalidateQueries()
      })
      .catch(fail)
      .finally(() => {
        reloginInFlight = null
      })
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: login,
    retry() {
      reloginToken = null
      login()
    },
    handleUnauthorized() {
      if (state.status !== 'ready' || reloginInFlight) return
      const current = tokenStore.get()
      if (current !== null && current === reloginToken) {
        tokenStore.clear()
        set({ status: 'error', reason: 'session' })
        return
      }
      relogin()
    },
    handleAccountBlocked: block,
    checkRoles(user) {
      const token = tokenStore.get()
      const claims = token ? readJwtClaims(token) : null
      if (!claims) return
      if (Boolean(claims.isOwner) !== user.isOwner || Boolean(claims.isAdmin) !== user.isAdmin) {
        relogin()
      }
    },
  }
}
