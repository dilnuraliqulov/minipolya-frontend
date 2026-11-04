import { describe, expect, it } from 'vitest'
import {
  BOOKING_CASH_PAID,
  BOOKING_PAY,
  BOOKING_QUOTE,
  BOOKING_STADIUM_FIELDS,
  BOOKINGS_WHEN,
} from './bookings'
import { TEAM_GAME_QUOTE } from './games'
import { isAvailable, MISSING_ENDPOINTS } from './missing'

describe('requested endpoints', () => {
  it.each([
    [BOOKING_QUOTE, 'R27'],
    [BOOKING_PAY, 'R28'],
    [BOOKINGS_WHEN, 'R29'],
    [BOOKING_CASH_PAID, 'R30'],
    [BOOKING_STADIUM_FIELDS, 'R31'],
    [TEAM_GAME_QUOTE, 'R33'],
  ])('%s is missing (%s)', (endpoint, request) => {
    expect(isAvailable(endpoint)).toBe(false)
    expect(MISSING_ENDPOINTS[endpoint]).toBe(request)
  })
})
