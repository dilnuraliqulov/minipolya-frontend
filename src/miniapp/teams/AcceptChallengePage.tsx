import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CalendarX,
  Clock,
  Hourglass,
  Info,
  MapPin,
  SearchX,
  ShieldAlert,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { errorMessageKey, errorTone, isDeclineKey, isUnclearPaymentError } from '../api/errors'
import type { PaymentOption } from '../api/bookings'
import {
  acceptChallenge,
  CHALLENGES_KEY,
  gameKey,
  getJoinQuote,
  joinQuoteKey,
  MY_GAMES_KEY,
  type Challenge,
} from '../api/games'
import { bookingWhen } from '../bookings/when'
import { CardPicker } from '../cards/CardPicker'
import { UnclearOutcome } from '../games/UnclearOutcome'
import { useCardChoice } from '../cards/useCardChoice'
import {
  BottomBar,
  Button,
  Card,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  StateView,
  useToast,
  Notice,
} from '../components'
import { formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { formatLabel } from '../stadiums/labels'
import { markJoinPending, usePendingJoins } from './pendingJoins'
import { useChallenges, useLedTeams } from './queries'
import { LocationCard } from '../map/LocationCard'
import { TeamAvatar } from './TeamAvatar'
import { chosenAmount, chosenOption, quoteChoice } from './teamQuote'
import { TeamPaymentChoice } from './TeamPaymentChoice'

/**
 * Raqibni qabul qilish: the captain's team takes on a waiting team. The game
 * comes from the challenge board; what the team may pay — the minimum or the
 * full amount — from the join quote (T7/T12, `GET /api/games/{id}/join-quote`).
 */
export function AcceptChallengePage() {
  const { t } = useTranslation()
  const { gameId = '' } = useParams()
  const [search] = useSearchParams()
  const goBack = useGoBack('/team')
  const board = useChallenges()
  const led = useLedTeams()
  const isPending = usePendingJoins()
  const header = <Header title={t('accept.title')} onBack={goBack} />

  // Already paid, still being confirmed: never show the pay form for it again.
  if (isPending(gameId)) {
    return (
      <Screen header={header}>
        <JoinPending gameId={gameId} />
      </Screen>
    )
  }

  if (board.isPending || led.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (board.isError) {
    return (
      <Screen header={header} className="justify-center">
        <ErrorState
          onRetry={() => {
            void board.refetch()
          }}
        />
      </Screen>
    )
  }
  const challenge = board.data.pages
    .flatMap((page) => page.content)
    .find((c) => c.gameId === gameId)
  if (!challenge) {
    return (
      <Screen header={header}>
        <Gone />
      </Screen>
    )
  }
  // Only a team this player captains can accept; an invited member cannot (403).
  const team = led.teams.find((x) => x.id === search.get('team'))
  if (!team) {
    return (
      <Screen header={header}>
        <LeaderOnly />
      </Screen>
    )
  }
  return <AcceptForm challenge={challenge} teamId={team.id} teamName={team.name} />
}

/** 202 PAYMENT_PENDING: paid; the backend settles the rest and notifies. */
function JoinPending({ gameId }: { gameId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <StateView
      icon={Hourglass}
      title={t('accept.pendingTitle')}
      description={t('errors.paymentPending')}
      actionLabel={t('accept.openGame')}
      onAction={() => navigate(`/games/${gameId}`, { replace: true })}
    />
  )
}

/** A member (or anyone not leading the team) cannot accept: only the leader joins, and pays. */
function LeaderOnly() {
  const { t } = useTranslation()
  return (
    <Gone
      icon={ShieldAlert}
      title={t('accept.leaderOnlyTitle')}
      text={t('errors.onlyLeaderJoins')}
    />
  )
}

function Gone({
  title,
  text,
  icon = SearchX,
}: {
  title?: string
  text?: string
  icon?: typeof SearchX
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <StateView
      icon={icon}
      title={title ?? t('accept.goneTitle')}
      description={text ?? t('accept.goneText')}
      actionLabel={t('accept.backToTeam')}
      onAction={() => navigate('/team', { replace: true })}
    />
  )
}

function AcceptForm({
  challenge,
  teamId,
  teamName,
}: {
  challenge: Challenge
  teamId: string
  teamName: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const goBack = useGoBack('/team')
  const choice = useCardChoice()
  const quote = useQuery({
    queryKey: joinQuoteKey(challenge.gameId),
    queryFn: () => getJoinQuote(challenge.gameId),
    refetchOnWindowFocus: false,
  })
  const [picked, setPicked] = useState<PaymentOption | null>(null)
  const accept = useMutation({
    mutationFn: (vars: { cardId: string; paymentOption: PaymentOption }) =>
      acceptChallenge(challenge.gameId, teamId, vars.cardId, vars.paymentOption),
    onSuccess: () => {
      toast.show(t('accept.done'), 'success')
      void queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY })
      void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY })
      navigate(`/games/${challenge.gameId}`, { replace: true })
    },
    // Any failure may have changed the board (a capture that failed cancels the game),
    // and the game itself: it reads fresh from the server the next time it opens.
    onError: (error) => {
      if (errorMessageKey(error) === 'errors.paymentPending') markJoinPending(challenge.gameId)
      void queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY })
      void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY })
      void queryClient.invalidateQueries({ queryKey: gameKey(challenge.gameId) })
    },
  })
  const header = (
    <Header
      title={t('accept.title')}
      onBack={() => {
        if (!accept.isPending) goBack()
      }}
    />
  )

  const failure = accept.isError ? errorMessageKey(accept.error) : null
  if (failure === 'errors.paymentPending') {
    return (
      <Screen header={header}>
        <JoinPending gameId={challenge.gameId} />
      </Screen>
    )
  }
  if (failure === 'errors.onlyLeaderJoins') {
    return (
      <Screen header={header}>
        <LeaderOnly />
      </Screen>
    )
  }
  if (failure === 'errors.hasOpponent') {
    return (
      <Screen header={header}>
        <Gone />
      </Screen>
    )
  }
  if (accept.isError && isApiError(accept.error) && accept.error.status === 409) {
    return (
      <Screen header={header}>
        <Gone icon={CalendarX} title={t('accept.slotTakenTitle')} text={t('accept.goneText')} />
      </Screen>
    )
  }
  if (accept.isError && isUnclearPaymentError(accept.error)) {
    return (
      <Screen header={header}>
        <UnclearOutcome error={accept.error} />
      </Screen>
    )
  }
  if (failure === 'errors.tooLate') {
    return (
      <Screen header={header}>
        <Gone icon={Clock} title={t('accept.tooLateTitle')} text={t('errors.tooLate')} />
      </Screen>
    )
  }

  if (quote.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  const options = quote.data ? quoteChoice(quote.data) : null
  if (quote.isError || !quote.data || !options) {
    // 400: past the 3-hour point, or no longer open for joining; 404: gone.
    const key = quote.isError ? errorMessageKey(quote.error) : null
    if (key === 'errors.tooLate') {
      return (
        <Screen header={header}>
          <Gone icon={Clock} title={t('accept.tooLateTitle')} text={t('errors.tooLate')} />
        </Screen>
      )
    }
    if (key === 'errors.invalid' || key === 'errors.notFound') {
      return (
        <Screen header={header}>
          <Gone />
        </Screen>
      )
    }
    return (
      <Screen header={header} className="justify-center">
        <ErrorState onRetry={() => void quote.refetch()} />
      </Screen>
    )
  }
  const option = chosenOption(options, picked)

  const waiting = challenge.waitingTeamName ?? t('team.anonymous')
  const footer = (
    <BottomBar>
      <Button
        haptic
        disabled={!choice.card}
        loading={accept.isPending}
        onClick={() =>
          choice.card && accept.mutate({ cardId: choice.card.id, paymentOption: option })
        }
      >
        {t('accept.submit', { amount: formatMoney(chosenAmount(options, option)) })}
      </Button>
    </BottomBar>
  )
  return (
    <Screen header={header} footer={footer}>
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="flex w-28 flex-col items-center gap-2 text-center">
          <TeamAvatar name={teamName} />
          <span className="text-sm font-semibold text-primary">{teamName}</span>
        </div>
        <span className="text-md font-semibold text-secondary">{t('game.vs')}</span>
        <div className="flex w-28 flex-col items-center gap-2 text-center">
          <TeamAvatar name={waiting} />
          <span className="text-sm font-semibold text-primary">{waiting}</span>
        </div>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <p className="flex items-center gap-3 text-base text-primary">
          <MapPin size={18} className="shrink-0 text-link" aria-hidden />
          {`${challenge.stadiumName} · ${formatLabel(challenge.format)}`}
        </p>
        {!challenge.location && (
          <p className="pl-8 text-sm text-secondary">{challenge.stadiumAddress}</p>
        )}
        <p className="flex items-center gap-3 text-base text-primary">
          <CalendarDays size={18} className="shrink-0 text-link" aria-hidden />
          {bookingWhen(challenge)}
        </p>
      </Card>

      {challenge.location && (
        <LocationCard title={t('stadium.location')} location={challenge.location} showStadium />
      )}

      <TeamPaymentChoice
        quote={quote.data}
        choice={options}
        value={option}
        onChange={setPicked}
        disabled={accept.isPending}
      />

      <p className="flex gap-2 text-sm text-secondary">
        <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
        {t('accept.rule')}
      </p>

      <CardPicker choice={choice} disabled={accept.isPending} invalid={isDeclineKey(failure)} />

      {failure && <Notice tone={errorTone(failure)}>{t(failure)}</Notice>}
    </Screen>
  )
}
