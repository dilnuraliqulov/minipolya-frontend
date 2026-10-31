import { BOOKING_DETAIL, GAME_DETAIL } from '../api/bookings'
import { isAvailable } from '../api/missing'
import { PAYMENT_DETAIL } from '../api/payments'

/**
 * Where an audit entry's object opens in the panel. Only entity types whose
 * page exists are listed — and those whose endpoint is still in the missing
 * list are left out — so anything else is shown as plain text.
 */
const ENTITY_PATHS: Record<string, { path: (id: string) => string; needs?: string }> = {
  platform_settings: { path: () => '/sozlamalar' },
  stadium: { path: (id) => `/maydonlar/${id}` },
  user: { path: (id) => `/foydalanuvchilar/${id}` },
  booking: { path: (id) => `/bronlar?bron=${id}`, needs: BOOKING_DETAIL },
  game: { path: (id) => `/bronlar?tab=oyinlar&oyin=${id}`, needs: GAME_DETAIL },
  payment: { path: (id) => `/tolovlar?tolov=${id}`, needs: PAYMENT_DETAIL },
}

export function entityPath(type: string | undefined, id: string | undefined): string | null {
  if (!type) return null
  const entry = ENTITY_PATHS[type]
  if (!entry || (entry.needs && !isAvailable(entry.needs))) return null
  // Settings has one page; everything else needs the id.
  if (!id && type !== 'platform_settings') return null
  return entry.path(id ?? '')
}
