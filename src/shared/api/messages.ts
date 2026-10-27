/**
 * Exact backend `message` strings the client branches on.
 *
 * The backend has no error codes (api-reference Q1), so a few flows must
 * compare prose. Every such string lives here and nowhere else, so a reworded
 * backend message breaks in exactly one obvious place.
 */
export const API_MESSAGES = {
  /** 403 on any endpoint, at any time, when an admin has blocked the user. */
  accountBlocked: 'Account is blocked',
} as const
