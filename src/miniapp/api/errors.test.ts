import { describe, expect, it } from 'vitest'
import { ApiError } from '../../shared/api'
import i18n from '../i18n'
import { errorMessage, errorMessageKey, errorTone, isUnclearPaymentError } from './errors'

describe('errorMessageKey — the one mapping from backend errors to our text', () => {
  it.each([
    [new ApiError('Network request failed', 0), 'errors.network'],
    [new ApiError('Internal server error', 500), 'errors.server'],
    // A proxy's 502 has no outcome to tell; only the backend's own message means "provider down".
    [new ApiError('Bad Gateway', 502), 'errors.server'],
    [
      new ApiError(
        "To'lov tizimi vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring",
        502,
      ),
      'errors.providerUnavailable',
    ],
    [new ApiError('x', 202, 'PAYMENT_PENDING'), 'errors.paymentPending'],
    [new ApiError('This game already has an opponent', 400), 'errors.hasOpponent'],
    [
      new ApiError(
        "Only the joining team's leader can join a team game, with their team and a card",
        403,
      ),
      'errors.onlyLeaderJoins',
    ],
    [new ApiError('x', 400, 'CARD_NOT_SUPPORTED'), 'errors.cardNotSupported'],
    [new ApiError('x', 400, 'CARD_EXPIRY_INVALID'), 'errors.cardExpiryInvalid'],
    [new ApiError('x', 400, 'CARD_EXPIRED'), 'errors.cardExpired'],
    [new ApiError('x', 400, 'SMS_CODE_WRONG'), 'errors.smsCodeWrong'],
    [new ApiError('x', 400, 'SMS_CODE_EXPIRED'), 'errors.smsCodeExpired'],
    [new ApiError('x', 400, 'SMS_RESEND_TOO_EARLY'), 'errors.smsResendTooEarly'],
    [new ApiError('x', 400, 'SMS_RESEND_UNAVAILABLE'), 'errors.smsResendUnavailable'],
    [new ApiError('x', 400, 'BINDING_NOT_FOUND'), 'errors.bindingNotFound'],
    [new ApiError('x', 400, 'CARD_BINDING_FAILED'), 'errors.cardBindingFailed'],
    // R44 (requested): a decline that says why.
    [new ApiError('x', 400, 'CARD_DECLINED'), 'errors.cardDeclined'],
    [new ApiError('x', 400, 'INSUFFICIENT_FUNDS'), 'errors.insufficientFunds'],
    [new ApiError('Authentication required', 401), 'errors.session'],
    [new ApiError('Session ended', 401, 'TOKEN_REVOKED'), 'errors.session'],
    [new ApiError('Account is blocked', 403), 'errors.blocked'],
    [new ApiError('x', 403, 'ACCOUNT_BLOCKED'), 'errors.blocked'],
    [new ApiError('Access denied', 403), 'errors.forbidden'],
    [new ApiError('User not found', 404), 'errors.notFound'],
    [new ApiError('name: must be between 1 and 120 characters', 400), 'errors.invalid'],
    [new ApiError('Data conflict', 409), 'errors.conflict'],
    [new ApiError('You have already reviewed this stadium', 400), 'errors.alreadyReviewed'],
    [
      new ApiError('You can only review a stadium you have played at', 400),
      'errors.reviewNotPlayed',
    ],
    [
      new ApiError('Card payment was declined; the game is still looking for an opponent', 400),
      'errors.cardDeclined',
    ],
    [
      new ApiError('Card payment was declined; the game was not created', 400),
      'errors.cardDeclined',
    ],
    [
      new ApiError('Card payment was declined; the remainder is still owed', 400),
      'errors.cardDeclined',
    ],
    [
      new ApiError("O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi", 400),
      'errors.tooLate',
    ],
    [
      new ApiError(
        'The card payment is still being confirmed; the remainder will be marked paid once it is',
        400,
      ),
      'errors.paymentConfirming',
    ],
    [new ApiError('Juda koʻp', 429, 'TOO_MANY_ATTEMPTS'), 'errors.tooMany'],
  ] as const)('%s → %s', (error, key) => {
    expect(errorMessageKey(error)).toBe(key)
  })

  it('shows "the payment system is down" as a warning, never like a declined card', () => {
    const down = new ApiError(
      "To'lov tizimi vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring",
      502,
    )
    expect(errorTone(errorMessageKey(down))).toBe('warning')
    expect(isUnclearPaymentError(down)).toBe(false)
    expect(errorMessage(down)).toBe(
      'Toʻlov tizimi vaqtincha ishlamayapti. Birozdan soʻng urinib koʻring.',
    )
    expect(errorTone('errors.cardDeclined')).toBe('danger')
  })

  it('never offers to pay again after 202 PAYMENT_PENDING', () => {
    expect(isUnclearPaymentError(new ApiError('x', 202, 'PAYMENT_PENDING'))).toBe(true)
  })

  it('treats anything that is not an ApiError as unknown', () => {
    expect(errorMessageKey(new Error('boom'))).toBe('errors.unknown')
    expect(errorMessageKey(undefined)).toBe('errors.unknown')
  })

  it('never shows the backend prose', () => {
    const text = errorMessage(new ApiError('Slot is already booked', 409))
    expect(text).not.toContain('Slot is already booked')
    expect(text).toBe(i18n.t('errors.conflict'))
  })
})
