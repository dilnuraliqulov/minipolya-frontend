import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarX, CircleAlert, Info, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { tashkentToUtc } from '../../shared/format'
import { errorMessageKey, isUnclearPaymentError } from '../api/errors'
import { createTeamGame, MY_GAMES_KEY } from '../api/games'
import { getAvailability } from '../api/stadiums'
import { parseCheckoutParams, type CheckoutParams } from '../booking/checkoutParams'
import { CardPicker } from '../cards/CardPicker'
import { UnclearOutcome } from '../games/UnclearOutcome'
import { useCardChoice } from '../cards/useCardChoice'
import {
  BottomBar,
  Button,
  Card,
  cx,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  StateView,
  useToast,
} from '../components'
import { formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { dayTitle, slotLabel, tashkentToday } from '../stadiums/dates'
import { formatLabel } from '../stadiums/labels'
import { availabilityKey, useStadium } from '../stadiums/queries'
import { useLedTeams } from './queries'
import { TeamAvatar } from './TeamAvatar'

/**
 * Raqib qidirish: a captain starts a team game on a free hour. The team's own
 * price exists only once the game is created (R33), so the form shows the
 * pitch price and the game page shows the team's figures.
 */
export function OpponentPage() {
  const { t } = useTranslation()
  const [search] = useSearchParams()
  const [today] = useState(() => tashkentToday())
  const goBack = useGoBack()
  const params = parseCheckoutParams(search, today)
  const header = <Header title={t('opponent.title')} onBack={goBack} />
  if (!params) {
    return (
      <Screen header={header}>
        <ChooseTimeState stadiumId={search.get('stadium')} title={t('checkout.badLinkTitle')} />
      </Screen>
    )
  }
  return <Opponent params={params} />
}

function ChooseTimeState({
  stadiumId,
  date,
  title,
}: {
  stadiumId: string | null
  date?: string
  title: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <StateView
      icon={CalendarX}
      title={title}
      description={t('checkout.badLinkText')}
      actionLabel={t('checkout.chooseTime')}
      onAction={() =>
        navigate(stadiumId ? `/stadiums/${stadiumId}${date ? `?date=${date}` : ''}` : '/', {
          replace: true,
        })
      }
    />
  )
}

function Opponent({ params }: { params: CheckoutParams }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const goBack = useGoBack()
  const stadium = useStadium(params.stadiumId)
  const availability = useQuery({
    queryKey: availabilityKey(params.stadiumId, params.date),
    queryFn: () => getAvailability(params.stadiumId, params.date),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const led = useLedTeams()
  const choice = useCardChoice()
  const [teamId, setTeamId] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: (vars: { teamAId: string; cardId: string }) =>
      createTeamGame({
        stadiumId: params.stadiumId,
        startsAt: tashkentToUtc(params.date, params.start),
        ...vars,
      }),
    onSuccess: (game) => {
      toast.show(t('opponent.started'), 'success')
      void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY })
      navigate(`/games/${game.id}`, { replace: true })
    },
    // The game may exist even when the answer did not arrive: show it in Oʻyinlarim.
    onError: () => void queryClient.invalidateQueries({ queryKey: MY_GAMES_KEY }),
  })
  const header = (
    <Header
      title={t('opponent.title')}
      onBack={() => {
        if (!create.isPending) goBack()
      }}
    />
  )

  if (stadium.isPending || availability.isPending || led.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (stadium.isError || availability.isError) {
    return (
      <Screen header={header} className="justify-center">
        <ErrorState
          onRetry={() => {
            if (stadium.isError) void stadium.refetch()
            if (availability.isError) void availability.refetch()
          }}
        />
      </Screen>
    )
  }
  if (led.teams.length === 0) {
    return (
      <Screen header={header}>
        <StateView icon={Users} title={t('opponent.noLedTeam')} />
      </Screen>
    )
  }
  const slot = availability.data.slots.find(
    (s) => s.startTime.slice(0, 5) === params.start && s.status === 'free',
  )
  const slotTaken = create.isError && isApiError(create.error) && create.error.status === 409
  if (!slot || slot.pricePerHour === undefined || slotTaken) {
    return (
      <Screen header={header}>
        <ChooseTimeState
          stadiumId={params.stadiumId}
          date={params.date}
          title={slotTaken ? t('accept.slotTakenTitle') : t('checkout.slotGoneTitle')}
        />
      </Screen>
    )
  }

  if (create.isError && isUnclearPaymentError(create.error)) {
    return (
      <Screen header={header}>
        <UnclearOutcome error={create.error} />
      </Screen>
    )
  }
  const team = led.teams.find((x) => x.id === teamId) ?? led.teams[0]
  const failure = create.isError ? errorMessageKey(create.error) : null
  const footer = (
    <BottomBar>
      <Button
        haptic
        disabled={!team || !choice.card}
        loading={create.isPending}
        onClick={() =>
          team && choice.card && create.mutate({ teamAId: team.id, cardId: choice.card.id })
        }
      >
        {t('opponent.submit')}
      </Button>
    </BottomBar>
  )
  return (
    <Screen header={header} footer={footer}>
      <section className="flex flex-col gap-3" aria-labelledby="which-team">
        <h3 id="which-team" className="text-lg font-semibold text-primary">
          {t('opponent.whichTeam')}
        </h3>
        <div role="radiogroup" aria-labelledby="which-team" className="flex flex-col gap-3">
          {led.teams.map((x) => {
            const checked = x.id === team?.id
            return (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={create.isPending}
                onClick={() => setTeamId(x.id)}
                className={cx(
                  'flex min-h-16 w-full items-center gap-3 rounded-xl border bg-background px-4 py-3 text-left',
                  checked ? 'border-accent' : 'border-border',
                )}
              >
                <TeamAvatar name={x.name} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-md font-semibold text-primary">{x.name}</span>
                  <span className="text-sm text-secondary">
                    {t('team.memberCount', { count: x.members.length })}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-lg font-semibold text-primary">{stadium.data.name}</p>
        <dl className="flex flex-col gap-2 text-base">
          {(
            [
              [t('checkout.date'), dayTitle(params.date)],
              [t('checkout.time'), slotLabel(slot)],
              [t('stadiums.format'), formatLabel(stadium.data.format)],
              [t('opponent.slotPrice'), formatMoney(slot.pricePerHour)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-secondary">{label}</dt>
              <dd className="text-right text-primary">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-secondary">{t('opponent.quoteSoon')}</p>
      </Card>

      <p className="flex gap-2 text-sm text-secondary">
        <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
        {t('opponent.rules')}
      </p>

      <CardPicker
        choice={choice}
        disabled={create.isPending}
        invalid={failure === 'errors.cardDeclined'}
      />

      {failure && (
        <p role="alert" className="flex gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          {t(failure)}
        </p>
      )}
    </Screen>
  )
}
