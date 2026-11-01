/**
 * Machine-readable `code` values the client branches on. The backend sends a
 * `code` only on some errors so far (admin auth, blocked, phone taken); prefer it over
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
  /** 403 on any request, the Telegram login and the admin login: the account is blocked; `data: { reason?, blockedAt? }`. */
  accountBlocked: 'ACCOUNT_BLOCKED',
  /** 409 from `PATCH /api/users/me`: the phone belongs to another account. */
  phoneTaken: 'PHONE_TAKEN',
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
  /** 400 from `PUT /api/admin/stadiums/{id}/status` approving a stadium whose owner has no signed ATMOS contract. */
  contractNotSigned: "The owner's ATMOS contract is not signed",
  /** 400 from `POST /api/reviews` when the caller already reviewed this stadium. */
  alreadyReviewed: 'You have already reviewed this stadium',
  /** 400 from `POST /api/reviews` when the caller has no played booking at the stadium. */
  reviewNotPlayed: 'You can only review a stadium you have played at',
  /** 400 from `POST /api/games/{id}/join` past the 3-hour point — the one Uzbek message (api-reference Q7). */
  joinTooLate: "O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi",
  /** 400 from `POST /api/games/{id}/join` when the joining team's card is declined. */
  joinDeclined: 'Card payment was declined; the game is still looking for an opponent',
  /** 400 from `POST /api/games` (team game) when the hold is declined. */
  createGameDeclined: 'Card payment was declined; the game was not created',
  /** 400 from `POST /api/games/{id}/pay-remainder` when the card is declined. */
  gameRemainderDeclined: 'Card payment was declined; the remainder is still owed',
} as const
