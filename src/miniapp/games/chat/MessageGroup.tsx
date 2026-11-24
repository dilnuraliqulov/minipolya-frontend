import { useTranslation } from 'react-i18next'
import { formatTime } from '../../../shared/format'
import { cx } from '../../components'
import { TeamLevelBadge } from '../../teams/TeamLevelBadge'
import type { ChatMessage, ChatRun } from './groups'
import { systemText } from './groups'

/**
 * One sender's run of messages: their name and a small badge for the team they
 * speak for, above the first bubble; the time under the last. Own messages sit
 * on the right in the accent colour, everyone else's on the left.
 *
 * Message text is rendered as text and never as markup, and a link in it is
 * shown as the characters the sender typed — nothing in a chat opens anything.
 */
export function MessageGroup({ run, onRetry }: { run: ChatRun; onRetry: (id: string) => void }) {
  const { t } = useTranslation()
  const last = run.messages.at(-1)
  return (
    <li className={cx('flex flex-col gap-1', run.mine ? 'items-end' : 'items-start')}>
      {!run.mine && (
        <span className="flex max-w-[85%] items-center gap-2 px-1">
          <span className="truncate text-xs font-semibold text-secondary">
            {run.name ?? t('team.anonymous')}
          </span>
          {run.teamName && (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-2xs text-secondary">{run.teamName}</span>
              <TeamLevelBadge level={run.teamLevel} />
            </span>
          )}
        </span>
      )}
      {run.messages.map((message) => (
        <Bubble
          key={message.id}
          message={message}
          mine={run.mine}
          onRetry={() => onRetry(message.id)}
        />
      ))}
      {last && (
        <span className="px-1 text-2xs text-secondary">
          {last.state === 'sending'
            ? t('chat.sending')
            : last.state === 'failed'
              ? t('chat.failed')
              : formatTime(last.createdAt)}
        </span>
      )}
    </li>
  )
}

function Bubble({
  message,
  mine,
  onRetry,
}: {
  message: ChatMessage
  mine: boolean
  onRetry: () => void
}) {
  const failed = message.state === 'failed'
  const body = <span className="block break-words whitespace-pre-wrap">{message.message}</span>
  const className = cx(
    'max-w-[85%] rounded-2xl px-4 py-2 text-base',
    mine ? 'bg-accent text-on-accent' : 'border border-border bg-background text-primary',
    message.state === 'sending' && 'opacity-60',
    failed && 'border border-danger-text',
  )
  if (!failed) {
    return <p className={className}>{body}</p>
  }
  return (
    <button type="button" onClick={onRetry} className={cx(className, 'text-left')}>
      {body}
    </button>
  )
}

/** "Oʻyin tasdiqlandi", "<jamoa> qoʻshildi": the platform's own lines, centred and quiet. */
export function SystemLine({ message }: { message: ChatMessage }) {
  const { t } = useTranslation()
  const text = systemText(t, message)
  if (!text) return null
  return (
    <li className="flex justify-center">
      <span className="rounded-full bg-surface px-3 py-1 text-center text-xs text-secondary">
        {text}
      </span>
    </li>
  )
}

/** "Bugun" · "Kecha" · "18-noyabr". */
export function DaySeparator({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-xs font-medium text-secondary">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </li>
  )
}
