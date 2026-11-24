import { CalendarDays, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Challenge } from '../api/games'
import { Button, ButtonLink, Card, Chip, ErrorState, SkeletonList } from '../components'
import { bookingWhen } from '../bookings/when'
import { formatLabel } from '../stadiums/labels'
import { challengePrice } from './challengePrice'
import { levelLabel, TEAM_LEVELS, type TeamLevel } from './level'
import { useChallenges } from './queries'
import { TeamAvatar } from './TeamAvatar'
import { TeamLevelBadge } from './TeamLevelBadge'

/**
 * "Raqib qidirayotgan jamoalar": the challenge board in the server's order.
 * Only a captain (`acceptAs` = the team they lead) gets "Qabul qilish"; a member
 * is told only the captain accepts (the join endpoint refuses members, 403).
 *
 * The level chips start on the viewer's own level, because that is the game
 * they are most likely looking for — and the server does the filtering, so a
 * page is never sliced here.
 */
export function ChallengeBoard({
  acceptAs,
  myLevel,
  showTitle = true,
}: {
  acceptAs?: string
  /** The viewer's team level: the chip it starts on. */
  myLevel?: TeamLevel
  /** False where the screen's header already names the board (/challenges). */
  showTitle?: boolean
}) {
  const { t } = useTranslation()
  const [level, setLevel] = useState<TeamLevel | undefined>(myLevel)
  const board = useChallenges(level)
  const challenges = board.data?.pages.flatMap((page) => page.content) ?? []
  return (
    <section className="flex flex-col gap-3" aria-labelledby="challenges-title">
      <h3
        id="challenges-title"
        className={showTitle ? 'text-lg font-semibold text-primary' : 'sr-only'}
      >
        {t('team.challenges')}
      </h3>
      {/*
        The chips scroll inside the section rather than bleeding to the screen
        edges: this row is nested, and a negative margin here would put it
        outside its own section at 360px.
      */}
      <div
        role="group"
        aria-label={t('team.levelFilter.label')}
        className="flex gap-2 overflow-x-auto [scrollbar-width:none]"
      >
        <Chip selected={level === undefined} onClick={() => setLevel(undefined)}>
          {t('team.levelFilter.all')}
        </Chip>
        {TEAM_LEVELS.map((value) => (
          <Chip key={value} selected={level === value} onClick={() => setLevel(value)}>
            {levelLabel(t, value)}
          </Chip>
        ))}
      </div>
      {!acceptAs && <p className="text-sm text-secondary">{t('team.leaderAccepts')}</p>}
      {board.isPending ? (
        <SkeletonList count={2} variant="item" />
      ) : board.isError ? (
        <ErrorState onRetry={() => void board.refetch()} />
      ) : challenges.length === 0 ? (
        <p className="text-sm text-secondary">{t('team.challengesEmpty')}</p>
      ) : (
        <>
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.gameId} challenge={challenge} acceptAs={acceptAs} />
          ))}
          {board.hasNextPage && (
            <Button
              variant="secondary"
              loading={board.isFetchingNextPage}
              onClick={() => void board.fetchNextPage()}
            >
              {t('team.more')}
            </Button>
          )}
        </>
      )}
    </section>
  )
}

function ChallengeCard({ challenge, acceptAs }: { challenge: Challenge; acceptAs?: string }) {
  const { t } = useTranslation()
  const name = challenge.waitingTeamName ?? t('team.anonymous')
  const district = challenge.location?.district ?? challenge.stadiumDistrict
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <TeamAvatar name={name} id={challenge.waitingTeamId} size="sm" />
        <p className="min-w-0 flex-1 truncate text-md font-semibold text-primary">{name}</p>
        <TeamLevelBadge level={challenge.waitingTeamLevel} />
      </div>
      <p className="flex items-center gap-2 text-sm text-secondary">
        <MapPin size={16} className="shrink-0 text-link" aria-hidden />
        {`${challenge.stadiumName} · ${formatLabel(challenge.format)}`}
      </p>
      {district && (
        <p className="pl-6 text-sm text-secondary">{t('stadium.districtName', { district })}</p>
      )}
      <p className="flex items-center gap-2 text-sm text-secondary">
        <CalendarDays size={16} className="shrink-0 text-link" aria-hidden />
        {bookingWhen(challenge)}
      </p>
      <p className="text-base font-semibold text-primary">{challengePrice(t, challenge)}</p>
      {acceptAs && (
        <ButtonLink to={`/challenges/${challenge.gameId}?team=${acceptAs}`}>
          {t('team.accept')}
        </ButtonLink>
      )}
    </Card>
  )
}
