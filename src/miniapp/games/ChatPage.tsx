import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { formatTime } from '../../shared/format'
import { errorMessage } from '../api/errors'
import {
  gameKey,
  getGame,
  getMessages,
  MESSAGE_MAX,
  messagesKey,
  sendMessage,
  type GameMessage,
} from '../api/games'
import { useLoginUser } from '../auth/sessionContext'
import { cx, EmptyState, ErrorState, Header, Screen, SkeletonList, useToast } from '../components'
import { useGoBack } from '../lib/useGoBack'

/** How often an open chat asks for new messages (no push channel exists). */
const REFRESH_MS = 5000

/** Chat: the two captains of a confirmed team game. */
export function ChatPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack(`/games/${id}`)
  const me = useLoginUser()
  const toast = useToast()
  const queryClient = useQueryClient()
  // The game is re-read too: chat closes the moment the game stops being confirmed.
  const game = useQuery({
    queryKey: gameKey(id),
    queryFn: () => getGame(id),
    refetchInterval: REFRESH_MS,
  })
  const open = game.data?.status === 'confirmed'
  // The API refuses messages (400) for a game that is not confirmed: do not ask.
  const messages = useQuery({
    queryKey: messagesKey(id),
    queryFn: () => getMessages(id),
    enabled: open,
    refetchInterval: open ? REFRESH_MS : false,
  })
  const [text, setText] = useState('')
  const send = useMutation({
    mutationFn: (message: string) => sendMessage(id, message),
    onSuccess: () => {
      setText('')
      void queryClient.invalidateQueries({ queryKey: messagesKey(id) })
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  const bottom = useRef<HTMLDivElement>(null)
  // Newest first from the API → oldest at the top, like any chat.
  const list = [...(messages.data?.content ?? [])].reverse()
  const lastId = list.at(-1)?.id
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end' })
  }, [lastId])

  const teams = game.data?.teams ?? []
  const subtitle = teams
    .map((x) => x.teamName)
    .filter(Boolean)
    .join(` ${t('game.vs')} `)
  const trimmed = text.trim()
  const footer = (
    <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-bar px-4 pt-3 pb-[max(12px,var(--tg-safe-bottom))]">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (trimmed && open) send.mutate(trimmed)
        }}
      >
        <input
          aria-label={t('chat.input')}
          value={text}
          maxLength={MESSAGE_MAX}
          disabled={!open}
          placeholder={t('chat.placeholder')}
          onChange={(event) => setText(event.target.value)}
          className="min-h-11 flex-1 rounded-full border border-border bg-surface px-4 text-base text-primary disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label={t('chat.send')}
          disabled={!open || !trimmed || send.isPending}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent disabled:opacity-50"
        >
          <SendHorizontal size={20} aria-hidden />
        </button>
      </form>
    </div>
  )

  return (
    <Screen header={<Header title={t('chat.title')} onBack={goBack} />} footer={footer}>
      {subtitle && <p className="text-center text-sm text-secondary">{subtitle}</p>}
      {game.isPending ? (
        <SkeletonList count={4} variant="item" />
      ) : game.isError ? (
        <ErrorState onRetry={() => void game.refetch()} />
      ) : !open ? (
        <EmptyState icon={MessageCircle} title={t('chat.closed')} />
      ) : messages.isPending ? (
        <SkeletonList count={4} variant="item" />
      ) : messages.isError ? (
        <ErrorState onRetry={() => void messages.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t('chat.emptyTitle')}
          description={t('chat.emptyText')}
        />
      ) : (
        <ol className="flex flex-col gap-3" aria-label={t('chat.title')}>
          {list.map((message) => (
            <Bubble key={message.id} message={message} mine={message.userId === me.id} />
          ))}
        </ol>
      )}
      <div ref={bottom} />
    </Screen>
  )
}

function Bubble({ message, mine }: { message: GameMessage; mine: boolean }) {
  const { t } = useTranslation()
  return (
    <li className={cx('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      {!mine && (
        <span className="px-1 text-xs font-semibold text-secondary">
          {message.userName ?? t('team.anonymous')}
        </span>
      )}
      <p
        className={cx(
          'max-w-[80%] rounded-2xl px-4 py-2 text-base break-words whitespace-pre-wrap',
          mine ? 'bg-accent text-on-accent' : 'border border-border bg-background text-primary',
        )}
      >
        {message.message}
      </p>
      <span className="px-1 text-2xs text-secondary">
        {mine ? `${t('chat.you')} · ` : ''}
        {formatTime(message.createdAt)}
      </span>
    </li>
  )
}
