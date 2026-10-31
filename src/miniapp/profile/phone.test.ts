import { describe, expect, it } from 'vitest'
import { formatPhone, formatPhoneInput, isCompletePhone, toWirePhone } from './phone'

describe('formatPhoneInput', () => {
  it('keeps +998 and groups what the user types as XX XXX XX XX', () => {
    expect(formatPhoneInput('')).toBe('+998 ')
    expect(formatPhoneInput('+998 9')).toBe('+998 9')
    expect(formatPhoneInput('+998 901')).toBe('+998 90 1')
    expect(formatPhoneInput('+998901234567')).toBe('+998 90 123 45 67')
  })

  it('accepts a pasted local number and drops extra digits', () => {
    expect(formatPhoneInput('90 123 45 67')).toBe('+998 90 123 45 67')
    expect(formatPhoneInput('+998 90 123 45 6789')).toBe('+998 90 123 45 67')
  })
})

describe('isCompletePhone / toWirePhone', () => {
  it('needs all nine digits after +998', () => {
    expect(isCompletePhone('+998 90 12')).toBe(false)
    expect(isCompletePhone('+998 90 123 45 67')).toBe(true)
  })

  it('sends +998XXXXXXXXX', () => {
    expect(toWirePhone('+998 90 123 45 67')).toBe('+998901234567')
  })
})

describe('formatPhone', () => {
  it('shows a stored phone grouped, and anything unexpected as it is', () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123 45 67')
    expect(formatPhone('12345')).toBe('12345')
  })
})
