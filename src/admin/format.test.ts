import { describe, expect, it } from 'vitest'
import {
  bpsToPercent,
  formatAgo,
  formatBps,
  formatDayMonth,
  formatDayMonthShort,
  lastDays,
  percentToBps,
  tashkentToday,
} from './format'

describe('admin date formatting', () => {
  it('formats LocalDates in Uzbek', () => {
    expect(formatDayMonth('2026-10-14')).toBe('14 oktabr')
    expect(formatDayMonthShort('2026-09-23')).toBe('23 sen')
    expect(formatDayMonthShort('2026-01-05')).toBe('5 yan')
  })

  it('takes today from Tashkent, not UTC', () => {
    // 20:00 UTC on the 27th is already 01:00 on the 28th in Tashkent.
    expect(tashkentToday(new Date('2026-10-27T20:00:00Z'))).toBe('2026-10-28')
    expect(tashkentToday(new Date('2026-10-27T18:59:00Z'))).toBe('2026-10-27')
  })

  it('lists the last N days across a month boundary', () => {
    expect(lastDays('2026-10-02', 3)).toEqual(['2026-09-30', '2026-10-01', '2026-10-02'])
    expect(lastDays('2026-10-22', 30)[0]).toBe('2026-09-23')
  })

  it('says how long ago something was', () => {
    const now = new Date('2026-10-27T12:00:00Z')
    expect(formatAgo('2026-10-27T11:59:40Z', now)).toBe('hozirgina')
    expect(formatAgo('2026-10-27T11:15:00Z', now)).toBe('45 daqiqa oldin')
    expect(formatAgo('2026-10-27T07:00:00Z', now)).toBe('5 soat oldin')
    expect(formatAgo('2026-10-25T10:00:00Z', now)).toBe('2 kun oldin')
  })
})

describe('basis points', () => {
  it('turns basis points into a percent and back without floats', () => {
    expect([150, 1000, 5, 0, 225].map(bpsToPercent)).toEqual(['1.5', '10', '0.05', '0', '2.25'])
    expect(['1.5', '10', '0.05', '0', '2.25', '1.', '.5'].map(percentToBps)).toEqual([
      150, 1000, 5, 0, 225, 100, 50,
    ])
    expect(formatBps(150)).toBe('1,5%')
  })
})
