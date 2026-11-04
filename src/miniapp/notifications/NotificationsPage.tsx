import { Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { formatTime } from '../../shared/format'
import type { AppNotification } from '../api/notifications'
import { errorMessage } from '../api/errors'
import {
  Button,
  Card,
  cx,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  useToast,
} from '../components'
import { formatLongDate } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { useMarkRead, useNotifications } from './queries'

/** Known `Notification.Type` values → their translated title. Others fall back to a generic one. */
const TYPE_KEYS = {
  booking_confirmed: 'notifications.types.booking_confirmed',
  booking_cancelled: 'notifications.types.booking_cancelled',
  booking_reminder: 'notifications.types.booking_reminder',
  booking_expired: 'notifications.types.booking_expired',
  game_confirmed: 'notifications.types.game_confirmed',
  game_cancelled: 'notifications.types.game_cancelled',
  game_player_joined: 'notifications.types.game_player_joined',
  game_player_left: 'notifications.types.game_player_left',
  game_payment_received: 'notifications.types.game_payment_received',
  game_opponent_left: 'notifications.types.game_opponent_left',
  review_reply: 'notifications.types.review_reply',
  stadium_approved: 'notifications.types.stadium_approved',
  stadium_rejected: 'notifications.types.stadium_rejected',
  owner_application_status: 'notifications.types.owner_application_status',
  promotion_new: 'notifications.types.promotion_new',
} as const

function titleKey(type: string) {
  return type in TYPE_KEYS
    ? TYPE_KEYS[type as keyof typeof TYPE_KEYS]
    : ('notifications.types.other' as const)
}

/** Where tapping a notification goes, by its reference. */
function targetOf(item: AppNotification): string | null {
  if (!item.referenceId) return null
  switch (item.referenceType) {
    case 'booking':
      return `/bookings/${item.referenceId}`
    case 'game':
      return `/games/${item.referenceId}`
    case 'stadium':
      // Approved/rejected news is about the user's own stadium: its state is on Profil.
      return item.type.startsWith('stadium_') ? '/profile' : `/stadiums/${item.referenceId}`
    default:
      return null
  }
}

/**
 * Profil → Bildirishnomalar: GET /api/notifications, newest first. Titles come
 * from the notification `type` (the backend's own text is not translated).
 * Opening one marks it read; the header's ✓✓ marks all read.
 */
export function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useGoBack('/profile')
  const toast = useToast()
  const list = useNotifications()
  const mark = useMarkRead()
  const items = list.data?.pages.flatMap((page) => page.content) ?? []
  const hasUnread = items.some((item) => !item.isRead)

  const open = (item: AppNotification) => {
    if (!item.isRead) mark.one.mutate(item.id)
    const target = targetOf(item)
    if (target) navigate(target)
  }

  return (
    <Screen
      header={
        <Header
          title={t('notifications.title')}
          onBack={goBack}
          action={
            hasUnread ? (
              <button
                type="button"
                aria-label={t('notifications.readAll')}
                disabled={mark.all.isPending}
                onClick={() =>
                  mark.all.mutate(undefined, {
                    onError: (error) => toast.show(errorMessage(error), 'danger'),
                  })
                }
                className="flex size-11 items-center justify-center text-link disabled:opacity-60"
              >
                <CheckCheck size={22} aria-hidden />
              </button>
            ) : undefined
          }
        />
      }
    >
      {list.isPending ? (
        <SkeletonList />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={Bell}
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyText')}
          />
        </div>
      ) : (
        <>
          <Card>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => open(item)}
                className="flex min-h-13 w-full items-start gap-3 border-b border-border p-4 text-left last:border-b-0 active:bg-hover"
              >
                <span
                  className={cx(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    item.isRead ? 'bg-transparent' : 'bg-accent',
                  )}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={cx(
                      'text-md text-primary',
                      item.isRead ? 'font-medium' : 'font-semibold',
                    )}
                  >
                    {t(titleKey(item.type))}
                    {!item.isRead && (
                      <span className="sr-only"> · {t('notifications.unread')}</span>
                    )}
                  </span>
                  <span className="text-xs text-secondary">
                    {formatLongDate(item.createdAt)}, {formatTime(item.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </Card>
          {list.hasNextPage && (
            <Button
              variant="secondary"
              loading={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {t('stadiums.more')}
            </Button>
          )}
        </>
      )}
    </Screen>
  )
}
