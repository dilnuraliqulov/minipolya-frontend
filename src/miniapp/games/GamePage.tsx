import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  ChevronRight,
  Hourglass,
  Info,
  MapPin,
  MessageCircle,
  SearchX,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { formatTime } from '../../shared/format'
import { errorMessage, errorMessageKey, errorTone, isDeclineKey } from '../api/errors'
import {
  cancelGame,
  CHALLENGES_KEY,
  gameKey,
  MY_GAMES_KEY,
  payTeamRemainder,
  type GameDetail,
  type GameTeam,
} from '../api/games'
import { useLoginUser } from '../auth/sessionContext'
import { bookingWhen, isAhead } from '../bookings/when'
import { CardRow } from '../cards/CardRow'
import { useCards } from '../cards/queries'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  useToast,
  Notice,
} from '../components'
import { formatLongDate, formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { TeamAvatar } from '../teams/TeamAvatar'
import { useTeam } from '../teams/queries'
import { useGame } from './queries'
import { gameStatusBadge } from './status'

const CANCELLABLE = new Set(['open', 'confirmed'])
const PAYABLE = new Set(['confirmed', 'completed'])

/** Oʻyin: a team game — the two teams, my team's money, chat and cancelling. */
export function GamePage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const goBack = useGoBack('/games')
  const game = useGame(id)
  const header = <Header title={t('game.title')} onBack={goBack} />

  if (game.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (game.isError) {
    const notFound = isApiError(game.error) && game.error.status === 404
    return (
      <Screen header={header} className="justify-center">
        {notFound ? (
          <EmptyState
            icon={SearchX}
            title={t('game.notFoundTitle')}
            description={t('game.notFoundText')}
          />
        ) : (
          <ErrorState onRetry={() => void game.refetch()} />
        )}
      </Screen>
    )
  }
  return (
    <Screen header={header}>
      <GameContent game={game.data} />
    </Screen>
  )
}

function GameContent({ game }: { game: GameDetail }) {
  const { t } = useTranslation()
  const me = useLoginUser()
  const [sheet, setSheet] = useState<'pay' | 'cancel' | null>(null)
  const teams = [...(game.teams ?? [])].sort((a, b) => a.side.localeCompare(b.side))
  // A team that walked out keeps its side on its participants' rows, marked cancelled.
  const mySide = game.participants?.find(
    (p) => p.userId === me.id && p.status !== 'cancelled',
  )?.side
  const myTeam =
    teams.find((team) => team.leaderId === me.id) ?? teams.find((team) => team.side === mySide)
  const isLeader = myTeam?.leaderId === me.id
  // The backend lets only a leader of a team still in the game cancel it.
  // R45: while another team's payment is being confirmed, nothing that would race it
  // (cancelling, paying the rest) is offered; the screen refreshes until it settles.
  const joining = game.joinPending === true
  const canCancel =
    !joining && CANCELLABLE.has(game.status) && teams.some((x) => x.leaderId === me.id)
  const badge = gameStatusBadge(game.status)
  const [a, b] = teams

  return (
    <>
      {/* The API lists only teams still in the game: none once it is cancelled. */}
      {a && (
        <div className="flex items-center justify-center gap-4 py-2">
          <Side team={a} />
          <span className="text-md font-semibold text-secondary">{t('game.vs')}</span>
          <Side team={b} />
        </div>
      )}
      <div className="flex justify-center">
        <Badge tone={badge.tone}>{badge.labelKey ? t(badge.labelKey) : badge.raw}</Badge>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <p className="flex items-center gap-3 text-base text-primary">
          <CalendarDays size={18} className="shrink-0 text-link" aria-hidden />
          {bookingWhen(game)}
        </p>
        {game.stadiumName && (
          <p className="flex items-center gap-3 text-base text-primary">
            <MapPin size={18} className="shrink-0 text-link" aria-hidden />
            {game.stadiumName}
          </p>
        )}
      </Card>

      {joining && (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-warning bg-warning-soft p-3 text-warning"
        >
          <Hourglass size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">{t('game.joinPendingTitle')}</p>
            <p>{t('game.joinPendingText')}</p>
          </div>
        </div>
      )}

      {game.status === 'open' && !joining && (
        <p className="flex gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
          {t('game.waitingText')}
        </p>
      )}

      {game.status === 'confirmed' && (
        <Link
          to={`/games/${game.id}/chat`}
          className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-background p-4"
        >
          <MessageCircle size={22} className="shrink-0 text-link" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-md font-semibold text-primary">{t('game.chat')}</span>
            <span className="text-sm text-secondary">{t('game.chatText')}</span>
          </span>
          <ChevronRight size={20} className="text-secondary" aria-hidden />
        </Link>
      )}

      {teams.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="game-teams">
          <h3 id="game-teams" className="text-lg font-semibold text-primary">
            {t('game.teams')}
          </h3>
          {teams.map((team) => (
            <TeamMembers key={team.side} team={team} />
          ))}
        </section>
      )}

      {myTeam && (
        <MyPayment team={myTeam}>
          {isLeader &&
            !joining &&
            myTeam.remainderStatus === 'unpaid' &&
            myTeam.remainderAmount > 0 &&
            PAYABLE.has(game.status) && (
              <>
                <Button haptic onClick={() => setSheet('pay')}>
                  {t('game.payRest')}
                </Button>
                <p className="text-center text-sm text-secondary">{t('game.cashNote')}</p>
              </>
            )}
        </MyPayment>
      )}

      {canCancel && (
        <section className="flex flex-col gap-3" aria-labelledby="game-rules">
          <h3 id="game-rules" className="text-lg font-semibold text-primary">
            {t('game.rules')}
          </h3>
          {myTeam && isAhead(myTeam.cancellationDeadline) && (
            <p className="text-sm text-secondary">
              {t('game.deadline', {
                date: formatLongDate(myTeam.cancellationDeadline),
                time: formatTime(myTeam.cancellationDeadline),
              })}
            </p>
          )}
          {myTeam && <GameRefundLine team={myTeam} />}
          <Button variant="danger-outline" onClick={() => setSheet('cancel')}>
            {t('game.cancel')}
          </Button>
        </section>
      )}

      {sheet === 'pay' && myTeam && (
        <PayTeamRemainderSheet game={game} team={myTeam} onClose={() => setSheet(null)} />
      )}
      {sheet === 'cancel' && (
        <CancelGameSheet game={game} team={myTeam} onClose={() => setSheet(null)} />
      )}
    </>
  )
}

function Side({ team }: { team?: GameTeam }) {
  const { t } = useTranslation()
  const name = team?.teamName ?? (team ? t('team.anonymous') : t('game.waitingOpponent'))
  return (
    <div className="flex w-28 flex-col items-center gap-2 text-center">
      {team ? (
        <TeamAvatar name={name} />
      ) : (
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-border text-lg text-secondary">
          ?
        </span>
      )}
      <span className="line-clamp-2 text-sm font-semibold text-primary">{name}</span>
    </div>
  )
}

function TeamMembers({ team }: { team: GameTeam }) {
  const { t } = useTranslation()
  const detail = useTeam(team.teamId)
  const name = team.teamName ?? t('team.anonymous')
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        <TeamAvatar name={name} size="sm" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-md font-semibold text-primary">{name}</span>
          {team.leaderName && (
            <span className="text-xs text-secondary">
              {t('game.captain', { name: team.leaderName })}
            </span>
          )}
        </div>
      </div>
      {detail.data && (
        <ul className="flex flex-wrap gap-2" aria-label={name}>
          {detail.data.members.map((member) => (
            <li
              key={member.userId}
              className="rounded-full bg-surface px-3 py-1 text-sm text-primary"
            >
              {member.userName ?? t('team.anonymous')}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function MyPayment({ team, children }: { team: GameTeam; children?: ReactNode }) {
  const { t } = useTranslation()
  const paid = team.remainderStatus === 'paid'
  return (
    <Card className="flex flex-col gap-3 p-4" role="region" aria-labelledby="game-payment">
      <h3 id="game-payment" className="text-lg font-semibold text-primary">
        {t('game.myPayment')}
      </h3>
      <dl className="flex flex-col gap-2 text-base">
        <div className="flex justify-between gap-3">
          <dt className="text-secondary">{t('game.paidInApp')}</dt>
          <dd className="text-primary">{formatMoney(team.paidInApp)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-secondary">{t('game.remainder')}</dt>
          <dd className="flex items-center gap-2 text-primary">
            {formatMoney(team.remainderAmount)}
            {/* Nothing owed (the advance covered it): no status badge. */}
            {(paid || team.remainderAmount > 0) && (
              <Badge tone={paid ? 'success' : 'warning'}>
                {paid ? t('game.remainderPaid') : t('game.remainderUnpaid')}
              </Badge>
            )}
          </dd>
        </div>
      </dl>
      {children}
    </Card>
  )
}

function GameRefundLine({ team }: { team: GameTeam }) {
  const { t } = useTranslation()
  const refund = team.refundIfCancelledNow ?? 0
  return refund > 0 ? (
    <p className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm text-success">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
      {t('game.refundNow', { amount: formatMoney(refund) })}
    </p>
  ) : (
    <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
      {t('game.noRefundNow')}
    </p>
  )
}

function PayTeamRemainderSheet({
  game,
  team,
  onClose,
}: {
  game: GameDetail
  team: GameTeam
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const cards = useCards()
  const [cardId, setCardId] = useState<string | null>(null)
  const list = cards.data ?? []
  const card = list.find((c) => c.id === cardId) ?? list[0]
  const pay = useMutation({
    mutationFn: (id: string) => payTeamRemainder(game.id, id),
    onSuccess: (updated) => {
      queryClient.setQueryData(gameKey(game.id), updated)
      toast.show(t('game.restPaid'), 'success')
      onClose()
    },
    onError: (error) => {
      // Only a decline is safe to try again with another card. Anything else
      // (still confirming, already paid, no answer) may have moved money: close,
      // say so, and reload the game instead of leaving the pay button live.
      // The payment system being down is safe too: nothing was charged.
      const key = errorMessageKey(error)
      if (isDeclineKey(key) || key === 'errors.providerUnavailable') return
      toast.show(errorMessage(error), 'danger')
      void queryClient.invalidateQueries({ queryKey: gameKey(game.id) })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t('game.payTitle')}
      onClose={() => {
        if (!pay.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={!card}
          loading={pay.isPending}
          onClick={() => card && pay.mutate(card.id)}
        >
          {t('game.payButton', { amount: formatMoney(team.remainderAmount) })}
        </Button>
      }
    >
      {cards.isPending ? (
        <SkeletonList count={2} variant="item" />
      ) : cards.isError ? (
        <ErrorState onRetry={() => void cards.refetch()} />
      ) : list.length === 0 ? (
        <p className="text-sm text-secondary">{t('checkout.addCardFirst')}</p>
      ) : (
        <div role="radiogroup" aria-label={t('checkout.card')} className="flex flex-col gap-3">
          {list.map((c) => (
            <CardRow
              key={c.id}
              card={c}
              selected={c.id === card?.id}
              invalid={pay.isError && c.id === card?.id && isDeclineKey(errorMessageKey(pay.error))}
              onSelect={() => setCardId(c.id)}
            />
          ))}
        </div>
      )}
      {pay.isError && (
        <Notice tone={errorTone(errorMessageKey(pay.error))}>{errorMessage(pay.error)}</Notice>
      )}
    </BottomSheet>
  )
}

function CancelGameSheet({
  game,
  team,
  onClose,
}: {
  game: GameDetail
  team?: GameTeam
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => cancelGame(game.id),
    onSuccess: () => toast.show(t('game.cancelled'), 'success'),
    onError: (error) => toast.show(errorMessage(error), 'danger'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: gameKey(game.id) })
      void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY })
      void queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t('game.cancelTitle')}
      onClose={() => {
        if (!cancel.isPending) onClose()
      }}
      actions={
        <>
          <Button
            variant="danger"
            haptic
            loading={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {t('game.cancelConfirm')}
          </Button>
          <Button variant="secondary" disabled={cancel.isPending} onClick={onClose}>
            {t('game.cancelKeep')}
          </Button>
        </>
      }
    >
      {team && <GameRefundLine team={team} />}
    </BottomSheet>
  )
}
