import { CalendarDays, ChevronRight, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatTime, tashkentToday } from '../../shared/format'
import type { TeamUpcomingGame } from '../api/teams'
import { dayTitle } from '../stadiums/dates'

/**
 * "Keyingi oʻyin": the team's next game, when it has one. The opponent is named
 * only when there is one — a game still looking for one says so rather than
 * leaving a gap. The whole card opens the game.
 */
export function TeamNextGameCard({ game }: { game: TeamUpcomingGame }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/games/${game.gameId}`}
      aria-label={t('team.nextGame.open')}
      className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-caps text-secondary uppercase">
          {t('team.nextGame.title')}
        </span>
        <span className="flex items-center gap-2 text-base font-semibold text-primary">
          <CalendarDays size={16} className="shrink-0 text-link" aria-hidden />
          <span className="min-w-0 truncate">
            {`${dayTitle(tashkentToday(new Date(game.startsAt)))} · ${formatTime(game.startsAt)}`}
          </span>
        </span>
        {game.stadiumName && (
          <span className="flex items-center gap-2 text-sm text-secondary">
            <MapPin size={16} className="shrink-0 text-link" aria-hidden />
            <span className="min-w-0 truncate">{game.stadiumName}</span>
          </span>
        )}
        <span className="flex items-center gap-2 text-sm text-secondary">
          <Users size={16} className="shrink-0 text-link" aria-hidden />
          <span className="min-w-0 truncate">
            {game.opponentName
              ? t('team.nextGame.opponent', { name: game.opponentName })
              : t('team.nextGame.waiting')}
          </span>
        </span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-secondary" aria-hidden />
    </Link>
  )
}
