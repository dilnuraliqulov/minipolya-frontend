import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Challenge } from '../api/games'
import { bookingWhen } from '../bookings/when'
import { challengePrice } from './challengePrice'
import { TeamAvatar } from './TeamAvatar'

/**
 * Bosh sahifa → a team looking for an opponent: "TeamA vs ?", deliberately not
 * shaped like a pitch card. The whole card opens the challenge.
 */
export function ChallengeCardWide({
  challenge,
  acceptAs,
}: {
  challenge: Challenge
  /** The team the player captains: the challenge opens ready to accept for it. */
  acceptAs?: string
}) {
  const { t } = useTranslation()
  const team = challenge.waitingTeamName ?? t('team.anonymous')
  const to = `/challenges/${challenge.gameId}${acceptAs ? `?team=${acceptAs}` : ''}`
  return (
    <Link
      to={to}
      className="relative flex h-full flex-col gap-3 rounded-3xl border border-border bg-background p-4"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <TeamAvatar name={team} size="sm" />
          <span className="truncate text-md font-semibold text-primary">{team}</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-secondary">{t('home.vs')}</span>
        <span className="flex flex-1 justify-end">
          <span
            data-testid="opponent-unknown"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-secondary text-base font-bold text-secondary"
          >
            <span aria-hidden>?</span>
            <span className="sr-only">{t('home.opponentWanted')}</span>
          </span>
        </span>
      </span>
      <span className="truncate text-base font-semibold text-primary">{challenge.stadiumName}</span>
      <span className="flex">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-primary">
          <CalendarDays size={14} className="shrink-0 text-secondary" aria-hidden />
          <span className="truncate">{bookingWhen(challenge)}</span>
        </span>
      </span>
      <span className="text-sm font-semibold text-primary">{challengePrice(t, challenge)}</span>
    </Link>
  )
}
