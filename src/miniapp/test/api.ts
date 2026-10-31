import type { User } from '../api/users'

/** A Response carrying the backend's `{ success, data, message, code? }` envelope. */
export function jsonResponse(status: number, data: unknown, message?: string, code?: string) {
  const ok = status >= 200 && status < 300
  return new Response(
    JSON.stringify({ success: ok, data, message: message ?? null, ...(code ? { code } : {}) }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

/** An unsigned JWT-shaped string with the given claims (the client never checks signatures). */
export function fakeJwt(claims: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`
}

/** A `UserResponse` for tests; override what the test is about. */
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '018f3a2c-0000-7000-8000-000000000001',
    name: 'Test User',
    language: 'uz',
    isOwner: false,
    isAdmin: false,
    createdAt: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}
