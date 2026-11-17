import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { bookingWhen } from './when'

afterEach(async () => {
  await i18n.changeLanguage('uz')
})

/** U+2060 WORD JOINER, around the dash so the range never wraps. */
const WJ = '⁠'

describe('bookingWhen', () => {
  it('shows the real date and time in Tashkent', () => {
    // 15:00Z on Friday 2026-11-06 is 20:00 Tashkent the same day.
    expect(
      bookingWhen({ startsAt: '2026-11-06T15:00:00Z', endsAt: '2026-11-06T16:00:00Z' }),
    ).toBe(`Juma, 6-noyabr · 20:00${WJ}–${WJ}21:00`)
  })

  it('names the working night of an after-midnight booking', () => {
    // 19:00Z on Sunday 2026-11-15 is 00:00 Tashkent on Monday 2026-11-16; the hour
    // belongs to Sunday's working day, which the backend reports.
    expect(
      bookingWhen({
        startsAt: '2026-11-15T19:00:00Z',
        endsAt: '2026-11-15T20:00:00Z',
        workingDate: '2026-11-15',
        afterMidnight: true,
      }),
    ).toBe(`Dushanba, 16-noyabr · 00:00${WJ}–${WJ}01:00 (yakshanba kechasi)`)
  })

  it('leaves an ordinary booking alone even with a working date', () => {
    expect(
      bookingWhen({
        startsAt: '2026-11-06T15:00:00Z',
        endsAt: '2026-11-06T16:00:00Z',
        workingDate: '2026-11-06',
      }),
    ).toBe(`Juma, 6-noyabr · 20:00${WJ}–${WJ}21:00`)
  })

  it('says nothing about the night when the backend sent no working date', () => {
    expect(
      bookingWhen({
        startsAt: '2026-11-15T19:00:00Z',
        endsAt: '2026-11-15T20:00:00Z',
        afterMidnight: true,
      }),
    ).toBe(`Dushanba, 16-noyabr · 00:00${WJ}–${WJ}01:00`)
  })
})
