import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  NOTIFICATIONS_KEY,
  UNREAD_COUNT_KEY,
} from '../api/notifications'

/** There is no push channel (api-reference §10.3): the badge polls once a minute. */
const UNREAD_POLL_MS = 60_000

export function useUnreadCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadCount,
    refetchInterval: UNREAD_POLL_MS,
  })
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list'],
    queryFn: ({ pageParam }) => getNotifications(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}

/** Mark one or all read, then refresh the list and the badge. */
export function useMarkRead() {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
  return {
    one: useMutation({ mutationFn: markRead, onSettled: refresh }),
    all: useMutation({ mutationFn: markAllRead, onSettled: refresh }),
  }
}
