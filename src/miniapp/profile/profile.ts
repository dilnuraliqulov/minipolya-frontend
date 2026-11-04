import type { OwnerStadium } from '../api/owner'
import type { User } from '../api/users'

/**
 * Complete = the user entered a first name, a last name and a phone
 * themselves. `name` does not count: the backend fills it from Telegram.
 */
export function isProfileComplete(user: User): boolean {
  return Boolean(user.firstName && user.lastName && user.phone)
}

/** "Aziz Karimov" → "AK" (the avatar). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export type OwnerState = 'none' | 'review' | 'owner'

/**
 * The card's state from the API: an owner (the token's role) with an approved
 * or blocked stadium → "Ega rejimiga oʻtish"; a stadium waiting for review →
 * "Koʻrib chiqilmoqda"; otherwise (none, or only rejected) → "Maydon qoʻshish".
 */
export function ownerState(user: User, stadiums: OwnerStadium[]): OwnerState {
  if (user.isOwner && stadiums.some((s) => s.status === 'approved' || s.status === 'blocked')) {
    return 'owner'
  }
  if (stadiums.some((s) => s.status === 'pending')) return 'review'
  return 'none'
}
