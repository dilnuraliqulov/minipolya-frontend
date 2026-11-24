import { describe, expect, it } from 'vitest'
import { formatNumber, GROUP_SEPARATOR } from './number'

describe('formatNumber', () => {
  it('groups with a non-breaking space so a number never splits', () => {
    expect(formatNumber(1234567)).toBe(`1${GROUP_SEPARATOR}234${GROUP_SEPARATOR}567`)
    expect(formatNumber(1234567)).not.toContain(' ')
  })

  it('groups thousands', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(1203)).toBe('1\u00A0203')
    expect(formatNumber(1234567)).toBe('1\u00A0234\u00A0567')
    expect(formatNumber(-45000)).toBe('-45\u00A0000')
  })

  it('rejects non-integers', () => {
    expect(() => formatNumber(1.5)).toThrow(TypeError)
  })
})
