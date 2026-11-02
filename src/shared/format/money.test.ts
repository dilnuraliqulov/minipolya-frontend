import { describe, expect, it } from 'vitest'
import { formatSom, formatSomParts, somInputToTiyin, somToTiyin, tiyinToSomInput } from './money'

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

  it('splits the amount from the unit for separate styling', () => {
    expect(formatSomParts(4_865_000_000)).toEqual({ amount: '48 650 000', unit: "so'm" })
    expect(formatSomParts(-105)).toEqual({ amount: '-1,05', unit: "so'm" })
  })
})

describe('somToTiyin', () => {
  it("turns a whole so'm amount the user typed into tiyin for the API", () => {
    expect(somToTiyin(150_000)).toBe(15_000_000)
    expect(somToTiyin(0)).toBe(0)
  })

  it('refuses anything that is not a whole, non-negative amount', () => {
    expect(() => somToTiyin(1.5)).toThrow()
    expect(() => somToTiyin(-1)).toThrow()
  })
})

describe('tiyinToSomInput / somInputToTiyin', () => {
  it("shows tiyin as a so'm input value without rounding", () => {
    expect(tiyinToSomInput(2_500_000)).toBe('25000')
    expect(tiyinToSomInput(12_345)).toBe('123.45')
    expect(tiyinToSomInput(12_340)).toBe('123.4')
    expect(tiyinToSomInput(50)).toBe('0.5')
    expect(tiyinToSomInput(1)).toBe('0.01')
    expect(tiyinToSomInput(0)).toBe('0')
  })

  it("turns a typed so'm value (up to two decimals) into exact tiyin", () => {
    expect(somInputToTiyin('25000')).toBe(2_500_000)
    expect(somInputToTiyin('123.45')).toBe(12_345)
    expect(somInputToTiyin('123.4')).toBe(12_340)
    expect(somInputToTiyin('0.01')).toBe(1)
    expect(somInputToTiyin('.5')).toBe(50)
    expect(somInputToTiyin('12.')).toBe(1_200)
  })

  it('refuses anything but digits with at most two decimals', () => {
    expect(() => somInputToTiyin('1.234')).toThrow()
    expect(() => somInputToTiyin('-1')).toThrow()
    expect(() => somInputToTiyin('abc')).toThrow()
    expect(() => somInputToTiyin('')).toThrow()
  })

  it('round-trips every value', () => {
    for (const tiyin of [0, 1, 9, 10, 99, 100, 101, 12_345, 1_000_000])
      expect(somInputToTiyin(tiyinToSomInput(tiyin))).toBe(tiyin)
  })
})
