import { describe, expect, it } from 'vitest'
import { bookingStatusBadge } from './status'

describe('bookingStatusBadge', () => {
  it.each([
    ['pending', 'warning', 'bookings.status.pending'],
    ['confirmed', 'success', 'bookings.status.confirmed'],
    ['completed', 'neutral', 'bookings.status.completed'],
    ['expired', 'neutral', 'bookings.status.expired'],
    ['cancelled_by_user', 'danger', 'bookings.status.cancelled'],
    ['cancelled_by_owner', 'danger', 'bookings.status.cancelled'],
    ['cancelled_opponent_left', 'danger', 'bookings.status.cancelled'],
  ] as const)('%s → %s', (status, tone, labelKey) => {
    expect(bookingStatusBadge(status)).toEqual({ tone, labelKey, raw: status })
  })

  it('shows an unknown status raw in a neutral badge', () => {
    expect(bookingStatusBadge('weird')).toEqual({ tone: 'neutral', labelKey: null, raw: 'weird' })
  })
})
