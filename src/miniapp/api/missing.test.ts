import { describe, expect, it } from 'vitest'
import { BOOKING_STADIUM_FIELDS } from './bookings'
import { isAvailable, MISSING_ENDPOINTS } from './missing'

describe('requested endpoints', () => {
  it.each([[BOOKING_STADIUM_FIELDS, 'R31']])('%s is missing (%s)', (endpoint, request) => {
    expect(isAvailable(endpoint)).toBe(false)
    expect(MISSING_ENDPOINTS[endpoint]).toBe(request)
  })
})
