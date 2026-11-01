import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarX, CircleAlert, Clock, Info, Plus, SearchCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { tashkentToUtc } from '../../shared/format'
import { BOOKINGS_KEY, createBooking, type Booking, type PaymentOption } from '../api/bookings'
import type { SavedCard } from '../api/cards'
import { getAvailability, type StadiumDetail, type TimeSlot } from '../api/stadiums'
import { AddCardSheet } from '../cards/AddCardSheet'
import { CardRow } from '../cards/CardRow'
import { useCards } from '../cards/queries'
import {
  BottomBar,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  StateView,
} from '../components'
import { formatMoney } from '../format'
import { useGoBack } from '../lib/useGoBack'
import { useCountdown } from '../payment/useCountdown'
import { usePayment } from '../payment/usePayment'
import { dayTitle, slotLabel, tashkentToday } from '../stadiums/dates'
import { formatLabel } from '../stadiums/labels'
import { availabilityKey, useStadium } from '../stadiums/queries'
import { parseCheckoutParams, type CheckoutParams } from './checkoutParams'
import { PaymentOptions } from './PaymentOptions'

/** Bron qilish: the chosen hour, deposit or full, a saved card, and paying. */
export function CheckoutPage() {
  const { t } = useTranslation()
  const [search] = useSearchParams()
  const [today] = useState(() => tashkentToday())
  const goBack = useGoBack()
  const params = parseCheckoutParams(search, today)
  if (!params) {
    return (
      <Screen header={<Header title={t('checkout.title')} onBack={goBack} />}>
        <ChooseTime
          stadiumId={search.get('stadium')}
          title={t('checkout.badLinkTitle')}
          text={t('checkout.badLinkText')}
        />
      </Screen>
    )
  }
  return <Checkout params={params} />
}

function ChooseTime({
  stadiumId,
  date,
  title,
  text,
}: {
  stadiumId: string | null
  date?: string
  title: string
  text: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const target = stadiumId ? `/stadiums/${stadiumId}${date ? `?date=${date}` : ''}` : '/'
  return (
    <StateView
      icon={CalendarX}
      title={title}
      description={text}
      actionLabel={t('checkout.chooseTime')}
      onAction={() => navigate(target, { replace: true })}
    />
  )
}

function Checkout({ params }: { params: CheckoutParams }) {
  const { t } = useTranslation()
  const goBack = useGoBack()
  const detail = useStadium(params.stadiumId)
  const availability = useQuery({
    queryKey: availabilityKey(params.stadiumId, params.date),
    queryFn: () => getAvailability(params.stadiumId, params.date),
  })
  const cards = useCards()
  const header = <Header title={t('checkout.title')} onBack={goBack} />

  if (detail.isPending || availability.isPending || cards.isPending) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    )
  }
  if (detail.isError || availability.isError || cards.isError) {
    return (
      <Screen header={header} className="justify-center">
        <ErrorState
          onRetry={() => {
            if (detail.isError) void detail.refetch()
            if (availability.isError) void availability.refetch()
            if (cards.isError) void cards.refetch()
          }}
        />
      </Screen>
    )
  }

  const slot = availability.data.slots.find(
    (s) => s.startTime.slice(0, 5) === params.start && s.status === 'free',
  )
  if (!slot || slot.pricePerHour === undefined) {
    return (
      <Screen header={header}>
        <ChooseTime
          stadiumId={params.stadiumId}
          date={params.date}
          title={t('checkout.slotGoneTitle')}
          text={t('checkout.badLinkText')}
        />
      </Screen>
    )
  }
  return (
    <CheckoutForm
      params={params}
      stadium={detail.data}
      slot={slot}
      price={slot.pricePerHour}
      cards={cards.data}
    />
  )
}

function CheckoutForm({
  params,
  stadium,
  slot,
  price,
  cards,
}: {
  params: CheckoutParams
  stadium: StadiumDetail
  slot: TimeSlot
  price: number
  cards: SavedCard[]
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const goBack = useGoBack()
  const payment = usePayment()
  const { state } = payment
  const deposit =
    stadium.minBookingAmount !== undefined && stadium.minBookingAmount < price
      ? stadium.minBookingAmount
      : undefined
  const [option, setOption] = useState<PaymentOption>(deposit !== undefined ? 'MINIMUM' : 'FULL')
  const [cardId, setCardId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const card = cards.find((c) => c.id === cardId) ?? cards[0]
  const amount = option === 'MINIMUM' && deposit !== undefined ? deposit : price
  const paying = state.kind === 'paying'

  useEffect(() => {
    if (state.kind !== 'success') return
    void queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY })
    void queryClient.invalidateQueries({
      queryKey: availabilityKey(params.stadiumId, params.date),
    })
    navigate('/checkout/done', { replace: true, state: { booking: state.booking } })
  }, [state, queryClient, navigate, params.stadiumId, params.date])

  const pay = () => {
    if (!card) return
    void payment.pay(
      () =>
        createBooking({
          stadiumId: stadium.id,
          startsAt: tashkentToUtc(params.date, params.start),
          cardId: card.id,
          paymentOption: option,
        }),
      { paymentType: 'booking' },
    )
  }

  const header = (
    <Header
      title={t('checkout.title')}
      onBack={() => {
        if (!paying) goBack()
      }}
    />
  )

  if (state.kind === 'slotTaken') {
    return (
      <Screen header={header}>
        <StateView
          icon={CalendarX}
          tone="danger"
          title={t('checkout.slotTakenTitle')}
          description={t('checkout.slotTakenText')}
          actionLabel={t('checkout.chooseOther')}
          onAction={() => {
            void queryClient.invalidateQueries({
              queryKey: availabilityKey(params.stadiumId, params.date),
            })
            navigate(`/stadiums/${params.stadiumId}?date=${params.date}`, { replace: true })
          }}
        >
          <Link to="/games" className="flex min-h-11 items-center text-md font-semibold text-link">
            {t('checkout.myBookings')}
          </Link>
        </StateView>
      </Screen>
    )
  }
  if (state.kind === 'checking') {
    return (
      <Screen header={header}>
        <StateView
          icon={SearchCheck}
          title={t('checkout.checkingTitle')}
          description={t('checkout.checkingText')}
        >
          <div className="w-full pt-3">
            <ButtonLink to={`/bookings/${state.booking.id}`} replace>
              {t('checkout.viewBooking')}
            </ButtonLink>
          </div>
        </StateView>
      </Screen>
    )
  }

  const declined = state.kind === 'declined' ? state.booking : null
  const footer = (
    <BottomBar>
      {declined ? (
        <DeclinedActions booking={declined} />
      ) : state.kind === 'failed' ? (
        <>
          <Button haptic onClick={pay}>
            {t('checkout.retry')}
          </Button>
          <ButtonLink to="/games" variant="ghost">
            {t('checkout.myBookings')}
          </ButtonLink>
        </>
      ) : paying ? (
        <Button loading>{t('checkout.paying')}</Button>
      ) : (
        <Button haptic disabled={!card} onClick={pay}>
          {t('checkout.pay', { amount: formatMoney(amount) })}
        </Button>
      )}
    </BottomBar>
  )

  return (
    <Screen header={header} footer={footer}>
      <Summary stadium={stadium} date={params.date} slot={slot} price={price} />

      <section className="flex flex-col gap-3" aria-labelledby="pay-type">
        <h2 id="pay-type" className="text-title font-bold text-primary">
          {t('checkout.paymentType')}
        </h2>
        <PaymentOptions
          value={option}
          onChange={setOption}
          price={price}
          deposit={deposit}
          disabled={paying || declined !== null}
        />
        <p className="px-1 text-sm text-secondary">
          {deposit === undefined
            ? t('checkout.fullOnly')
            : option === 'MINIMUM'
              ? t('checkout.remainderNote')
              : null}
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="pay-card">
        <h2 id="pay-card" className="text-title font-bold text-primary">
          {t('checkout.card')}
        </h2>
        {cards.length > 0 && (
          <div role="radiogroup" aria-labelledby="pay-card" className="flex flex-col gap-3">
            {cards.map((c) => (
              <CardRow
                key={c.id}
                card={c}
                selected={c.id === card?.id}
                invalid={declined !== null && c.id === card?.id}
                onSelect={() => {
                  if (!paying && declined === null) setCardId(c.id)
                }}
              />
            ))}
          </div>
        )}
        <Button
          variant="ghost"
          icon={Plus}
          disabled={paying || declined !== null}
          onClick={() => setAdding(true)}
        >
          {t('cards.add')}
        </Button>
        {cards.length === 0 && (
          <p className="px-1 text-sm text-secondary">{t('checkout.addCardFirst')}</p>
        )}
      </section>

      {declined && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-danger bg-danger-soft p-3 text-danger"
        >
          <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-md font-semibold">{t('checkout.declinedTitle')}</p>
            <p className="text-sm">{t('checkout.declinedText')}</p>
          </div>
        </div>
      )}
      {state.kind === 'failed' && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-danger bg-danger-soft p-3 text-danger"
        >
          <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
          <p className="text-sm">{t(state.errorKey)}</p>
        </div>
      )}

      <Card className="flex gap-3 p-3">
        <Info size={18} className="mt-0.5 shrink-0 text-link" aria-hidden />
        <p className="text-sm text-secondary">
          {t('checkout.cancelNote', { hours: stadium.cancellationPolicy.cancellationHours })}
        </p>
      </Card>

      <AddCardSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(saved) => {
          setAdding(false)
          setCardId(saved.id)
        }}
      />
    </Screen>
  )
}

function Summary({
  stadium,
  date,
  slot,
  price,
}: {
  stadium: StadiumDetail
  date: string
  slot: TimeSlot
  price: number
}) {
  const { t } = useTranslation()
  const photo = [...stadium.photos].sort((a, b) => a.position - b.position)[0]
  const meta = [
    stadium.district ? t('stadium.districtName', { district: stadium.district }) : null,
    formatLabel(stadium.format),
  ]
    .filter(Boolean)
    .join(' · ')
  const rows: Array<[string, string]> = [
    [t('checkout.date'), dayTitle(date)],
    [t('checkout.time'), slotLabel(slot)],
    [t('checkout.duration'), t('checkout.oneHour')],
  ]
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
          {photo && (
            <img
              src={photo.url}
              alt=""
              width={56}
              height={56}
              className="size-full object-cover"
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden'
              }}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-lg font-semibold text-primary">{stadium.name}</p>
          <p className="truncate text-sm text-secondary">{meta}</p>
        </div>
      </div>
      <dl className="flex flex-col gap-2 border-t border-border pt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-base">
            <dt className="text-secondary">{label}</dt>
            <dd className="text-right text-primary">{value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-border pt-3">
          <dt className="text-md font-semibold text-primary">{t('checkout.total')}</dt>
          <dd className="text-md font-bold text-primary">{formatMoney(price)}</dd>
        </div>
      </dl>
    </Card>
  )
}

/** After a decline: the hold countdown; retrying waits for R28 (POST /api/bookings/{id}/pay). */
function DeclinedActions({ booking }: { booking: Booking }) {
  const { t } = useTranslation()
  const hold = useCountdown(booking.expiresAt)
  return (
    <>
      {booking.expiresAt && (
        <p className="flex items-center justify-center gap-2 text-sm text-secondary">
          <Clock size={16} aria-hidden />
          {hold.expired ? t('checkout.holdExpired') : t('checkout.hold', { time: hold.label })}
        </p>
      )}
      <Button disabled>{t('checkout.retry')}</Button>
      <Button variant="secondary" disabled>
        {t('checkout.otherCard')}
      </Button>
      <p className="text-center text-xs text-secondary">{t('common.soon')}</p>
    </>
  )
}
