import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useUnreadCount } from './queries'

/** The home header's bell: opens Bildirishnomalar, with the unread count on it. */
export function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const unread = useUnreadCount()
  const count = unread.data?.count ?? 0
  const label =
    count > 0
      ? `${t('notifications.title')} · ${t('notifications.unreadValue', { count })}`
      : t('notifications.title')
  return (
    <button
      type="button"
      onClick={() => navigate('/profile/notifications')}
      aria-label={label}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-link"
    >
      <Bell size={20} aria-hidden />
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent"
          aria-hidden
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
