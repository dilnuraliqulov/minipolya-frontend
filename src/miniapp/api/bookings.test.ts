import { describe, expect, it } from 'vitest'
import { stubApi } from '../test/api'
import { makeBooking, makeCard } from '../test/bookings'
import { createBooking, getBookings } from './bookings'
import { lastFour } from './cards'

describe('createBooking', () => {
  it('sends paymentOption uppercase and startsAt unchanged', async () => {
    const fetch = stubApi({ 'POST /api/bookings': makeBooking() })
    await createBooking({
      stadiumId: 's1',
      startsAt: '2026-11-06T15:00:00.000Z',
      cardId: 'c1',
      paymentOption: 'MINIMUM',
    })
    expect(fetch.calls('POST /api/bookings')).toEqual([
      {
        stadiumId: 's1',
        startsAt: '2026-11-06T15:00:00.000Z',
        cardId: 'c1',
        paymentOption: 'MINIMUM',
      },
    ])
  })
})

describe('getBookings', () => {
  it('asks for a page of 20', async () => {
    const fetch = stubApi({
      'GET /api/bookings': { content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 },
    })
    await getBookings(2)
    expect(fetch.queries('GET /api/bookings')).toEqual([{ page: '2', size: '20' }])
  })
})

describe('lastFour', () => {
  it('takes the last four characters of the masked number', () => {
    expect(lastFour('8600 •••• 1234')).toBe('1234')
    expect(lastFour(makeCard().maskedNumber)).toHaveLength(4)
  })
})
