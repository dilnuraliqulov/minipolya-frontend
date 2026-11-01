import { ChevronRight, Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { Game } from '../api/games'
import { bookingWhen } from '../bookings/when'
import { Badge, Button, ErrorState } from '../components'
import { useMyGames } from './queries'
import { gameStatusBadge } from './status'

const TYPE_KEYS = {
  team_vs_team: 'games.teamGame',
  casual: 'games.friendsGame',
  open: 'games.openGame',
} as const

/**
 * Oʻyinlarim's "Oʻyinlar" section: the games the player is in, in the
 * server's order. Hidden while empty, so the bookings stay the main content.
 */
export function MyGames() {
  const { t } = useTranslation()
  const games = useMyGames()
  if (games.isPending) return null
  if (games.isError) {
    return (
      <section aria-labelledby="my-games" className="flex flex-col gap-2">
        <h2 id="my-games" className="text-lg font-semibold text-primary">
          {t('games.section')}
        </h2>
        <ErrorState onRetry={() => void games.refetch()} />
      </section>
    )
  }
  const list = games.data.pages.flatMap((page) => page.content)
  if (list.length === 0) return null
  return (
    <section aria-labelledby="my-games" className="flex flex-col gap-3">
      <h2 id="my-games" className="text-lg font-semibold text-primary">
        {t('games.section')}
      </h2>
      <ul aria-labelledby="my-games" className="flex flex-col gap-3">
        {list.map((game) => (
          <li key={game.id}>
            <GameCard game={game} />
          </li>
        ))}
      </ul>
      {games.hasNextPage && (
        <Button
          variant="secondary"
          loading={games.isFetchingNextPage}
          onClick={() => void games.fetchNextPage()}
        >
          {t('bookings.more')}
        </Button>
      )}
    </section>
  )
}

function GameCard({ game }: { game: Game }) {
  const { t } = useTranslation()
  const badge = gameStatusBadge(game.status)
  const typeKey = TYPE_KEYS[game.type as keyof typeof TYPE_KEYS]
  return (
    <Link
      to={`/games/${game.id}`}
      className="flex min-h-22 items-center gap-3 rounded-2xl border border-border bg-background p-3"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-link">
        <Swords size={26} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <h3 className="w-full truncate text-md font-semibold text-primary">
          {game.title ?? game.stadiumName ?? (typeKey ? t(typeKey) : game.type)}
        </h3>
        <span className="text-sm text-secondary">
          {[typeKey ? t(typeKey) : null, bookingWhen(game)].filter(Boolean).join(' · ')}
        </span>
        <Badge tone={badge.tone}>{badge.labelKey ? t(badge.labelKey) : badge.raw}</Badge>
      </span>
      <ChevronRight size={20} className="shrink-0 text-secondary" aria-hidden />
    </Link>
  )
}
