import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarX, Info, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { isApiError } from '../../shared/api'
import { tashkentToUtc, tashkentToday } from '../../shared/format'
import { errorMessageKey, errorTone, isDeclineKey, isUnclearPaymentError } from '../api/errors'
import type { PaymentOption } from '../api/bookings'
import { createTeamGame, getTeamGameQuote, MY_GAMES_KEY, teamQuoteKey } from '../api/games'
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
  Notice,
} from '../components'
import { formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { dayTitle, slotLabel } from '../stadiums/dates'
import { formatLabel } from '../stadiums/labels'
import { availabilityKey, useStadium } from '../stadiums/queries'
import { useLedTeams } from './queries'
import { TeamAvatar } from './TeamAvatar'
import { chosenAmount, chosenOption, quoteChoice } from './teamQuote'
import { TeamPaymentChoice } from './TeamPaymentChoice'

/**
 * Raqib qidirish: a captain starts a team game on a free hour, choosing how much
 * the team puts on hold now — the minimum or the full amount, from the quote
 * (T7/T12, `GET /api/stadiums/{id}/team-game-quote`).
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
  const startsAt = tashkentToUtc(params.date, params.start)
  const quote = useQuery({
    queryKey: teamQuoteKey(params.stadiumId, startsAt),
    queryFn: () => getTeamGameQuote(params.stadiumId, startsAt),
    refetchOnWindowFocus: false,
  })
  const led = useLedTeams()
  const choice = useCardChoice()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [picked, setPicked] = useState<PaymentOption | null>(null)
  const create = useMutation({
    mutationFn: (vars: { teamAId: string; cardId: string; paymentOption: PaymentOption }) =>
      createTeamGame({ stadiumId: params.stadiumId, startsAt, ...vars }),
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

  if (stadium.isPending || availability.isPending || led.isPending || quote.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  // The quote refuses an hour that cannot be booked (400): the slot is gone.
  const quoteRefused = quote.isError && isApiError(quote.error) && quote.error.status === 400
  if (stadium.isError || availability.isError || (quote.isError && !quoteRefused)) {
    return (
      <Screen header={header} className="justify-center">
        <ErrorState
          onRetry={() => {
            if (stadium.isError) void stadium.refetch()
            if (availability.isError) void availability.refetch()
            if (quote.isError) void quote.refetch()
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
  const options = quote.data ? quoteChoice(quote.data) : null
  if (!slot || !quote.data || !options || slotTaken) {
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
  const option = chosenOption(options, picked)
  const footer = (
    <BottomBar>
      <Button
        haptic
        disabled={!team || !choice.card}
        loading={create.isPending}
        onClick={() =>
          team &&
          choice.card &&
          create.mutate({ teamAId: team.id, cardId: choice.card.id, paymentOption: option })
        }
      >
        {t('opponent.submit', { amount: formatMoney(chosenAmount(options, option)) })}
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
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-secondary">{label}</dt>
              <dd className="text-right text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <TeamPaymentChoice
        quote={quote.data}
        choice={options}
        value={option}
        onChange={setPicked}
        disabled={create.isPending}
      />

      <p className="flex gap-2 text-sm text-secondary">
        <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden />
        {t('opponent.rules')}
      </p>

      <CardPicker choice={choice} disabled={create.isPending} invalid={isDeclineKey(failure)} />

      {failure && <Notice tone={errorTone(failure)}>{t(failure)}</Notice>}
    </Screen>
  )
}
