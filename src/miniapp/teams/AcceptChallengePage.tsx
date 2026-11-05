import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CalendarX, Clock, Info, MapPin, SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { errorMessageKey, errorTone, isUnclearPaymentError } from '../api/errors'
import { acceptChallenge, CHALLENGES_KEY, MY_GAMES_KEY, type Challenge } from '../api/games'
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
import { useChallenges, useLedTeams } from './queries'
import { TeamAvatar } from './TeamAvatar'

/**
 * Raqibni qabul qilish: the captain's team takes on a waiting team. Every
 * figure comes from the challenge board (`amountToPayNow`, `remainderAmount`).
 */
export function AcceptChallengePage() {
  const { t } = useTranslation()
  const { gameId = '' } = useParams()
  const [search] = useSearchParams()
  const goBack = useGoBack('/team')
  const board = useChallenges()
  const led = useLedTeams()
  const header = <Header title={t('accept.title')} onBack={goBack} />

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
  // Only a team this player captains can accept.
  const team = led.teams.find((x) => x.id === search.get('team'))
  if (!challenge || !team) {
    return (
      <Screen header={header}>
        <Gone />
      </Screen>
    )
  }
  return <AcceptForm challenge={challenge} teamId={team.id} teamName={team.name} />
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
  const accept = useMutation({
    mutationFn: (cardId: string) => acceptChallenge(challenge.gameId, teamId, cardId),
    onSuccess: () => {
      toast.show(t('accept.done'), 'success')
      void queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY })
      void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY })
      navigate(`/games/${challenge.gameId}`, { replace: true })
    },
    // Any failure may have changed the board (a capture that failed cancels the game).
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY })
      void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY })
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

  const waiting = challenge.waitingTeamName ?? t('team.anonymous')
  const footer = (
    <BottomBar>
      <Button
        haptic
        disabled={!choice.card}
        loading={accept.isPending}
        onClick={() => choice.card && accept.mutate(choice.card.id)}
      >
        {t('accept.submit', { amount: formatMoney(challenge.amountToPayNow) })}
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
        <p className="pl-8 text-sm text-secondary">{challenge.stadiumAddress}</p>
        <p className="flex items-center gap-3 text-base text-primary">
          <CalendarDays size={18} className="shrink-0 text-link" aria-hidden />
          {bookingWhen(challenge)}
        </p>
      </Card>

      <Card className="flex flex-col gap-2 p-4" role="region" aria-labelledby="accept-pay">
        <h3 id="accept-pay" className="text-lg font-semibold text-primary">
          {t('booking.payment')}
        </h3>
        <dl className="flex flex-col gap-2 text-base">
          <div className="flex justify-between gap-3">
            <dt className="text-secondary">{t('accept.payNow')}</dt>
            <dd className="font-semibold text-primary">{formatMoney(challenge.amountToPayNow)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-secondary">{t('accept.remainder')}</dt>
            <dd className="text-primary">{formatMoney(challenge.remainderAmount)}</dd>
          </div>
        </dl>
        {challenge.remainderAmount > 0 && (
          <p className="text-sm text-secondary">{t('accept.remainderNote')}</p>
        )}
      </Card>

      <p className="flex gap-2 text-sm text-secondary">
        <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
        {t('accept.rule')}
      </p>

      <CardPicker
        choice={choice}
        disabled={accept.isPending}
        invalid={failure === 'errors.cardDeclined'}
      />

      {failure && <Notice tone={errorTone(failure)}>{t(failure)}</Notice>}
    </Screen>
  )
}
