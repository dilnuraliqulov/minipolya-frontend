import { describe, expect, it } from 'vitest'
import { formatSom } from './money'

describe('formatSom', () => {
  it("converts tiyin to grouped so'm", () => {
    expect(formatSom(15_000_000)).toBe("150 000 so'm")
  })

  it('groups millions', () => {
    expect(formatSom(123_456_700)).toBe("1 234 567 so'm")
  })

  it("handles amounts below a thousand so'm", () => {
    expect(formatSom(50_000)).toBe("500 so'm")
    expect(formatSom(0)).toBe("0 so'm")
  })

  it('keeps a leftover tiyin part instead of dropping it', () => {
    expect(formatSom(15_000_050)).toBe("150 000,50 so'm")
    expect(formatSom(105)).toBe("1,05 so'm")
  })

  it('formats negative amounts', () => {
    expect(formatSom(-2_500_000)).toBe("-25 000 so'm")
  })

  it('rejects non-integer input', () => {
    expect(() => formatSom(1.5)).toThrow(TypeError)
    expect(() => formatSom(Number.NaN)).toThrow(TypeError)
  })
})
