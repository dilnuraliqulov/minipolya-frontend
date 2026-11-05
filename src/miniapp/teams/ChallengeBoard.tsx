import { CalendarDays, Hourglass, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Challenge } from '../api/games'
import { Button, ButtonLink, Card, ErrorState, SkeletonList } from '../components'
import { formatMoney } from '../format'
import { bookingWhen } from '../bookings/when'
import { formatLabel } from '../stadiums/labels'
import { usePendingJoins } from './pendingJoins'
import { useChallenges } from './queries'
import { TeamAvatar } from './TeamAvatar'

/**
 * "Raqib qidirayotgan jamoalar": the challenge board in the server's order.
 * Only a captain (`acceptAs` = the team they lead) gets "Qabul qilish"; a member
 * is told only the captain accepts (the join endpoint refuses members, 403).
 */
export function ChallengeBoard({ acceptAs }: { acceptAs?: string }) {
  const { t } = useTranslation()
  const board = useChallenges()
  const isPending = usePendingJoins()
  const challenges = board.data?.pages.flatMap((page) => page.content) ?? []
  return (
    <section className="flex flex-col gap-3" aria-labelledby="challenges-title">
      <h3 id="challenges-title" className="text-lg font-semibold text-primary">
        {t('team.challenges')}
      </h3>
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
            <ChallengeCard
              key={challenge.gameId}
              challenge={challenge}
              acceptAs={acceptAs}
              joinPending={isPending(challenge.gameId)}
            />
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

function ChallengeCard({
  challenge,
  acceptAs,
  joinPending,
}: {
  challenge: Challenge
  acceptAs?: string
  /** This player's join is paid and still being confirmed: no second "Qabul qilish". */
  joinPending: boolean
}) {
  const { t } = useTranslation()
  const name = challenge.waitingTeamName ?? t('team.anonymous')
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <TeamAvatar name={name} size="sm" />
        <p className="min-w-0 flex-1 truncate text-md font-semibold text-primary">{name}</p>
      </div>
      <p className="flex items-center gap-2 text-sm text-secondary">
        <MapPin size={16} className="shrink-0 text-link" aria-hidden />
        {`${challenge.stadiumName} · ${formatLabel(challenge.format)}`}
      </p>
      <p className="flex items-center gap-2 text-sm text-secondary">
        <CalendarDays size={16} className="shrink-0 text-link" aria-hidden />
        {bookingWhen(challenge)}
      </p>
      <p className="text-base font-semibold text-primary">
        {t('team.payNow', { amount: formatMoney(challenge.amountToPayNow) })}
      </p>
      {joinPending ? (
        <p className="flex items-center gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          <Hourglass size={16} className="shrink-0" aria-hidden />
          {t('accept.pendingTitle')}
        </p>
      ) : (
        acceptAs && (
          <ButtonLink to={`/challenges/${challenge.gameId}?team=${acceptAs}`}>
            {t('team.accept')}
          </ButtonLink>
        )
      )}
    </Card>
  )
}
