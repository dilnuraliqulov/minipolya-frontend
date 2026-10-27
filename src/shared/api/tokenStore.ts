/**
 * Where the JWT lives. Each app picks the store that fits it:
 * - Mini App: in memory — it logs in again from Telegram `initData` on every launch.
 * - Admin panel: localStorage — the session survives reloads (24 h token expiry).
 */
export interface TokenStore {
  get(): string | null
  set(token: string): void
  clear(): void
}

export function createMemoryTokenStore(): TokenStore {
  let token: string | null = null
  return {
    get: () => token,
    set: (value) => {
      token = value
    },
    clear: () => {
      token = null
    },
  }
}

/**
 * Persists the token in localStorage, falling back to memory when storage is
 * unavailable (private mode, blocked site data).
 */
export function createLocalStorageTokenStore(key: string): TokenStore {
  const memory = createMemoryTokenStore()
  return {
    get: () => {
      try {
        return localStorage.getItem(key) ?? memory.get()
      } catch {
        return memory.get()
      }
    },
    set: (value) => {
      memory.set(value)
      try {
        localStorage.setItem(key, value)
      } catch {
        // Memory copy is enough for this session.
      }
    },
    clear: () => {
      memory.clear()
      try {
        localStorage.removeItem(key)
      } catch {
        // Nothing stored, nothing to clear.
      }
    },
  }
}
