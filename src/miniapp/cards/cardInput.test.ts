import { describe, expect, it } from 'vitest'
import {
  cardBrand,
  cardNumberProblem,
  digitsOnly,
  expiryProblem,
  formatExpiry,
  groupCardNumber,
  isCardNumberComplete,
  isExpiryShape,
} from './cardInput'

describe('cardInput', () => {
  it('groups a card number in fours', () => {
    expect(groupCardNumber('8600123456789012')).toBe('8600 1234 5678 9012')
    expect(groupCardNumber('86001')).toBe('8600 1')
    expect(groupCardNumber('')).toBe('')
  })

  it('keeps digits only', () => {
    expect(digitsOnly('8600 1234-5678 9012')).toBe('8600123456789012')
  })

  it('needs 16 digits', () => {
    expect(isCardNumberComplete('8600123456789012')).toBe(true)
    expect(isCardNumberComplete('860012345678901')).toBe(false)
  })

  it('checks the MM/YY shape', () => {
    expect(isExpiryShape('12/27')).toBe(true)
    expect(isExpiryShape('01/30')).toBe(true)
    expect(isExpiryShape('13/27')).toBe(false)
    expect(isExpiryShape('00/27')).toBe(false)
    expect(isExpiryShape('1/27')).toBe(false)
    expect(isExpiryShape('1227')).toBe(false)
  })

  it('formats typed digits as MM/YY', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('12')).toBe('12')
    expect(formatExpiry('122')).toBe('12/2')
    expect(formatExpiry('12/27')).toBe('12/27')
    expect(formatExpiry('122789')).toBe('12/27')
  })
})

describe('card checks before sending', () => {
  it('names the card system from the first four digits', () => {
    expect(cardBrand('8600')).toBe('uzcard')
    expect(cardBrand('9860123412341234')).toBe('humo')
    expect(cardBrand('860')).toBeNull()
    expect(cardBrand('4111111111111111')).toBeNull()
  })

  it('refuses another prefix at once, and a short number', () => {
    expect(cardNumberProblem('4111')).toBe('brand')
    expect(cardNumberProblem('8601123412341234')).toBe('brand')
    expect(cardNumberProblem('860')).toBe('length')
    expect(cardNumberProblem('860012341234123')).toBe('length')
    expect(cardNumberProblem('8600123412341234')).toBeNull()
    expect(cardNumberProblem('9860123412341234')).toBeNull()
  })

  it('needs MM/YY of a month that has not ended', () => {
    const today = '2026-11-05'
    expect(expiryProblem('11/2', today)).toBe('shape')
    expect(expiryProblem('13/27', today)).toBe('shape')
    expect(expiryProblem('10/26', today)).toBe('past')
    expect(expiryProblem('12/25', today)).toBe('past')
    // Valid through the last day of its month.
    expect(expiryProblem('11/26', today)).toBeNull()
    expect(expiryProblem('01/27', today)).toBeNull()
  })
})
