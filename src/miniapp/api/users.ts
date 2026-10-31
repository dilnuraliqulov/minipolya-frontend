import { api } from '../../shared/api'

/** `UserResponse` (api-reference §3). Fields omitted when null are optional. */
export interface User {
  id: string
  /** Absent for a Telegram-created user who never set one. `+998XXXXXXXXX`. */
  phone?: string
  name: string
  telegramId?: number
  /** `uz` | `ru` | `en` */
  language: string
  isOwner: boolean
  isAdmin: boolean
  username?: string
  /** UTC */
  createdAt: string
  /** R20 — set only by the user, never from Telegram. Not sent by the backend yet. */
  firstName?: string
  /** R20 — same rule as `firstName`. */
  lastName?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const AUTH_TELEGRAM = 'POST /api/auth/telegram'
export const USERS_ME = 'GET /api/users/me'
/** R20: PATCH /api/users/me accepting firstName, lastName and phone. */
export const PROFILE_FIELDS = 'PATCH /api/users/me firstName, lastName, phone'

export function loginWithTelegram(initData: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/telegram', { initData })
}

export function getMe(): Promise<User> {
  return api.get<User>('/api/users/me')
}

/** Fields `PATCH /api/users/me` accepts today. */
export interface UpdateUserRequest {
  name?: string
  language?: string
}

export function updateMe(body: UpdateUserRequest): Promise<User> {
  return api.patch<User>('/api/users/me', body)
}

/** R20's requested contract — only call when `isAvailable(PROFILE_FIELDS)`. */
export interface UpdateProfileRequest {
  firstName: string
  lastName: string
  /** `+998XXXXXXXXX` */
  phone: string
}

export function updateProfile(body: UpdateProfileRequest): Promise<User> {
  return api.patch<User>('/api/users/me', body)
}
