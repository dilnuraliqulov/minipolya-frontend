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
  | 'errors.imageType'
  | 'errors.imageTooLarge'
  | 'errors.nameLength'
  | 'errors.addressLength'
  | 'errors.districtRequired'
  | 'errors.phoneFormat'
  | 'errors.descriptionLength'
  | 'errors.landmarkLength'
  | 'errors.locationRequired'
  | 'errors.outsideUzbekistan'
  | 'errors.priceRange'
  | 'errors.onTheHour'
  | 'errors.hoursOrder'
  | 'errors.tooManyPhotos'
  | 'errors.fileTooLarge'
  | 'errors.cardDeclined'
  | 'errors.insufficientFunds'
  | 'errors.providerUnavailable'
  | 'errors.cardNotSupported'
  | 'errors.cardExpiryInvalid'
  | 'errors.cardExpired'
  | 'errors.smsCodeWrong'
  | 'errors.smsCodeExpired'
  | 'errors.smsResendTooEarly'
  | 'errors.smsResendUnavailable'
  | 'errors.bindingNotFound'
  | 'errors.cardBindingFailed'
  | 'errors.tooLate'
  | 'errors.paymentConfirming'
  | 'errors.alreadyPaid'
  | 'errors.paymentUnclear'
  | 'errors.paymentPending'
  | 'errors.hasOpponent'
  | 'errors.onlyLeaderJoins'
  | 'errors.notYourStadium'
  | 'errors.nothingToMark'
  | 'errors.markAdminOnly'
  | 'errors.cardPaymentInFlight'
  | 'errors.noMark'
  | 'errors.unknown'

/** Card-binding codes (POST /api/cards, /resend, /confirm) → their text. */
const CARD_CODES: Record<string, ErrorMessageKey> = {
  [API_CODES.cardNotSupported]: 'errors.cardNotSupported',
  [API_CODES.cardExpiryInvalid]: 'errors.cardExpiryInvalid',
  [API_CODES.cardExpired]: 'errors.cardExpired',
  [API_CODES.smsCodeWrong]: 'errors.smsCodeWrong',
  [API_CODES.smsCodeExpired]: 'errors.smsCodeExpired',
  [API_CODES.smsResendTooEarly]: 'errors.smsResendTooEarly',
  [API_CODES.smsResendUnavailable]: 'errors.smsResendUnavailable',
  [API_CODES.bindingNotFound]: 'errors.bindingNotFound',
  [API_CODES.cardBindingFailed]: 'errors.cardBindingFailed',
  // R44: a refused card payment (team-game 400s). CARD_EXPIRED above reads the same.
  [API_CODES.cardDeclined]: 'errors.cardDeclined',
  [API_CODES.insufficientFunds]: 'errors.insufficientFunds',
}

/** The 400s of `POST` / `PUT /api/owner/stadiums` (backend `StadiumRules`) → their text. */
const STADIUM_MESSAGES: Record<string, ErrorMessageKey> = {
  [API_MESSAGES.stadiumNameLength]: 'errors.nameLength',
  [API_MESSAGES.stadiumAddressLength]: 'errors.addressLength',
  [API_MESSAGES.stadiumDistrictRequired]: 'errors.districtRequired',
  [API_MESSAGES.invalidDistrict]: 'errors.districtRequired',
  [API_MESSAGES.stadiumPhoneFormat]: 'errors.phoneFormat',
  [API_MESSAGES.stadiumDescriptionLength]: 'errors.descriptionLength',
  [API_MESSAGES.stadiumLandmarkLength]: 'errors.landmarkLength',
  [API_MESSAGES.stadiumLocationRequired]: 'errors.locationRequired',
  [API_MESSAGES.stadiumLocationPair]: 'errors.locationRequired',
  [API_MESSAGES.stadiumOutsideUzbekistan]: 'errors.outsideUzbekistan',
  [API_MESSAGES.stadiumPriceRange]: 'errors.priceRange',
  [API_MESSAGES.stadiumHoursOnTheHour]: 'errors.onTheHour',
  [API_MESSAGES.stadiumHoursOrder]: 'errors.hoursOrder',
}

/**
 * R44: the text for a refused card payment, from `declineReason` (a booking or payment
 * row) or a 400's `code`. No reason, or one this client does not know: a plain decline.
 */
export function declineMessageKey(reason: string | undefined): ErrorMessageKey {
  switch (reason) {
    case API_CODES.insufficientFunds:
      return 'errors.insufficientFunds'
    case API_CODES.cardExpired:
      return 'errors.cardExpired'
    default:
      return 'errors.cardDeclined'
  }
}

/**
 * The card was refused (any reason): the player may try again with another card, and
 * the chosen card is outlined. On a payment call CARD_EXPIRED is a refusal too.
 */
export function isDeclineKey(key: ErrorMessageKey | null | undefined): boolean {
  return (
    key === 'errors.cardDeclined' ||
    key === 'errors.insufficientFunds' ||
    key === 'errors.cardExpired'
  )
}

export function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!isApiError(error)) return 'errors.unknown'
  if (isAccountBlocked(error)) return 'errors.blocked'
  if (error.code === API_CODES.tokenRevoked) return 'errors.session'
  if (error.code === API_CODES.tooManyAttempts) return 'errors.tooMany'
  if (error.code === API_CODES.phoneTaken) return 'errors.phoneTaken'
  // 202: paid, the rest still being settled by the backend.
  if (error.code === API_CODES.paymentPending) return 'errors.paymentPending'
  const cardKey = error.code === undefined ? undefined : CARD_CODES[error.code]
  if (cardKey) return cardKey
  if (error.isNetworkError) return 'errors.network'
  // The provider could not be reached: nothing was charged or bound. Not a decline, and
  // not unclear — the player may simply try again. Matched on the backend's own message,
  // so a proxy's 502 (whose outcome is unknown) stays a server error.
  if (error.status === 502 && error.message === API_MESSAGES.providerUnavailable) {
    return 'errors.providerUnavailable'
  }
  if (error.status >= 500) return 'errors.server'
  switch (error.status) {
    case 400:
      // POST /api/reviews: two 400s the review form tells apart.
      if (error.message === API_MESSAGES.alreadyReviewed) return 'errors.alreadyReviewed'
      if (error.message === API_MESSAGES.reviewNotPlayed) return 'errors.reviewNotPlayed'
      // Stadium photo upload.
      if (error.message === API_MESSAGES.unsupportedImage) return 'errors.imageType'
      if (error.message === API_MESSAGES.tooManyPhotos) return 'errors.tooManyPhotos'
      if (error.message === API_MESSAGES.imageTooLarge) return 'errors.imageTooLarge'
      {
        // Owner stadium forms (create / update): the backend's StadiumRules.
        const stadiumKey = STADIUM_MESSAGES[error.message]
        if (stadiumKey) return stadiumKey
      }
      // Team games: a declined card and the 3-hour cut-off are 400s too.
      if (
        error.message === API_MESSAGES.joinDeclined ||
        error.message === API_MESSAGES.createGameDeclined ||
        error.message === API_MESSAGES.gameRemainderDeclined
      )
        return 'errors.cardDeclined'
      if (error.message === API_MESSAGES.joinTooLate) return 'errors.tooLate'
      if (error.message === API_MESSAGES.joinHasOpponent) return 'errors.hasOpponent'
      // Team-game cash: card or cash got there first.
      if (error.message === API_MESSAGES.alreadyPaid) return 'errors.alreadyPaid'
      if (error.message === API_MESSAGES.gameRemainderConfirming) return 'errors.paymentConfirming'
      // The owner's cash mark, from a backend before design E7 (now a 409).
      if (error.message === API_MESSAGES.noPartPayment) return 'errors.nothingToMark'
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
      // A team game is joined by the joining team's leader only.
      if (error.message === API_MESSAGES.onlyLeadersJoin) return 'errors.onlyLeaderJoins'
      // The owner's remainder marks: not this owner's stadium.
      if (error.message === API_MESSAGES.notStadiumOwner) return 'errors.notYourStadium'
      return 'errors.forbidden'
    case 404:
      return 'errors.notFound'
    case 409:
      // The owner's remainder marks (design E7): settled meanwhile, nothing to mark, a card
      // payment still being confirmed, or past the owner's undo window.
      if (error.message === API_MESSAGES.alreadyPaid) return 'errors.alreadyPaid'
      if (error.message === API_MESSAGES.noPartPayment) return 'errors.nothingToMark'
      if (error.message === API_MESSAGES.bookingPaymentInFlight) return 'errors.cardPaymentInFlight'
      if (error.message === API_MESSAGES.markAdminOnly) return 'errors.markAdminOnly'
      if (error.message === API_MESSAGES.noRemainderMark) return 'errors.noMark'
      return 'errors.conflict'
    case 413:
      return 'errors.fileTooLarge'
    case 429:
      return 'errors.tooMany'
    default:
      return 'errors.unknown'
  }
}

/**
 * How a failure is shown: "try again later" (the payment system is down) is a warning,
 * so it never looks like a declined card; everything else is a danger notice.
 */
export function errorTone(key: ErrorMessageKey): 'warning' | 'danger' {
  return key === 'errors.providerUnavailable' ? 'warning' : 'danger'
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
    key === 'errors.paymentUnclear' ||
    key === 'errors.paymentPending'
  )
}
