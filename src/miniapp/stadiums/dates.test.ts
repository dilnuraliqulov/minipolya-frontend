import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { BOOKING_WINDOW_DAYS, bookingDates, dayTitle, isInBookingWindow, slotLabel } from './dates'

afterEach(async () => {
  await i18n.changeLanguage('uz')
})

describe('bookingDates — the date strip', () => {
  it('runs from today to 28 days ahead (the 4-week window), Monday = 0', () => {
    const dates = bookingDates('2026-11-01')
    expect(dates).toHaveLength(BOOKING_WINDOW_DAYS + 1)
    expect(dates[0]).toEqual({ iso: '2026-11-01', day: 1, dayOfWeek: 6 })
    expect(dates[1]).toEqual({ iso: '2026-11-02', day: 2, dayOfWeek: 0 })
    expect(dates.at(-1)?.iso).toBe('2026-11-29')
  })

  it('crosses months and years', () => {
    const dates = bookingDates('2026-12-20')
    expect(dates[12]?.iso).toBe('2027-01-01')
  })
})

describe('isInBookingWindow', () => {
  it.each([
    ['2026-11-01', true],
    ['2026-11-02', true],
    ['2026-11-29', true],
    ['2026-11-30', false],
    ['2026-10-31', false],
    ['2026-12-11', false],
    ['garbage', false],
    ['', false],
    [null, false],
    ['2026-11-1', false],
    ['2026-11-05T00:00', false],
    ['2026-02-30', false],
  ])('%s → %s (today 2026-11-01)', (iso, expected) => {
    expect(isInBookingWindow(iso, '2026-11-01')).toBe(expected)
  })
})

describe('labels', () => {
  it('titles a day with its weekday and date', () => {
    expect(dayTitle('2026-10-22')).toBe('Payshanba, 22-oktabr')
  })

  it('writes a slot as start–end from the API times', () => {
    expect(slotLabel({ startTime: '20:00:00', endTime: '21:00:00' })).toBe('20:00–21:00')
  })
})
