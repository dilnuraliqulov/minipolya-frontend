/** The four tabs of the player's bottom navigation, in the design's order. */
export const TABS = [
  { key: 'stadiums', path: '/' },
  { key: 'team', path: '/team' },
  { key: 'games', path: '/games' },
  { key: 'profile', path: '/profile' },
] as const

export type TabKey = (typeof TABS)[number]['key']
