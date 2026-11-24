import type { TFunction } from 'i18next'
import { tashkentToday, toTashkentParts } from '../../../shared/format'
import type { GameMessage } from '../../api/games'
import { MONTH_KEYS } from '../../format'

/** How a message Claude's optimistic send is standing at. */
export type SendState = 'sending' | 'failed'

/**
 * A message in the chat: one the server returned, or one the viewer has just
 * written and which has not landed yet (`state`, and a local id).
 */
export interface ChatMessage extends GameMessage {
  state?: SendState
}

/** Consecutive messages from one sender, shown under one name and team badge. */
export interface ChatRun {
  key: string
  mine: boolean
  userId?: string
  name?: string
  teamName?: string
  teamLevel?: string
  messages: ChatMessage[]
}

/** What the chat draws, top to bottom. */
export type ChatRow =
  | { kind: 'day'; key: string; date: string }
  | { kind: 'system'; key: string; message: ChatMessage }
  | { kind: 'run'; key: string; run: ChatRun }

/** A new run starts after this long, even from the same sender. */
const RUN_GAP_MS = 5 * 60 * 1000

/**
 * The chat's rows from its messages, **oldest first**: a day separator whenever
 * the Tashkent date changes, a row of its own for every system line, and a run
 * for each stretch of messages from one sender — broken by a different sender,
 * by a system line between them, or by a gap of more than five minutes, so a
 * conversation picked up an hour later does not read as one breath.
 */
export function chatRows(messages: ChatMessage[], meId: string): ChatRow[] {
  const rows: ChatRow[] = []
  let day: string | undefined
  let run: ChatRun | undefined

  for (const message of messages) {
    const date = tashkentToday(new Date(message.createdAt))
    if (date !== day) {
      day = date
      run = undefined
      rows.push({ kind: 'day', key: `day-${date}`, date })
    }
    if (message.kind === 'system') {
      run = undefined
      rows.push({ kind: 'system', key: message.id, message })
      continue
    }
    const last = run?.messages.at(-1)
    const tooLate =
      last !== undefined &&
      new Date(message.createdAt).getTime() - new Date(last.createdAt).getTime() > RUN_GAP_MS
    if (!run || run.userId !== message.userId || tooLate) {
      run = {
        key: message.id,
        mine: message.userId === meId,
        userId: message.userId,
        name: message.userName,
        teamName: message.teamName,
        teamLevel: message.teamLevel,
        messages: [],
      }
      rows.push({ kind: 'run', key: run.key, run })
    }
    run.messages.push(message)
  }
  return rows
}

/** "Bugun" · "Kecha" · "18-noyabr" — a Tashkent date, in the reader's language. */
export function dayLabel(t: TFunction, date: string, today = tashkentToday()): string {
  if (date === today) return t('chat.today')
  if (date === dayBefore(today)) return t('chat.yesterday')
  const { day, month } = toTashkentParts(`${date}T12:00:00Z`)
  return t('format.dayMonth', { day, month: t(MONTH_KEYS[month - 1] ?? MONTH_KEYS[0]) })
}

/** The calendar day before this one, as a Tashkent date string. */
function dayBefore(date: string): string {
  const at = new Date(`${date}T12:00:00Z`)
  at.setUTCDate(at.getUTCDate() - 1)
  return tashkentToday(at)
}

/** What a system line says, worded here rather than stored in the message. */
export function systemText(t: TFunction, message: ChatMessage): string {
  if (message.event === 'team_joined') {
    return t('chat.system.teamJoined', { team: message.eventTeamName ?? t('team.anonymous') })
  }
  if (message.event === 'game_confirmed') return t('chat.system.gameConfirmed')
  return ''
}
