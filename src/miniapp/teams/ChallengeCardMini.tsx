import { CalendarDays, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { mediaUrl } from '../../shared/api'
import type { Challenge } from '../api/games'
import { bookingWhen } from '../bookings/when'
import { LogoMark } from '../components'
import { challengePrice } from './challengePrice'
import { TeamAvatar } from './TeamAvatar'

/**
 * The design's "Challenge Card Mini" (`fdGA4`): the stadium's cover photo (the
 * mark without one), stadium, when, the waiting team and what the joining team
 * pays now (`amountToPayNow`). The whole card opens the challenge; a captain gets
 * "Qabul qilish", anyone else the note that only the captain accepts.
 */
export function ChallengeCardMini({
  challenge,
  acceptAs,
}: {
  challenge: Challenge
  /** The team the player captains; absent → "Sardoringiz qabul qila oladi". */
  acceptAs?: string
}) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)
  const team = challenge.waitingTeamName ?? t('team.anonymous')
  const to = `/challenges/${challenge.gameId}${acceptAs ? `?team=${acceptAs}` : ''}`
  return (
    <Link
      to={to}
      className="flex h-full flex-col gap-2.5 rounded-3xl border border-border bg-background p-2.5"
    >
      <span className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-surface text-secondary">
        {challenge.stadiumPhotoUrl && !broken ? (
          <img
            src={mediaUrl(challenge.stadiumPhotoUrl)}
            alt=""
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <LogoMark size={32} className="opacity-40" />
        )}
      </span>
      <span className="flex flex-col gap-1.5 px-0.5">
        <span className="truncate text-md font-semibold text-primary">{challenge.stadiumName}</span>
        <span className="flex items-center gap-1.5 text-sm text-secondary">
          <CalendarDays size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{bookingWhen(challenge)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <TeamAvatar name={team} size="xs" />
          <span className="truncate text-sm font-medium text-primary">{team}</span>
        </span>
        <span className="text-sm font-semibold text-primary">{challengePrice(t, challenge)}</span>
      </span>
      <span className="mt-auto">
        {acceptAs ? (
          <span className="flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-on-accent">
            {t('team.accept')}
          </span>
        ) : (
          <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-surface px-3 text-sm font-medium text-secondary">
            <ShieldCheck size={16} className="shrink-0" aria-hidden />
            {t('home.captainAccepts')}
          </span>
        )}
      </span>
    </Link>
  )
}
