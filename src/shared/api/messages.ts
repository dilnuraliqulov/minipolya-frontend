/**
 * Machine-readable `code` values the client branches on. The backend sends a
 * `code` only on some errors so far (the admin auth ones); prefer it over
 * matching `message` wherever one exists.
 */
export const API_CODES = {
  /** 401 on any request whose token predates the user's last password change. */
  tokenRevoked: 'TOKEN_REVOKED',
  /** 401 from the admin login: wrong username or password (deliberately the same). */
  invalidCredentials: 'INVALID_CREDENTIALS',
  /** 423 from the admin login: too many wrong passwords; `data.minutesRemaining`. */
  accountLocked: 'ACCOUNT_LOCKED',
  /** 429 from the admin login: too many attempts from this IP; `data.minutesRemaining`. */
  tooManyAttempts: 'TOO_MANY_ATTEMPTS',
  /** 403 from the admin login: right password, but the account is blocked. */
  accountBlocked: 'ACCOUNT_BLOCKED',
} as const

/**
 * Exact backend `message` strings the client branches on.
 *
 * Most errors have no `code` (api-reference Q1), so a few flows must compare
 * prose. Every such string lives here and nowhere else, so a reworded backend
 * message breaks in exactly one obvious place.
 */
export const API_MESSAGES = {
  /** 403 on any endpoint, at any time, when an admin has blocked the user. */
  accountBlocked: 'Account is blocked',
} as const
