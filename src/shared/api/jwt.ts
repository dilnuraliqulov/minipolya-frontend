/**
 * Reads the claims of our backend's JWT (`sub`, `isOwner`, `isAdmin`, `exp`).
 *
 * The signature is NOT checked — only the server can do that. Use the claims
 * for client decisions only: skipping a request with an expired token, and
 * noticing that the role flags in the token disagree with /api/users/me
 * (the backend authorises by the token's claims, see api-reference Q11).
 */
export interface JwtClaims {
  sub?: string
  isOwner?: boolean
  isAdmin?: boolean
  /** Expiry, seconds since the epoch. */
  exp?: number
}

export function readJwtClaims(token: string): JwtClaims | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
    const claims: unknown = JSON.parse(json)
    return typeof claims === 'object' && claims !== null ? (claims as JwtClaims) : null
  } catch {
    return null
  }
}

/** True when the token has an `exp` claim in the past. */
export function isJwtExpired(claims: JwtClaims, nowMs = Date.now()): boolean {
  return claims.exp !== undefined && claims.exp * 1000 <= nowMs
}
