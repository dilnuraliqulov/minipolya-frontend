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
  // Adding a card (POST /api/cards, /resend, /confirm): 400s from CardBindingException.
  /** Not an Uzcard / Humo number. */
  cardNotSupported: 'CARD_NOT_SUPPORTED',
  /** The number and expiry do not match a card. */
  cardExpiryInvalid: 'CARD_EXPIRY_INVALID',
  /** The card has expired. */
  cardExpired: 'CARD_EXPIRED',
  /** Wrong SMS code; the binding stays open. */
  smsCodeWrong: 'SMS_CODE_WRONG',
  /** The SMS code is no longer valid: resend it. */
  smsCodeExpired: 'SMS_CODE_EXPIRED',
  /** A new code was asked for before the 60-second cooldown ended. */
  smsResendTooEarly: 'SMS_RESEND_TOO_EARLY',
  /** The provider cannot resend: the card has to be entered again. */
  smsResendUnavailable: 'SMS_RESEND_UNAVAILABLE',
  /** Unknown or finished binding: start again. */
  bindingNotFound: 'BINDING_NOT_FOUND',
  /** Any other refusal of the card. */
  cardBindingFailed: 'CARD_BINDING_FAILED',
  // R44: a refused card payment. The `code` of the 400 declines of the team-game calls
  // (POST /api/games, /join, /pay-remainder), and the `declineReason` of a booking or a
  // payment row. CARD_EXPIRED (above) is the third reason.
  /** Not enough money on the card. */
  insufficientFunds: 'INSUFFICIENT_FUNDS',
  /** Any other refusal. */
  cardDeclined: 'CARD_DECLINED',
  // R28: POST /api/bookings/{id}/pay, 409s.
  /** The booking is no longer pending (confirmed, cancelled, or expired by the job). */
  bookingNotPending: 'BOOKING_NOT_PENDING',
  /** Its hold has run out: the slot has to be booked again. */
  bookingExpired: 'BOOKING_EXPIRED',
  /** A payment of it is processing or has arrived: do not charge again. */
  paymentInProgress: 'PAYMENT_IN_PROGRESS',
  /**
   * HTTP 202 with `success: false` from `POST /api/games/{id}/join`: the joining team
   * paid, the other team's capture has no clear answer yet. The backend finishes the
   * join (or undoes it and refunds) and notifies the player. Never pay again.
   */
  paymentPending: 'PAYMENT_PENDING',
} as const

/**
 * Exact backend `message` strings the client branches on.
 *
 * Most errors have no `code` (api-reference Q1), so a few flows must compare
 * prose. Every such string lives here and nowhere else, so a reworded backend
 * message breaks in exactly one obvious place.
 */
export const API_MESSAGES = {
  /**
   * 502 from any card or payment call when the payment provider cannot be reached:
   * nothing was charged or bound, the player may try again. Not a decline.
   */
  providerUnavailable: "To'lov tizimi vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring",
  /** 403 on any endpoint, at any time, when an admin has blocked the user. */
  accountBlocked: 'Account is blocked',
  /** 400 from `PUT /api/admin/users/{id}` when an admin tries to block their own account. */
  cannotBlockSelf: 'You cannot block yourself',
  /** 400 from `PUT /api/admin/users/{id}` (bean validation): `reason` over 500 characters. */
  userReasonTooLong: 'reason: reason must be at most 500 characters',
  /** 400 from `POST /api/admin/payments/{id}/retry-refund` when the refund is no longer `failed`. */
  refundNotFailedRetry: 'Only a failed refund can be retried',
  /** 400 from `POST /api/admin/payments/{id}/mark-refunded` when the refund is no longer `failed`. */
  refundNotFailedMark: 'Only a failed refund can be marked as refunded',
  /** 400 from `PUT /api/admin/stadiums/{id}/status` approving a stadium whose owner has no signed ATMOS contract. */
  contractNotSigned: "The owner's ATMOS contract is not signed",
  /** 400 from `POST /api/owner/stadiums/{id}/photos`: not a JPEG, PNG or WebP (by its bytes). */
  unsupportedImage: 'Unsupported image type',
  /** 400 from `POST /api/owner/stadiums/{id}/photos`: the stadium already has 10 photos. */
  tooManyPhotos: 'A stadium can have at most 10 photos',
  /** 400 from `POST /api/owner/stadiums/{id}/photos`: over 40 megapixels (decompression-bomb guard). */
  imageTooLarge: 'Image is too large',
  // Stadium create / update (`StadiumRules`, design D1 and D10–D15). Create checks in this order.
  /** 400: `name` trimmed outside 3–150 characters. */
  stadiumNameLength: 'name must be between 3 and 150 characters',
  /** 400: `address` trimmed outside 5–300 characters. */
  stadiumAddressLength: 'address must be between 5 and 300 characters',
  /** 400 on create without a district. */
  stadiumDistrictRequired: 'district is required',
  /** 400: not one of the twelve districts. */
  invalidDistrict: 'Invalid district',
  /** 400: the stadium's phone is not `+998XXXXXXXXX`. */
  stadiumPhoneFormat: 'phone must be in the format +998XXXXXXXXX',
  /** 400: `description` over 500 characters. */
  stadiumDescriptionLength: 'description must be at most 500 characters',
  /** 400: `landmark` over 150 characters. */
  stadiumLandmarkLength: 'landmark must be at most 150 characters',
  /** 400 on create without coordinates. */
  stadiumLocationRequired: 'latitude and longitude are required',
  /** 400 on update with only one coordinate. */
  stadiumLocationPair: 'Send both latitude and longitude',
  /** 400: outside lat 37.1–45.6, lon 55.9–73.2. */
  stadiumOutsideUzbekistan: 'Location must be inside Uzbekistan',
  /** 400: `pricePerHour` outside 1 000 000–500 000 000 tiyin. */
  stadiumPriceRange: "pricePerHour must be between 10 000 and 5 000 000 so'm",
  /** 400: an opening or closing time off the hour (D15). */
  stadiumHoursOnTheHour: 'openTime and closeTime must be on the hour',
  /** 400: closing not after opening; closing after midnight is not supported (D14). */
  stadiumHoursOrder: 'closeTime must be after openTime; closing after midnight is not supported',
  /** 400 from `PUT /api/admin/stadiums/{id}/booking-terms`: a minimum above the owner's hourly price. */
  minimumAbovePrice: 'minBookingAmount must not be more than pricePerHour',
  /** 400 from `PUT /api/admin/stadiums/{id}/booking-terms`: hours outside 0–168. */
  cancellationHoursRange: 'cancellationHours must be between 0 and 168',
  /** 400 from `PUT /api/admin/stadiums/{id}/status` approving a stadium with fewer than 3 photos. */
  tooFewPhotos: 'A stadium needs at least 3 photos to be approved',
  /** 400 from `POST /api/reviews` when the caller already reviewed this stadium. */
  alreadyReviewed: 'You have already reviewed this stadium',
  /** 400 from `POST /api/reviews` when the caller has no played booking at the stadium. */
  reviewNotPlayed: 'You can only review a stadium you have played at',
  /**
   * T2, prefixes (the backend appends the fee in force, e.g. " (25 000 so'm)"):
   * 400 from `PUT /api/admin/stadiums/{id}/booking-terms` and from `PUT /api/admin/settings`
   * when a minimum is not above the team-game fee, and from the settings when a new fee
   * would reach the default minimum. Match with `startsWith`.
   */
  minimumNotAboveTeamFee: 'minBookingAmount must be more than the team game platform fee',
  defaultMinimumNotAboveFee: 'defaultMinBookingAmount must be more than the team game platform fee',
  teamFeeNotBelowDefaultMinimum:
    'teamGamePlatformFee must be less than the default minimum booking amount',
  /** 400 from `PUT /api/admin/stadiums/{id}/booking-terms` when `minBookingAmount` is under the 50 000-tiyin floor. */
  minimumTooLow: "minBookingAmount must be at least 50000 tiyin (500 so'm)",
  /** 400 from `POST /api/games/{id}/join` past the 3-hour point — the one Uzbek message (api-reference Q7). */
  joinTooLate: "O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi",
  /**
   * 403 from `POST /api/games/{id}/join` on a team game from anyone but the joining
   * team's leader (an invited member, or no `teamId`): only the leader joins, and pays.
   */
  onlyLeadersJoin:
    "Only the joining team's leader can join a team game, with their team and a card",
  /** 400 from `POST /api/games/{id}/join` when another team has joined (or is joining) first. */
  joinHasOpponent: 'This game already has an opponent',
  /** 400 from `POST /api/games/{id}/join` when the joining team's card is declined. */
  joinDeclined: 'Card payment was declined; the game is still looking for an opponent',
  /** 400 from `POST /api/games` (team game) when the hold is declined. */
  createGameDeclined: 'Card payment was declined; the game was not created',
  /** 400 from `POST /api/games/{id}/pay-remainder` when the card is declined. */
  gameRemainderDeclined: 'Card payment was declined; the remainder is still owed',
  /** 400s from `POST /api/games/{id}/join` when a payment step could not be confirmed (the game may be cancelled and refunded). */
  joinPaymentUnconfirmed:
    'The card payment could not be confirmed; the game is still looking for an opponent. If the money was taken it will be returned in full',
  joinOtherTeamConfirming:
    "The other team's payment is still being confirmed; try again in a few minutes",
  joinOtherTeamFailed:
    "The other team's payment could not be taken, so the game is cancelled; your payment is being returned in full",
  /**
   * 400 from `POST /api/games/{id}/cash` (and remainder payments) when the remainder is already
   * settled; 409 from the owner's booking marks (`POST /api/owner/bookings/{id}/cash`,
   * `/not-paid`) when nothing is left (design E7).
   */
  alreadyPaid: 'Already paid',
  // The owner's remainder marks (design E5–E7): POST /api/owner/bookings/{id}/cash, /not-paid,
  // DELETE /api/owner/bookings/{id}/remainder-mark.
  /** 403: the booking is not at the caller's stadium. */
  notStadiumOwner: 'You do not own this stadium',
  /** 409 (400 before E7): a cancelled, expired, pending or game booking has no part payment to mark. */
  noPartPayment: 'This booking has no part payment to complete',
  /** 409: a card payment of the booking is still being confirmed. */
  bookingPaymentInFlight: 'A payment for this booking is being processed',
  /** 409 from the owner's and the admin's undo when the booking has no mark (any more). */
  noRemainderMark: 'This booking has no remainder mark',
  /** 409 from the owner's undo after the end of the day the mark was set: admin only (E6). */
  markAdminOnly: 'Only an admin can change this mark',
  // The owner's marks on one team of a team game (T10): POST /api/games/{id}/cash, /not-paid,
  // DELETE /api/games/{id}/remainder-mark (and the admin's undo).
  /** 409: the game is cancelled. */
  gameCancelled: 'This game is cancelled',
  /** 409: the game is still waiting for an opponent (only holds, no slot). */
  gameNotConfirmed: 'This game is not confirmed yet',
  /** 409: a card payment of the team's remainder is still being confirmed. */
  teamPaymentInFlight: 'A payment for this team is being processed',
  /** 409 from the owner's and the admin's undo when the team has no mark (any more). */
  teamNoRemainderMark: 'This team has no remainder mark',
  /** 400 from `POST /api/games/{id}/pay-remainder` while the team's charge is still processing. */
  gameRemainderConfirming:
    'The card payment is still being confirmed; the remainder will be marked paid once it is',
} as const
