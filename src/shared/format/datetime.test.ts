import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeRange,
  parseUtc,
  toTashkentParts,
} from './datetime'

describe('Tashkent date and time helpers', () => {
  it('shifts UTC to Tashkent (UTC+5)', () => {
    expect(formatTime('2026-11-02T15:00:00Z')).toBe('20:00')
    expect(formatDate('2026-11-02T15:00:00Z')).toBe('02.11.2026')
    expect(formatDateTime('2026-11-02T15:00:00Z')).toBe('02.11.2026 20:00')
  })

  it('rolls over to the next day', () => {
    expect(formatDateTime('2026-12-31T20:30:00Z')).toBe('01.01.2027 01:30')
  })

  it('shows midnight as 00:00, not 24:00', () => {
    expect(formatTime('2026-11-02T19:00:00Z')).toBe('00:00')
  })

  it('accepts offsets other than Z', () => {
    expect(formatTime('2026-11-02T20:00:00+05:00')).toBe('20:00')
  })

  it('formats a range', () => {
    expect(formatTimeRange('2026-11-02T15:00:00Z', '2026-11-02T17:00:00Z')).toBe('20:00–22:00')
  })

  it('uses 0 = Monday for the day of week', () => {
    // 2026-11-02 is a Monday in Tashkent.
    expect(toTashkentParts('2026-11-02T15:00:00Z').dayOfWeek).toBe(0)
    // Sunday 2026-11-08 22:00 UTC is already Monday 03:00 in Tashkent.
    expect(toTashkentParts('2026-11-08T22:00:00Z').dayOfWeek).toBe(0)
    expect(toTashkentParts('2026-11-08T12:00:00Z').dayOfWeek).toBe(6)
  })

  it('rejects an invalid timestamp', () => {
    expect(() => parseUtc('not a date')).toThrow(RangeError)
  })
})
