import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import type { ChatMessage } from './groups'
import { chatRows, dayLabel, systemText } from './groups'

const ME = 'u-me'
const THEM = 'u-them'

function message(overrides: Partial<ChatMessage> & { id: string; createdAt: string }): ChatMessage {
  return {
    gameId: 'g1',
    userId: THEM,
    userName: 'Rustam',
    message: 'hi',
    kind: 'user',
    ...overrides,
  }
}

describe('grouping the chat', () => {
  it('keeps one sender’s run together', () => {
    const rows = chatRows(
      [
        message({ id: 'm1', createdAt: '2026-11-19T10:00:00Z' }),
        message({ id: 'm2', createdAt: '2026-11-19T10:01:00Z' }),
      ],
      ME,
    )

    expect(rows.filter((row) => row.kind === 'run')).toHaveLength(1)
    expect(rows.find((row) => row.kind === 'run')?.run.messages).toHaveLength(2)
  })

  it('starts a new run for a different sender, and knows which is mine', () => {
    const rows = chatRows(
      [
        message({ id: 'm1', createdAt: '2026-11-19T10:00:00Z' }),
        message({ id: 'm2', createdAt: '2026-11-19T10:01:00Z', userId: ME, userName: 'Me' }),
      ],
      ME,
    )

    const runs = rows.flatMap((row) => (row.kind === 'run' ? [row.run] : []))
    expect(runs).toHaveLength(2)
    expect(runs[0]?.mine).toBe(false)
    expect(runs[1]?.mine).toBe(true)
  })

  it('starts a new run after a gap of more than five minutes', () => {
    const rows = chatRows(
      [
        message({ id: 'm1', createdAt: '2026-11-19T10:00:00Z' }),
        message({ id: 'm2', createdAt: '2026-11-19T10:06:00Z' }),
      ],
      ME,
    )

    expect(rows.filter((row) => row.kind === 'run')).toHaveLength(2)
  })

  it('separates the days, in Tashkent time', () => {
    const rows = chatRows(
      [
        message({ id: 'm1', createdAt: '2026-11-18T10:00:00Z' }),
        message({ id: 'm2', createdAt: '2026-11-19T10:00:00Z' }),
      ],
      ME,
    )

    const days = rows.flatMap((row) => (row.kind === 'day' ? [row.date] : []))
    expect(days).toEqual(['2026-11-18', '2026-11-19'])
  })

  it('gives a system line a row of its own and breaks the run around it', () => {
    const rows = chatRows(
      [
        message({ id: 'm1', createdAt: '2026-11-19T10:00:00Z' }),
        message({
          id: 's1',
          createdAt: '2026-11-19T10:01:00Z',
          kind: 'system',
          userId: undefined,
          userName: undefined,
          event: 'game_confirmed',
        }),
        message({ id: 'm2', createdAt: '2026-11-19T10:02:00Z' }),
      ],
      ME,
    )

    expect(rows.map((row) => row.kind)).toEqual(['day', 'run', 'system', 'run'])
  })

  it('carries the sender’s team and level on the run', () => {
    const rows = chatRows(
      [
        message({
          id: 'm1',
          createdAt: '2026-11-19T10:00:00Z',
          teamName: 'Delta FC',
          teamLevel: 'professional',
        }),
      ],
      ME,
    )

    const run = rows.find((row) => row.kind === 'run')?.run
    expect(run?.teamName).toBe('Delta FC')
    expect(run?.teamLevel).toBe('professional')
  })
})

describe('the day separator’s words', () => {
  it('says Bugun, Kecha, or the date itself', () => {
    const t = i18n.t.bind(i18n)

    expect(dayLabel(t, '2026-11-19', '2026-11-19')).toBe('Bugun')
    expect(dayLabel(t, '2026-11-18', '2026-11-19')).toBe('Kecha')
    expect(dayLabel(t, '2026-11-12', '2026-11-19')).toBe('12-noyabr')
  })
})

describe('what a system line says', () => {
  it('words the event in the reader’s language', () => {
    const t = i18n.t.bind(i18n)

    expect(
      systemText(
        t,
        message({
          id: 's1',
          createdAt: '2026-11-19T10:00:00Z',
          kind: 'system',
          event: 'game_confirmed',
        }),
      ),
    ).toBe('Oʻyin tasdiqlandi')
    expect(
      systemText(
        t,
        message({
          id: 's2',
          createdAt: '2026-11-19T10:00:00Z',
          kind: 'system',
          event: 'team_joined',
          eventTeamName: 'Delta FC',
        }),
      ),
    ).toBe('Delta FC qoʻshildi')
  })

  it('says nothing for an event it does not know', () => {
    const t = i18n.t.bind(i18n)

    expect(
      systemText(
        t,
        message({
          id: 's3',
          createdAt: '2026-11-19T10:00:00Z',
          kind: 'system',
          event: 'something_new',
        }),
      ),
    ).toBe('')
  })
})
