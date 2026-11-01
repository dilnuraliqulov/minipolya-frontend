import { describe, expect, it } from 'vitest'
import { parseCheckoutParams } from './checkoutParams'

const today = '2026-11-01'
const parse = (query: string) => parseCheckoutParams(new URLSearchParams(query), today)

describe('parseCheckoutParams', () => {
  it('reads stadium, date and an on-the-hour start', () => {
    expect(parse('stadium=s1&date=2026-11-06&start=20:00')).toEqual({
      stadiumId: 's1',
      date: '2026-11-06',
      start: '20:00',
    })
  })

  it.each([
    ['no stadium', 'date=2026-11-06&start=20:00'],
    ['garbage date', 'stadium=s1&date=garbage&start=20:00'],
    ['past date', 'stadium=s1&date=2026-10-31&start=20:00'],
    ['beyond the window', 'stadium=s1&date=2026-12-30&start=20:00'],
    ['no start', 'stadium=s1&date=2026-11-06'],
    ['not on the hour', 'stadium=s1&date=2026-11-06&start=20:30'],
    ['bad hour', 'stadium=s1&date=2026-11-06&start=25:00'],
  ])('rejects %s', (_, query) => {
    expect(parse(query)).toBeNull()
  })
})
