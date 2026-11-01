import { api } from '../../../shared/api'
import type { AuthResponse } from '../../api/users'

/** Dev-profile backend only (api-reference "Dev-only sign-in", R19). */
export interface DevUser {
  id: string
  name: string
  isOwner: boolean
  isAdmin: boolean
  isBlocked: boolean
}

function devHeaders(): Record<string, string> {
  return { 'X-Dev-Login-Key': import.meta.env.VITE_DEV_LOGIN_KEY ?? '' }
}

export function listDevUsers(): Promise<DevUser[]> {
  return api.get<DevUser[]>('/api/auth/dev/users', { headers: devHeaders() })
}

export function devLogin(userId: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/dev/login', { userId }, { headers: devHeaders() })
}
