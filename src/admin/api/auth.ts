import { api } from '../../shared/api'
import type { AuthResponse, User } from './types'

/** Mini App login (§2). The admin panel uses it in development only, via VITE_DEV_INIT_DATA. */
export function loginWithInitData(initData: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/telegram', { initData })
}

/** What the Telegram Login Widget passes to its `data-onauth` callback. */
export interface TelegramWidgetUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * NOT IN THE BACKEND YET — requested as R2 in docs/backend-requests.md (api-reference Q2).
 * Built against the requested shape so the admin login works once it ships;
 * until then this answers 404 and the login page says so.
 */
export const WIDGET_LOGIN_PATH = '/api/auth/telegram-widget'

export function loginWithWidget(user: TelegramWidgetUser): Promise<AuthResponse> {
  return api.post<AuthResponse>(WIDGET_LOGIN_PATH, user)
}

export function getMe(): Promise<User> {
  return api.get<User>('/api/users/me')
}
