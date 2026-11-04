import { api, type Page } from '../../shared/api'

/** `NotificationResponse` (api-reference §10.3). */
export interface AppNotification {
  id: string
  userId: string
  /** Lowercase `Notification.Type`, e.g. `booking_confirmed`. */
  type: string
  /** Backend prose in a mixed language — never shown; the title comes from `type`. */
  title: string
  message: string
  /** `booking` | `game` | `stadium` | `review` | `application` */
  referenceType?: string
  referenceId?: string
  isRead: boolean
  sentViaTelegram: boolean
  /** UTC */
  createdAt: string
}

export const NOTIFICATIONS_KEY = ['notifications'] as const
export const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const

export function getNotifications(page: number): Promise<Page<AppNotification>> {
  return api.get<Page<AppNotification>>(`/api/notifications?page=${page}&size=20`)
}

export function getUnreadCount(): Promise<{ count: number }> {
  return api.get<{ count: number }>('/api/notifications/unread-count')
}

export function markRead(id: string): Promise<null> {
  return api.put<null>(`/api/notifications/${id}/read`)
}

export function markAllRead(): Promise<null> {
  return api.put<null>('/api/notifications/read-all')
}
