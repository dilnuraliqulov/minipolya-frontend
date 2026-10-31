import type { User } from '../api/users'

/**
 * Complete = the user entered a first name, a last name and a phone
 * themselves (R20). `name` does not count: the backend fills it from Telegram.
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
