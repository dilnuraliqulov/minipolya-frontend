import { describe, expect, it } from 'vitest'
import { startRoute } from './startRoute'

describe('startRoute', () => {
  it('opens a team invite on the join screen', () => {
    expect(startRoute('team_Ab3-x_9')).toBe('/join/Ab3-x_9')
  })

  it('ignores anything else', () => {
    expect(startRoute(null)).toBeNull()
    expect(startRoute('')).toBeNull()
    expect(startRoute('game_123')).toBeNull()
    expect(startRoute('team_')).toBeNull()
    expect(startRoute('team_a/b')).toBeNull()
  })
})
