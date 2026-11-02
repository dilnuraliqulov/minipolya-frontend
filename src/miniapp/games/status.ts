import type { ParseKeys } from 'i18next'
import type { BadgeTone } from '../components'

/** THE game status → badge mapping. Unknown values show raw in a neutral badge. */
export function gameStatusBadge(status: string): {
  tone: BadgeTone
  labelKey: ParseKeys | null
  raw: string
} {
  if (status === 'open') return { tone: 'warning', labelKey: 'games.status.open', raw: status }
  if (status === 'confirmed')
    return { tone: 'success', labelKey: 'games.status.confirmed', raw: status }
  if (status === 'completed')
    return { tone: 'neutral', labelKey: 'games.status.completed', raw: status }
  if (status.startsWith('cancelled'))
    return { tone: 'danger', labelKey: 'games.status.cancelled', raw: status }
  return { tone: 'neutral', labelKey: null, raw: status }
}
