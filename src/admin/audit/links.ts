/**
 * Where an audit entry's object opens in the panel. Only entity types whose
 * page exists are listed; anything else is shown as plain text.
 */
const ENTITY_PATHS: Record<string, (id: string) => string> = {
  platform_settings: () => '/sozlamalar',
  stadium: (id) => `/maydonlar/${id}`,
  user: (id) => `/foydalanuvchilar/${id}`,
}

export function entityPath(type: string | undefined, id: string | undefined): string | null {
  if (!type) return null
  const path = ENTITY_PATHS[type]
  // Settings has one page; everything else needs the id.
  if (!path || (!id && type !== 'platform_settings')) return null
  return path(id ?? '')
}
