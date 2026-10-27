import { describe, expect, it } from 'vitest'
import { formatNumber } from './number'

describe('formatNumber', () => {
  it('groups thousands with spaces', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(1203)).toBe('1 203')
    expect(formatNumber(1234567)).toBe('1 234 567')
    expect(formatNumber(-45000)).toBe('-45 000')
  })

  it('rejects non-integers', () => {
    expect(() => formatNumber(1.5)).toThrow(TypeError)
  })
})
