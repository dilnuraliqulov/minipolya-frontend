import { api } from '../../shared/api'
import type { AuthResponse, User } from './types'

/**
 * POST /api/auth/admin/login (§2). Admin accounts and passwords exist only in
 * the database; there is no register, reset or change-password endpoint the
 * panel uses. Errors carry a `code`: see `loginErrorMessage`.
 */
export function loginWithPassword(username: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/admin/login', { username, password })
}

export function getMe(): Promise<User> {
  return api.get<User>('/api/users/me')
}
