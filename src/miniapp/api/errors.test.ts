import { describe, expect, it } from 'vitest'
import { ApiError } from '../../shared/api'
import i18n from '../i18n'
import { errorMessageKey, errorMessage } from './errors'

describe('errorMessageKey — the one mapping from backend errors to our text', () => {
  it.each([
    [new ApiError('Network request failed', 0), 'errors.network'],
    [new ApiError('Internal server error', 500), 'errors.server'],
    [new ApiError('Bad Gateway', 502), 'errors.server'],
    [new ApiError('Authentication required', 401), 'errors.session'],
    [new ApiError('Session ended', 401, 'TOKEN_REVOKED'), 'errors.session'],
    [new ApiError('Account is blocked', 403), 'errors.blocked'],
    [new ApiError('x', 403, 'ACCOUNT_BLOCKED'), 'errors.blocked'],
    [new ApiError('Access denied', 403), 'errors.forbidden'],
    [new ApiError('User not found', 404), 'errors.notFound'],
    [new ApiError('name: must be between 1 and 120 characters', 400), 'errors.invalid'],
    [new ApiError('Data conflict', 409), 'errors.conflict'],
    [new ApiError('Juda koʻp', 429, 'TOO_MANY_ATTEMPTS'), 'errors.tooMany'],
  ] as const)('%s → %s', (error, key) => {
    expect(errorMessageKey(error)).toBe(key)
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
