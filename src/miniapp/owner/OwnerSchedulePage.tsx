import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Percent, Phone, Plus, Swords } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTime, tashkentToUtc, tashkentToday } from '../../shared/format'
import { remainderState } from '../../shared/payments/remainder'
import type { Booking } from '../api/bookings'
import type { GameDetail, GameTeam } from '../api/games'
import { errorMessage } from '../api/errors'
import {
  createManualBooking,
  ownerCancelBooking,
  scheduleKey,
  statsKey,
  type OwnerStadium,
} from '../api/owner'
import { getAvailability, type TimeSlot } from '../api/stadiums'
import { BookingStatusBadge } from '../bookings/BookingStatusBadge'
import {
  BottomSheet,
  Button,
  Card,
  cx,
  ErrorState,
  Input,
  SkeletonList,
  useToast,
} from '../components'
import { formatMoney } from '../format'
import { DateStrip } from '../stadiums/SlotPicker'
import { availabilityKey } from '../stadiums/queries'
import { slotLabel } from '../stadiums/dates'
import { DiscountSheet } from './DiscountSheet'
import { GameTeamsMoney } from './GameCash'
import { OwnerTabScreen } from './OwnerTabScreen'
import { useGameTeamMarks, useRemainderMarks, type MarkKind } from './marks'
import {
  MarkButtons,
  MarkConfirmSheet,
  MarkedState,
  RemainderChip,
  TeamMarkConfirmSheet,
} from './RemainderMark'
import { useSchedule } from './queries'
import { SelectField } from './SelectField'
import { WithOwnerStadium } from './StadiumPicker'

/** Jadval: one day of the owner's stadium — bookings, free hours, walk-ins. */
export function OwnerSchedulePage() {
  const { t } = useTranslation()
  return (
    <OwnerTabScreen title={t('owner.tabs.schedule')}>
      <WithOwnerStadium>
        {(stadium) => <Schedule key={stadium.id} stadium={stadium} />}
      </WithOwnerStadium>
    </OwnerTabScreen>
  )
}

const CANCELLABLE = new Set(['pending', 'confirmed'])
/** The statuses that hold an hour (an expired hold or a cancellation frees it). */
const OCCUPYING = new Set(['pending', 'confirmed', 'completed'])

function Schedule({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const [today] = useState(() => tashkentToday())
  const [date, setDate] = useState(today)
  const schedule = useSchedule(stadium.id, date)
  // Free hours come from the public availability; a stadium players cannot see yet has none.
  const availability = useQuery({
    queryKey: availabilityKey(stadium.id, date),
    queryFn: () => getAvailability(stadium.id, date),
    enabled: stadium.status === 'approved',
  })
  const [open, setOpen] = useState<Booking | null>(null)
  const [walkIn, setWalkIn] = useState<string | null>(null)
  const [discount, setDiscount] = useState<TimeSlot | null>(null)
  const day = schedule.data?.[0]
  const bookings = day?.bookings ?? []
  const atHour = (slot: TimeSlot) =>
    bookings.find(
      (b) => formatTime(b.startsAt) === slot.startTime.slice(0, 5) && OCCUPYING.has(b.status),
    )
  const free = (availability.data?.slots ?? []).filter((s) => s.status === 'free')
  // A walk-in on an hour a team is waiting on cancels that team's game (backend rule): flag it.
  const waitingAt = new Set((day?.waitingGames ?? []).map((g) => formatTime(g.startsAt)))

  return (
    <>
      <DateStrip today={today} value={date} onChange={setDate} />
      {day && (
        <p className="text-sm text-secondary">
          {t('owner.schedule.summary', {
            booked: day.bookedSlots,
            total: day.totalSlots,
            revenue: formatMoney(day.revenue),
          })}
        </p>
      )}
      {stadium.status === 'approved' && (
        <Button
          variant="secondary"
          icon={Plus}
          disabled={free.length === 0}
          onClick={() => setWalkIn('')}
        >
          {t('owner.schedule.walkIn')}
        </Button>
      )}

      {schedule.isPending || availability.isLoading ? (
        <SkeletonList count={4} variant="item" />
      ) : schedule.isError || availability.isError ? (
        <ErrorState
          onRetry={() => {
            if (schedule.isError) void schedule.refetch()
            if (availability.isError) void availability.refetch()
          }}
        />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t('owner.tabs.schedule')}>
          {(day?.waitingGames ?? []).map((game) => (
            <li
              key={game.gameId}
              className="flex items-center gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning-text"
            >
              <Swords size={18} aria-hidden />
              {`${formatTime(game.startsAt)}–${formatTime(game.endsAt)} · ${t(
                'owner.schedule.waitingGame',
                {
                  team: game.teamName ?? t('team.anonymous'),
                },
              )}`}
            </li>
          ))}
          {availability.data
            ? availability.data.slots.map((slot) => {
                const booking = atHour(slot)
                return (
                  <li key={slot.startTime}>
                    {booking ? (
                      <BookingRow booking={booking} onOpen={() => setOpen(booking)} />
                    ) : (
                      <SlotRow
                        slot={slot}
                        waiting={waitingAt.has(slot.startTime.slice(0, 5))}
                        onWalkIn={() => setWalkIn(slot.startTime.slice(0, 5))}
                        onDiscount={() => setDiscount(slot)}
                      />
                    )}
                  </li>
                )
              })
            : bookings.map((booking) => (
                <li key={booking.id}>
                  <BookingRow booking={booking} onOpen={() => setOpen(booking)} />
                </li>
              ))}
          {!availability.data && bookings.length === 0 && (
            <li className="py-6 text-center text-sm text-secondary">{t('owner.schedule.empty')}</li>
          )}
        </ul>
      )}

      {open && (
        <OwnerBookingSheet
          booking={open}
          stadium={stadium}
          date={date}
          onClose={() => setOpen(null)}
        />
      )}
      {discount && (
        <DiscountSheet
          stadiumId={stadium.id}
          date={date}
          slot={discount}
          onClose={() => setDiscount(null)}
        />
      )}
      {walkIn !== null && (
        <WalkInSheet
          stadium={stadium}
          date={date}
          free={free}
          waitingAt={waitingAt}
          initial={walkIn || free[0]?.startTime.slice(0, 5) || ''}
          onClose={() => setWalkIn(null)}
        />
      )}
    </>
  )
}

function BookingRow({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  const { t } = useTranslation()
  const who = booking.clientName ?? t('owner.booking.player')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left"
    >
      <span className="w-12 shrink-0 text-sm font-semibold text-primary">
        {formatTime(booking.startsAt)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="w-full truncate text-base font-medium text-primary">{who}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <BookingStatusBadge status={booking.status} />
          <RemainderChip booking={booking} />
        </span>
      </span>
      {/* The owner's own price, labelled: `price` (the player's) is only in the sheet. */}
      {booking.ownerPrice !== undefined && (
        <span className="flex shrink-0 flex-col items-end">
          <span className="text-xs text-secondary">{t('owner.booking.price')}</span>
          <span className="text-sm font-semibold text-primary">
            {formatMoney(booking.ownerPrice)}
          </span>
        </span>
      )}
    </button>
  )
}

function SlotRow({
  slot,
  waiting,
  onWalkIn,
  onDiscount,
}: {
  slot: TimeSlot
  waiting: boolean
  onWalkIn: () => void
  onDiscount: () => void
}) {
  const { t } = useTranslation()
  const free = slot.status === 'free'
  const label =
    slot.status === 'closed'
      ? t('owner.schedule.closed')
      : slot.status === 'past'
        ? t('owner.schedule.past')
        : t('owner.schedule.free')
  const time = slot.startTime.slice(0, 5)
  return (
    <div
      className={cx(
        'flex min-h-12 w-full items-center rounded-xl border border-dashed border-border',
        // Closed / past: a surface fill, not faded text — the label must stay readable.
        !free && 'bg-surface',
      )}
    >
      <button
        type="button"
        disabled={!free}
        onClick={onWalkIn}
        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 text-left"
      >
        <span className="w-24 shrink-0 text-sm text-secondary">{slotLabel(slot)}</span>
        <span className="flex-1 text-sm text-secondary">
          {waiting && free ? t('owner.schedule.waitingShort') : label}
        </span>
        {slot.discountPercent !== undefined && free && (
          <span className="text-xs font-semibold text-link">-{slot.discountPercent}%</span>
        )}
        {free && <Plus size={18} className="text-link" aria-hidden />}
      </button>
      {free && (
        <button
          type="button"
          onClick={onDiscount}
          aria-label={t('owner.discount.open', { time })}
          className="flex size-12 shrink-0 items-center justify-center border-l border-dashed border-border text-link"
        >
          <Percent size={18} aria-hidden />
        </button>
      )}
    </div>
  )
}

function OwnerBookingSheet({
  booking,
  stadium,
  date,
  onClose,
}: {
  booking: Booking
  stadium: OwnerStadium
  date: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  // E5–E8: "Naqd olindi" / "Toʻlanmadi" on the booking's remainder and their undo. The
  // sheet shows the booking it was opened with, so it closes after each; the refreshed
  // schedule shows the new state.
  const [marking, setMarking] = useState<MarkKind | null>(null)
  const marks = useRemainderMarks(stadium.id)
  const markPending = marks.cash.isPending || marks.notPaid.isPending || marks.undo.isPending
  const confirmMark = () => {
    const mutation = marking === 'cash' ? marks.cash : marks.notPaid
    mutation.mutate(booking.id, {
      onSuccess: onClose,
      onSettled: () => setMarking(null),
    })
  }
  // T10: a team game's teams carry their own marks; the sheet stays open on the
  // refreshed game after each.
  const [teamMarking, setTeamMarking] = useState<{
    kind: MarkKind
    team: GameTeam
    game: GameDetail
  } | null>(null)
  const teamMarks = useGameTeamMarks(stadium.id, booking.gameId ?? '')
  const teamPending =
    teamMarks.cash.isPending || teamMarks.notPaid.isPending || teamMarks.undo.isPending
  const confirmTeamMark = () => {
    if (!teamMarking) return
    const mutation = teamMarking.kind === 'cash' ? teamMarks.cash : teamMarks.notPaid
    mutation.mutate(teamMarking.team.side, { onSettled: () => setTeamMarking(null) })
  }
  const cancel = useMutation({
    mutationFn: () => ownerCancelBooking(booking.id),
    onSuccess: () => {
      toast.show(t('owner.booking.cancelled'), 'success')
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: scheduleKey(stadium.id, date) })
      void queryClient.invalidateQueries({ queryKey: availabilityKey(stadium.id, date) })
      void queryClient.invalidateQueries({ queryKey: statsKey(stadium.id) })
    },
  })
  // Every amount under its own label, in one fixed order; a row is hidden only when the
  // API leaves its field out. The cash row is what the owner collects, player-side.
  const cashReceived = remainderState(booking) === 'cashReceived'
  const rows: Array<{ key: string; label: string; value: number | undefined }> = [
    { key: 'ownerPrice', label: t('owner.booking.price'), value: booking.ownerPrice },
    { key: 'price', label: t('owner.booking.playerPays'), value: booking.price },
    { key: 'paidInApp', label: t('owner.booking.paidInApp'), value: booking.paidInApp },
    cashReceived
      ? { key: 'cash', label: t('owner.booking.cashReceived'), value: booking.paidInCash }
      : { key: 'cash', label: t('owner.booking.cashDue'), value: booking.remainingAmount },
    { key: 'ownerReceives', label: t('owner.booking.receives'), value: booking.ownerReceives },
  ]
  if (teamMarking) {
    return (
      <TeamMarkConfirmSheet
        kind={teamMarking.kind}
        team={teamMarking.team}
        startsAt={teamMarking.game.startsAt}
        endsAt={teamMarking.game.endsAt}
        stadiumName={stadium.name}
        pending={teamMarks.cash.isPending || teamMarks.notPaid.isPending}
        onConfirm={confirmTeamMark}
        onClose={() => setTeamMarking(null)}
      />
    )
  }
  if (marking) {
    return (
      <MarkConfirmSheet
        kind={marking}
        booking={booking}
        stadiumName={stadium.name}
        pending={marks.cash.isPending || marks.notPaid.isPending}
        onConfirm={confirmMark}
        onClose={() => setMarking(null)}
      />
    )
  }
  return (
    <BottomSheet
      open
      title={confirming ? t('owner.booking.cancelTitle') : t('owner.booking.title')}
      subtitle={confirming ? t('owner.booking.cancelText') : undefined}
      onClose={() => {
        if (!cancel.isPending && !markPending && !teamPending) onClose()
      }}
      actions={
        confirming ? (
          <>
            <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>
              {t('owner.booking.cancel')}
            </Button>
            <Button
              variant="secondary"
              disabled={cancel.isPending}
              onClick={() => setConfirming(false)}
            >
              {t('owner.cancel')}
            </Button>
          </>
        ) : undefined
      }
    >
      {!confirming && (
        <>
          <Card className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-md font-semibold text-primary">
                {booking.clientName ?? t('owner.booking.player')}
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>
            <span className="text-sm text-secondary">
              {`${formatTime(booking.startsAt)}–${formatTime(booking.endsAt)}`}
              {booking.isWalkin ? ` · ${t('owner.booking.walkIn')}` : ''}
            </span>
            {booking.clientPhone && (
              <a
                href={`tel:${booking.clientPhone}`}
                className="flex min-h-11 items-center gap-2 text-base font-semibold text-link"
              >
                <Phone size={16} aria-hidden />
                {booking.clientPhone}
              </a>
            )}
          </Card>
          <dl className="flex flex-col gap-2 text-base">
            {rows
              .filter((row) => row.value !== undefined)
              .map(({ key, label, value }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt className="text-secondary">{label}</dt>
                  <dd className="flex items-center gap-2 text-primary">
                    {key === 'cash' && <RemainderChip booking={booking} besideAmount />}
                    {formatMoney(value ?? 0)}
                  </dd>
                </div>
              ))}
          </dl>
          {booking.gameId && (
            <GameTeamsMoney
              gameId={booking.gameId}
              undoing={teamMarks.undo.isPending ? teamMarks.undo.variables : undefined}
              onMark={(kind, team, game) => setTeamMarking({ kind, team, game })}
              onUndo={(team) => teamMarks.undo.mutate(team.side)}
            />
          )}
          <MarkedState
            subject={booking}
            cashAmount={booking.paidInCash}
            undoing={marks.undo.isPending}
            onUndo={() => marks.undo.mutate(booking.id, { onSuccess: onClose })}
          />
          <MarkButtons booking={booking} onMark={setMarking} />
          {CANCELLABLE.has(booking.status) && (
            <Button variant="danger-outline" onClick={() => setConfirming(true)}>
              {t('owner.booking.cancel')}
            </Button>
          )}
        </>
      )}
    </BottomSheet>
  )
}

function WalkInSheet({
  stadium,
  date,
  free,
  waitingAt,
  initial,
  onClose,
}: {
  stadium: OwnerStadium
  date: string
  free: TimeSlot[]
  waitingAt: Set<string>
  initial: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [hour, setHour] = useState(initial)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const create = useMutation({
    // No payment method → the API records cash for the owner's own price.
    mutationFn: () =>
      createManualBooking(stadium.id, {
        clientName: name.trim(),
        clientPhone: phone.trim(),
        startsAt: tashkentToUtc(date, hour),
      }),
    onSuccess: () => {
      toast.show(t('owner.schedule.walkInDone'), 'success')
      void queryClient.invalidateQueries({ queryKey: scheduleKey(stadium.id, date) })
      void queryClient.invalidateQueries({ queryKey: availabilityKey(stadium.id, date) })
      void queryClient.invalidateQueries({ queryKey: statsKey(stadium.id) })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t('owner.schedule.walkInTitle')}
      onClose={() => {
        if (!create.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={!hour || !name.trim() || !phone.trim()}
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          {t('owner.save')}
        </Button>
      }
    >
      {free.length === 0 ? (
        <p className="text-sm text-secondary">{t('owner.schedule.noFreeHour')}</p>
      ) : (
        <SelectField
          label={t('owner.field.time')}
          value={hour}
          onChange={setHour}
          options={free.map((s) => ({ value: s.startTime.slice(0, 5), label: slotLabel(s) }))}
        />
      )}
      {waitingAt.has(hour) && (
        <p role="alert" className="rounded-xl bg-warning-soft p-3 text-sm text-warning-text">
          {t('owner.schedule.waitingWarning')}
        </p>
      )}
      <Input
        label={t('owner.field.clientName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label={t('owner.field.clientPhone')}
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {create.isError && (
        <p role="alert" className="text-sm text-danger-text">
          {errorMessage(create.error)}
        </p>
      )}
    </BottomSheet>
  )
}
