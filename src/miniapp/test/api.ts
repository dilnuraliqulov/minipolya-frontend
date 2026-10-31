import { vi } from 'vitest'
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

type Reply = ((body: unknown) => unknown) | Response | object | string | number | boolean | null

/**
 * Stubs `fetch` with a table of `'METHOD /path'` → reply (data for a 200, a
 * Response, or a function of the JSON body). Unlisted requests answer 404.
 * Returns the mock; `calls(key)` lists the JSON bodies sent to one route.
 */
export function stubApi(routes: Record<string, Reply>) {
  const sent: Array<{ key: string; body: unknown }> = []
  const mock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input)
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    sent.push({ key, body })
    if (!(key in routes)) return jsonResponse(404, null, 'Not found')
    const route = routes[key]
    const reply = typeof route === 'function' ? (route as (b: unknown) => unknown)(body) : route
    return reply instanceof Response ? reply : jsonResponse(200, reply)
  })
  vi.stubGlobal('fetch', mock)
  return Object.assign(mock, {
    calls: (key: string) => sent.filter((call) => call.key === key).map((call) => call.body),
  })
}
