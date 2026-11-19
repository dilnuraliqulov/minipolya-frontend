/**
 * The five backgrounds a team's avatar can take. All are design tokens whose
 * pairing with their text colour is already checked for contrast in both
 * themes, so a team's colour can never be the unreadable one.
 */
export const AVATAR_TONES = [
  'bg-accent-soft text-link-text',
  'bg-success-soft text-success-text',
  'bg-warning-soft text-warning-text',
  'bg-danger-soft text-danger-text',
  'bg-neutral-soft text-secondary',
] as const

/**
 * Which of the five a team gets — derived from its id, so the same team is
 * always the same colour on every screen and every device, with nothing stored.
 */
export function avatarTone(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000
  }
  return hash % AVATAR_TONES.length
}
