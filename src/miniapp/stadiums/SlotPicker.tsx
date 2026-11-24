import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CalendarX, CircleCheck, Info } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatSomParts } from '../../shared/format'
import { getAvailability, type SlotStatus, type TimeSlot } from '../api/stadiums'
import { Button, Card, ErrorState, cx } from '../components'
import { formatMoney } from '../format'
import { haptic } from '../telegram'
import { bookingDates, dayTitle, nextDate, slotLabel, WEEKDAY_SHORT_KEYS } from './dates'
import { availabilityKey } from './queries'

/**
 * The date strip: the booking window (today to 4 weeks ahead), one day chosen.
 *
 * With `days` it shows only the first few — the home page shows a week and ends
 * the strip with a "Boshqa sana" chip (`onPickOther`) for the calendar sheet. A
 * day picked there that the strip does not show gets its own chip at the end,
 * so the chosen date is always on the strip, and scrolled into view.
 */
export function DateStrip({
  today,
  value,
  onChange,
  includeYesterday = false,
  days,
  onPickOther,
}: {
  today: string
  value: string
  onChange: (iso: string) => void
  /** Lead with yesterday — its working day is still running (see `dates.bookingDates`). */
  includeYesterday?: boolean
  /** Show only the first `days` days of the window instead of all of them. */
  days?: number
  /** Adds the trailing "Boshqa sana" chip, which opens the calendar sheet. */
  onPickOther?: () => void
}) {
  const { t } = useTranslation()
  const selected = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selected.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [value])

  const all = bookingDates(today, includeYesterday)
  const shown = days === undefined ? all : all.slice(0, days)
  const chosen = shown.some((date) => date.iso === value)
    ? null
    : (all.find((date) => date.iso === value) ?? null)
  const dates = chosen ? [...shown, chosen] : shown

  return (
    <div
      role="radiogroup"
      aria-label={t('slots.date')}
      className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none]"
    >
      {dates.map((date) => {
        const checked = date.iso === value
        // By date, not by position: yesterday may lead the strip.
        const label =
          date.iso === today
            ? t('slots.today')
            : date.iso === nextDate(today)
              ? t('slots.tomorrow')
              : t(WEEKDAY_SHORT_KEYS[date.dayOfWeek] ?? WEEKDAY_SHORT_KEYS[0])
        return (
          <button
            key={date.iso}
            ref={checked ? selected : undefined}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => {
              haptic.selection()
              onChange(date.iso)
            }}
            className={cx(
              'flex h-14.5 w-15.5 shrink-0 flex-col items-center justify-center gap-1 rounded-xl',
              checked ? 'bg-accent text-on-accent' : 'bg-surface',
            )}
          >
            <span className={cx('text-xs font-medium', !checked && 'text-secondary')}>{label}</span>
            <span className={cx('text-lg font-semibold', !checked && 'text-primary')}>
              {date.day}
            </span>
          </button>
        )
      })}
      {onPickOther && (
        <button
          type="button"
          onClick={() => {
            haptic.selection()
            onPickOther()
          }}
          className="flex h-14.5 shrink-0 items-center gap-2 rounded-xl bg-surface px-4 text-primary"
        >
          <CalendarDays size={20} aria-hidden />
          <span className="text-sm font-medium whitespace-nowrap">{t('home.otherDate')}</span>
        </button>
      )}
    </div>
  )
}

/** The pill on an hour that cannot be booked, by `TimeSlot.status`. */
const UNAVAILABLE_KEYS = {
  booked: 'slots.booked',
  closed: 'slots.closed',
  past: 'slots.past',
} as const satisfies Record<Exclude<SlotStatus, 'free'>, string>

function SlotRow({
  slot,
  checked,
  onSelect,
}: {
  slot: TimeSlot
  checked: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const label = slotLabel(slot)
  const price = slot.available ? slot.pricePerHour : undefined
  // An hour after midnight belongs to this working day but happens the next morning.
  const night = slot.afterMidnight === true ? t('slots.night') : undefined
  const nightPill =
    night === undefined ? null : (
      <span className="rounded-sm bg-neutral-soft px-2 py-0.5 text-2xs font-semibold text-secondary">
        {night}
      </span>
    )

  if (price === undefined) {
    const state =
      slot.status === 'free' || !(slot.status in UNAVAILABLE_KEYS)
        ? t('slots.unavailable')
        : t(UNAVAILABLE_KEYS[slot.status])
    return (
      <button
        type="button"
        role="radio"
        aria-checked={false}
        aria-label={night === undefined ? `${label}, ${state}` : `${label}, ${night}, ${state}`}
        disabled
        className="flex min-h-13 items-center gap-2 rounded-xl border border-border bg-surface px-4"
      >
        <span className="text-md font-semibold text-secondary">{label}</span>
        {nightPill}
        <span className="flex-1" />
        <span className="rounded-sm bg-border px-3 py-1 text-xs font-semibold text-secondary">
          {state}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={
        night === undefined
          ? `${label}, ${formatMoney(price)}`
          : `${label}, ${night}, ${formatMoney(price)}`
      }
      onClick={() => {
        haptic.selection()
        onSelect()
      }}
      className={cx(
        'flex min-h-13 items-center gap-2 rounded-xl px-4 py-3 text-left',
        checked ? 'bg-accent text-on-accent' : 'border border-border bg-background text-primary',
      )}
    >
      <span className="flex flex-col gap-2">
        <span className="flex items-center gap-2">
          <span className="text-md font-semibold whitespace-nowrap">{label}</span>
          {nightPill}
        </span>
        {slot.hasWaitingGame && (
          <span className="self-start rounded-xl bg-warning-soft px-3 py-2 text-xs font-semibold text-warning-text">
            {t('slots.waitingGame')}
          </span>
        )}
      </span>
      <span className="flex-1" />
      {slot.originalPrice !== undefined && (
        <span
          className={cx('text-sm whitespace-nowrap line-through', !checked && 'text-secondary')}
        >
          {formatSomParts(slot.originalPrice).amount}
        </span>
      )}
      <span className="text-md font-medium whitespace-nowrap">{formatMoney(price)}</span>
      {slot.discountPercent !== undefined && (
        <span
          className={cx(
            'rounded-xs px-2 py-1 text-2xs font-bold',
            checked ? 'bg-on-accent text-accent' : 'bg-accent-soft text-link-text',
          )}
        >
          -{slot.discountPercent}%
        </span>
      )}
      {checked ? (
        <CircleCheck size={22} aria-hidden />
      ) : (
        <span className="size-5 shrink-0 rounded-full border border-border" aria-hidden />
      )}
    </button>
  )
}

/**
 * The hours of one day from GET /api/stadiums/{id}/availability, each with
 * its own player price. Exactly one can be chosen (CLAUDE.md: one slot per
 * booking); unavailable hours are disabled.
 */
export function SlotList({
  stadiumId,
  date,
  selected,
  onSelect,
  onDateChange,
  lastDate,
}: {
  stadiumId: string
  date: string
  selected: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
  onDateChange: (iso: string) => void
  lastDate: string
}) {
  const { t } = useTranslation()
  const availability = useQuery({
    queryKey: availabilityKey(stadiumId, date),
    queryFn: () => getAvailability(stadiumId, date),
  })
  const slots = availability.data?.slots ?? []
  const anyFree = slots.some((slot) => slot.available)
  const following = nextDate(date)

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`slots-${date}`}>
      <h3 id={`slots-${date}`} className="flex h-11 items-center text-title font-bold text-primary">
        {dayTitle(date)}
      </h3>
      {availability.isPending ? (
        <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-13 rounded-xl bg-skeleton motion-safe:animate-pulse" />
          ))}
        </div>
      ) : availability.isError ? (
        <ErrorState onRetry={() => void availability.refetch()} />
      ) : !anyFree ? (
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-bar text-secondary">
            <CalendarX size={26} aria-hidden />
          </span>
          <h4 className="text-lg font-semibold text-primary">{t('slots.emptyTitle')}</h4>
          <p className="text-sm text-secondary">{t('slots.emptyText')}</p>
          {following <= lastDate && (
            <Button variant="ghost" onClick={() => onDateChange(following)}>
              {t('slots.seeDay', { day: dayTitle(following) })}
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div role="radiogroup" aria-label={t('slots.time')} className="flex flex-col gap-3">
            {slots.map((slot) => (
              <SlotRow
                key={slot.startTime}
                slot={slot}
                checked={selected?.startTime === slot.startTime}
                onSelect={() => onSelect(slot)}
              />
            ))}
          </div>
          {slots.some((slot) => slot.afterMidnight === true) && (
            <p className="flex gap-2 px-1 pt-2 text-xs text-secondary">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              {t('slots.nightHint')}
            </p>
          )}
          {slots.some((slot) => slot.hasWaitingGame) && (
            <p className="flex gap-2 px-1 pt-2 text-xs text-secondary">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              {t('slots.waitingHint')}
            </p>
          )}
        </>
      )}
    </section>
  )
}
