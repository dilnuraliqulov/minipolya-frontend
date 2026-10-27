import { describe, expect, it } from 'vitest'
import { isJwtExpired, readJwtClaims } from './jwt'

function token(claims: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`
}

describe('readJwtClaims', () => {
  it('reads the role flags and expiry', () => {
    expect(readJwtClaims(token({ sub: 'u1', isAdmin: true, isOwner: false, exp: 100 }))).toEqual({
      sub: 'u1',
      isAdmin: true,
      isOwner: false,
      exp: 100,
    })
  })

  it('returns null for something that is not a JWT', () => {
    expect(readJwtClaims('garbage')).toBeNull()
    expect(readJwtClaims('a.%%%.c')).toBeNull()
  })
})

describe('isJwtExpired', () => {
  it('compares exp with now', () => {
    expect(isJwtExpired({ exp: 100 }, 99_000)).toBe(false)
    expect(isJwtExpired({ exp: 100 }, 100_000)).toBe(true)
    expect(isJwtExpired({}, 100_000)).toBe(false)
  })
})
