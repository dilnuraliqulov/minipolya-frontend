import { describe, expect, it } from 'vitest'
import { stubApi } from '../test/api'
import { makeBooking, makeCard } from '../test/bookings'
import { createBooking, getBookings } from './bookings'
import { formatMaskedNumber } from './cards'

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

describe('formatMaskedNumber', () => {
  it('shows the new and the older mask the same way', () => {
    expect(formatMaskedNumber('8600 •••• •••• 1234')).toBe('8600 •••• •••• 1234')
    expect(formatMaskedNumber('8600 •••• 1234')).toBe('8600 •••• •••• 1234')
    expect(formatMaskedNumber('9860 •••• •••• 1840 ')).toBe('9860 •••• •••• 1840')
  })

  it('reads a provider mask and one without a prefix', () => {
    expect(formatMaskedNumber('986009******1840')).toBe('9860 •••• •••• 1840')
    expect(formatMaskedNumber('•••• •••• •••• 1234')).toBe('•••• 1234')
    expect(formatMaskedNumber('•••• •••• •••• ••••')).toBe('•••• •••• •••• ••••')
  })

  it('works on a card from the test helper', () => {
    expect(formatMaskedNumber(makeCard().maskedNumber)).toMatch(/^[0-9]{4} •••• •••• [0-9]{4}$/)
  })
})
