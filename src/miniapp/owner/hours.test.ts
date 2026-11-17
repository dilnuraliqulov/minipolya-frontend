import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import {
  checkWeeklyHours,
  closingOptions,
  closingLabel,
  everyDaySame,
  fromApi,
  hoursSummary,
  isSameEveryDay,
  sameEveryDay,
  toApi,
  type DayHours,
} from './hours'

afterEach(async () => {
  await i18n.changeLanguage('uz')
})

/** The whole week 08:00–00:00 with the given days replaced. */
function week(...overrides: DayHours[]): DayHours[] {
  const days = sameEveryDay(8, 0)
  for (const day of overrides) days[day.dayOfWeek] = day
  return days
}

const open = (dayOfWeek: number, openHour: number, closeHour: number): DayHours => ({
  dayOfWeek,
  closed: false,
  open: openHour,
  close: closeHour,
})

const closed = (dayOfWeek: number): DayHours => ({ dayOfWeek, closed: true })

describe('the closing hours an owner may pick', () => {
  it('offers the rest of the day, then midnight, then the small hours', () => {
    expect(closingOptions(8)).toEqual([
      9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6,
    ])
  })

  it('never offers a closing the backend would refuse', () => {
    for (const open of Array.from({ length: 24 }, (_, i) => i)) {
      for (const close of closingOptions(open)) {
        expect(checkWeeklyHours(sameEveryDay(open, close)), `${open}->${close}`).toBeNull()
      }
    }
  })

  it('offers no midnight to a day opening at midnight (that would be 24 hours)', () => {
    expect(closingOptions(0)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ])
  })

  it('labels a closing after midnight', () => {
    expect(closingLabel(8, 2)).toBe('02:00 (ertasi kuni)')
  })

  it('labels midnight plainly', () => {
    expect(closingLabel(8, 0)).toBe('00:00')
  })

  it('labels a same-day closing plainly', () => {
    expect(closingLabel(8, 23)).toBe('23:00')
  })
})

describe('checkWeeklyHours', () => {
  it('accepts Friday 08:00–02:00', () => {
    expect(checkWeeklyHours(week(open(4, 8, 2)))).toBeNull()
  })

  it('accepts a closed day', () => {
    expect(checkWeeklyHours(week(closed(6)))).toBeNull()
  })

  it('refuses a closing after 06:00 the next morning', () => {
    expect(checkWeeklyHours(week(open(4, 8, 7)))).toBe('owner.rules.closeTooLate')
  })

  it('refuses less than an hour before the next opening', () => {
    expect(checkWeeklyHours(week(open(4, 8, 2), open(5, 2, 22)))).toBe('owner.rules.hoursGap')
  })

  it('accepts exactly an hour between', () => {
    expect(checkWeeklyHours(week(open(4, 8, 2), open(5, 3, 22)))).toBeNull()
  })

  it('checks the wrap from Sunday to Monday', () => {
    expect(checkWeeklyHours(week(open(6, 8, 2), open(0, 2, 22)))).toBe('owner.rules.hoursGap')
  })

  it('needs no gap when the next day is closed', () => {
    expect(checkWeeklyHours(week(open(4, 8, 6), closed(5)))).toBeNull()
  })

  it('refuses a week with every day closed', () => {
    expect(checkWeeklyHours([0, 1, 2, 3, 4, 5, 6].map(closed))).toBe('owner.rules.hoursAllClosed')
  })

  it('refuses an opening and closing at the same hour', () => {
    expect(checkWeeklyHours(week(open(4, 8, 8)))).toBe('owner.rules.closeTooLate')
  })
})

describe('hoursSummary', () => {
  it('summarises a uniform week', () => {
    expect(hoursSummary(sameEveryDay(8, 0))).toBe('Har kuni 08:00–00:00')
  })

  it('groups a run of days and names the rest', () => {
    expect(hoursSummary(week(open(4, 8, 2), open(5, 8, 2)))).toBe(
      'Ju–Sh 08:00–02:00, boshqa kunlar 08:00–00:00',
    )
  })

  it('names a single different day', () => {
    expect(hoursSummary(week(open(4, 8, 2)))).toBe('Ju 08:00–02:00, boshqa kunlar 08:00–00:00')
  })

  it('names the closed days', () => {
    expect(hoursSummary(week(closed(6)))).toBe('Ya yopiq, boshqa kunlar 08:00–00:00')
  })

  it('lists every group when no shape covers the rest', () => {
    const summary = hoursSummary(week(open(0, 9, 22), open(1, 10, 23), closed(6)))
    expect(summary).toContain('Du 09:00–22:00')
    expect(summary).toContain('Se 10:00–23:00')
    expect(summary).toContain('Ya yopiq')
  })
})

describe('sameEveryDay / isSameEveryDay', () => {
  it('builds seven identical open days', () => {
    const days = sameEveryDay(8, 2)
    expect(days).toHaveLength(7)
    expect(days.every((d) => !d.closed && d.open === 8 && d.close === 2)).toBe(true)
    expect(isSameEveryDay(days)).toBe(true)
  })

  it('knows a mixed week is not uniform', () => {
    expect(isSameEveryDay(week(open(4, 8, 2)))).toBe(false)
    expect(isSameEveryDay(week(closed(6)))).toBe(false)
  })

  it('takes the first open day when flattening a mixed week', () => {
    expect(everyDaySame(week(closed(0), open(1, 9, 23)))).toEqual({ open: 9, close: 23 })
  })
})

describe('the API shape', () => {
  it('sends whole hours as LocalTime, and nothing on a closed day', () => {
    expect(toApi(week(open(4, 8, 2), closed(6)))).toEqual({
      days: [
        { dayOfWeek: 0, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
        { dayOfWeek: 1, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
        { dayOfWeek: 2, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
        { dayOfWeek: 3, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
        { dayOfWeek: 4, closed: false, openTime: '08:00:00', closeTime: '02:00:00' },
        { dayOfWeek: 5, closed: false, openTime: '08:00:00', closeTime: '00:00:00' },
        { dayOfWeek: 6, closed: true },
      ],
    })
  })

  it('reads the API rows back, Monday first', () => {
    expect(
      fromApi([
        { dayOfWeek: 6, closed: true },
        ...[0, 1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          closed: false,
          openTime: '08:00:00',
          closeTime: '02:00:00',
        })),
      ]),
    ).toEqual(week(...[0, 1, 2, 3, 4, 5].map((d) => open(d, 8, 2)), closed(6)))
  })

  it('falls back to one pair of hours when the schedule is missing', () => {
    expect(fromApi(undefined, '09:00:00', '23:00:00')).toEqual(sameEveryDay(9, 23))
  })
})
