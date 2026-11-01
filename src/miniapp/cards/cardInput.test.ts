import { describe, expect, it } from 'vitest'
import {
  digitsOnly,
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
