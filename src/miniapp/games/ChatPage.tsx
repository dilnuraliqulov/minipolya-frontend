import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ChevronRight, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { formatTime } from '../../shared/format'
import { errorMessage } from '../api/errors'
import { gameKey, getGame, getMessages, MESSAGE_MAX, messagesKey, sendMessage } from '../api/games'
import { useLoginUser } from '../auth/sessionContext'
import { EmptyState, ErrorState, Header, Screen, SkeletonList, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'
import { TeamLevelBadge } from '../teams/TeamLevelBadge'
import { Composer } from './chat/Composer'
import { DaySeparator, MessageGroup, SystemLine } from './chat/MessageGroup'
import { chatRows, dayLabel, type ChatMessage } from './chat/groups'

/** How often an open, visible chat asks for new messages (no push channel exists). */
const REFRESH_MS = 5000

/** Within this many pixels of the bottom still counts as "at the bottom". */
const AT_BOTTOM_PX = 80

/**
 * True while the tab is actually being looked at. Polling a chat nobody can see
 * is work the phone pays for and the reader never sees, so it stops when the
 * app goes to the background and starts again on the way back.
 */
function useVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  )
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

/** Chat: the two captains of a confirmed team game. */
export function ChatPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack(`/games/${id}`)
  const me = useLoginUser()
  const toast = useToast()
  const queryClient = useQueryClient()
  const visible = useVisible()
  // The game is re-read too: chat closes the moment the game stops being confirmed.
  const game = useQuery({
    queryKey: gameKey(id),
    queryFn: () => getGame(id),
    refetchInterval: visible ? REFRESH_MS : false,
  })
  const open = game.data?.status === 'confirmed'
  // The API refuses messages (400) for a game that is not confirmed: do not ask.
  const history = useInfiniteQuery({
    queryKey: messagesKey(id),
    queryFn: ({ pageParam }) => getMessages(id, pageParam),
    initialPageParam: undefined as string | undefined,
    // Each page is newest-first, so the oldest message of the last page is the
    // cursor for the one before it. An empty or short page means there is no more.
    getNextPageParam: (last) =>
      last.content.length < last.size ? undefined : last.content.at(-1)?.createdAt,
    enabled: open,
    refetchInterval: open && visible ? REFRESH_MS : false,
  })

  const [text, setText] = useState('')
  const [pending, setPending] = useState<ChatMessage[]>([])
  const send = useMutation({
    mutationFn: ({ message }: { localId: string; message: string }) => sendMessage(id, message),
    onSuccess: (_saved, variables) => {
      setPending((old) => old.filter((x) => x.id !== variables.localId))
      void queryClient.invalidateQueries({ queryKey: messagesKey(id) })
    },
    onError: (error, variables) => {
      setPending((old) =>
        old.map((x) => (x.id === variables.localId ? { ...x, state: 'failed' } : x)),
      )
      toast.show(errorMessage(error), 'danger')
    },
  })

  const submit = useCallback(
    (message: string, localId = `local-${Date.now()}`) => {
      setPending((old) => [
        ...old.filter((x) => x.id !== localId),
        {
          id: localId,
          gameId: id,
          userId: me.id,
          userName: me.name,
          message,
          createdAt: new Date().toISOString(),
          kind: 'user',
          state: 'sending',
        },
      ])
      send.mutate({ localId, message })
    },
    [id, me.id, me.name, send],
  )

  const retry = useCallback(
    (localId: string) => {
      const failed = pending.find((x) => x.id === localId)
      if (failed) submit(failed.message, localId)
    },
    [pending, submit],
  )

  // Newest first from the API, page by page → oldest at the top, like any chat.
  const messages = useMemo(() => {
    const loaded = (history.data?.pages ?? []).flatMap((page) => page.content)
    const byNewest = [...loaded].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return [...byNewest, ...pending]
  }, [history.data, pending])
  const rows = useMemo(() => chatRows(messages, me.id), [messages, me.id])

  // The page itself scrolls, as every screen here does — there is no inner
  // scroller to fight the sticky composer or Telegram's own gestures.
  const atBottom = useRef(true)
  const [unseen, setUnseen] = useState(false)
  const lastId = messages.at(-1)?.id

  const toBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
    atBottom.current = true
    setUnseen(false)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const bottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      atBottom.current = bottom <= AT_BOTTOM_PX
      if (atBottom.current) setUnseen(false)
      if (window.scrollY <= 0 && history.hasNextPage && !history.isFetchingNextPage) {
        // Keep the reader's place: what they are looking at must not jump.
        const before = document.documentElement.scrollHeight
        void history.fetchNextPage().then(() => {
          window.scrollTo({ top: document.documentElement.scrollHeight - before })
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [history])

  // A new message scrolls the chat only for a reader who is already at the
  // bottom; anyone reading further up is told instead, and decides themselves.
  useEffect(() => {
    if (!lastId) return
    if (atBottom.current) toBottom()
    else setUnseen(true)
  }, [lastId, toBottom])

  const teams = game.data?.teams ?? []
  const maxLength = game.data?.chatMessageMaxLength ?? MESSAGE_MAX

  const header = (
    <Header
      title={t('chat.title')}
      onBack={goBack}
      action={
        <Link
          to={`/games/${id}`}
          aria-label={t('chat.openGame')}
          className="flex size-11 items-center justify-center text-link"
        >
          <ChevronRight size={22} aria-hidden />
        </Link>
      }
    />
  )

  return (
    <Screen
      header={header}
      footer={
        <Composer
          value={text}
          onChange={setText}
          maxLength={maxLength}
          disabled={!open}
          onSend={() => {
            const trimmed = text.trim()
            if (!trimmed) return
            setText('')
            submit(trimmed)
          }}
        />
      }
    >
      {teams.length > 0 && (
        <Link
          to={`/games/${id}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-surface px-3 py-2 text-center"
        >
          <span className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {teams.map((team, index) => (
              <span key={team.teamId} className="flex items-center gap-1">
                {index > 0 && <span className="text-xs text-secondary">{t('game.vs')}</span>}
                <span className="truncate text-sm font-semibold text-primary">
                  {team.teamName ?? t('team.anonymous')}
                </span>
                <TeamLevelBadge level={team.teamLevel} />
              </span>
            ))}
            {game.data && (
              <span className="text-xs text-secondary">{formatTime(game.data.startsAt)}</span>
            )}
          </span>
        </Link>
      )}

      <div className="flex flex-1 flex-col">
        {game.isPending ? (
          <SkeletonList count={4} variant="item" />
        ) : game.isError ? (
          <ErrorState onRetry={() => void game.refetch()} />
        ) : !open ? (
          <EmptyState icon={MessageCircle} title={t('chat.closed')} />
        ) : history.isPending ? (
          <SkeletonList count={4} variant="item" />
        ) : history.isError ? (
          <ErrorState onRetry={() => void history.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={t('chat.emptyTitle')}
            description={t('chat.emptyText')}
          />
        ) : (
          <ol className="flex flex-col gap-3 py-2" aria-label={t('chat.title')}>
            {history.isFetchingNextPage && (
              <li className="py-1 text-center text-xs text-secondary">{t('chat.older')}</li>
            )}
            {rows.map((row) =>
              row.kind === 'day' ? (
                <DaySeparator key={row.key} label={dayLabel(t, row.date)} />
              ) : row.kind === 'system' ? (
                <SystemLine key={row.key} message={row.message} />
              ) : (
                <MessageGroup key={row.key} run={row.run} onRetry={retry} />
              ),
            )}
          </ol>
        )}
      </div>

      {unseen && (
        <button
          type="button"
          onClick={() => toBottom('smooth')}
          className="sticky bottom-4 z-10 mx-auto flex min-h-11 items-center gap-2 self-center rounded-full bg-accent px-4 text-sm font-semibold text-on-accent shadow-lg"
        >
          {t('chat.newMessages')}
          <ArrowDown size={16} aria-hidden />
        </button>
      )}
    </Screen>
  )
}
