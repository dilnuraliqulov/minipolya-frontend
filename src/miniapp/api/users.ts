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
  /** Set only by the user (PATCH /api/users/me), never from Telegram; absent until then. */
  firstName?: string
  /** Same rule as `firstName`. */
  lastName?: string
}

export interface AuthResponse {
  token: string
  user: User
}

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
  /** `+998XXXXXXXXX`; 409 `code: PHONE_TAKEN` when another account has it. */
  phone?: string
}

export function updateMe(body: UpdateUserRequest): Promise<User> {
  return api.patch<User>('/api/users/me', body)
}

/**
 * The profile fields of PATCH /api/users/me. 400 on a bad value; 409
 * `code: PHONE_TAKEN` when another account has the phone.
 */
export interface UpdateProfileRequest {
  firstName: string
  lastName: string
  /** `+998XXXXXXXXX` */
  phone: string
}

export function updateProfile(body: UpdateProfileRequest): Promise<User> {
  return api.patch<User>('/api/users/me', body)
}
