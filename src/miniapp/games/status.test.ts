import { describe, expect, it } from 'vitest'
import { gameStatusBadge } from './status'

describe('gameStatusBadge', () => {
  it.each([
    ['open', 'warning', 'games.status.open'],
    ['confirmed', 'success', 'games.status.confirmed'],
    ['completed', 'neutral', 'games.status.completed'],
    ['cancelled_slot_taken', 'danger', 'games.status.cancelled'],
    ['cancelled_by_creator', 'danger', 'games.status.cancelled'],
    ['cancelled_not_filled', 'danger', 'games.status.cancelled'],
    ['weird', 'neutral', null],
  ])('%s → %s', (status, tone, labelKey) => {
    expect(gameStatusBadge(status)).toEqual({ tone, labelKey, raw: status })
  })
})
