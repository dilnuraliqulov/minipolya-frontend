import type { TFunction } from 'i18next'
import type { BadgeTone } from '../components'

/**
 * How seriously a team plays (backend changeset 054). The values are the
 * backend's, lowercase on the wire; the words shown come from the translations,
 * so a Russian reader sees Russian over the same value.
 *
 * A team created before levels existed has none, which reads as "not set". The
 * level never decides who may play whom — it only lets a captain see who they
 * are about to pay to play against.
 */
export const TEAM_LEVELS = ['havaskor', 'orta', 'professional'] as const

export type TeamLevel = (typeof TEAM_LEVELS)[number]

/** A value the backend sent, narrowed — anything unexpected counts as "not set". */
export function asTeamLevel(value: string | undefined): TeamLevel | undefined {
  return TEAM_LEVELS.find((level) => level === value)
}

/** "Oʻrta" — the level's name in the reader's language. */
export function levelLabel(t: TFunction, level: TeamLevel): string {
  return t(`team.level.${level}.name`)
}

/** The one line under the name on a choice card. */
export function levelDescription(t: TFunction, level: TeamLevel): string {
  return t(`team.level.${level}.text`)
}

/** Calm to serious, so the three badges read as a scale rather than three colours. */
export function levelTone(level: TeamLevel): BadgeTone {
  return level === 'professional' ? 'accent' : level === 'orta' ? 'warning' : 'neutral'
}
