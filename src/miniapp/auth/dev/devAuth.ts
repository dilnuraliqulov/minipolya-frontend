import { api } from '../../../shared/api'
import type { AuthResponse } from '../../api/users'

/**
 * Dev-profile backend only (api-reference "Dev-only sign-in", R19). Both calls need
 * `X-Dev-Login-Key` = the backend's `DEV_LOGIN_KEY` (R26); without it they answer 404.
 */
export interface DevUser {
  id: string
  name: string
  isOwner: boolean
  isAdmin: boolean
  isBlocked: boolean
}

function devHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_DEV_LOGIN_KEY
  return key ? { 'X-Dev-Login-Key': key } : {}
}

export function listDevUsers(): Promise<DevUser[]> {
  return api.get<DevUser[]>('/api/auth/dev/users', { headers: devHeaders() })
}

export function devLogin(userId: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/dev/login', { userId }, { headers: devHeaders() })
}
