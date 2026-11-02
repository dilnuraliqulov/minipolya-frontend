import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tashkentToUtc } from '../../shared/format'
import { errorMessage } from '../api/errors'
import {
  createPromotion,
  deactivatePromotion,
  getPromotions,
  promotionsKey,
  scheduleKey,
} from '../api/owner'
import type { TimeSlot } from '../api/stadiums'
import { Badge, BottomSheet, Button, Input, useToast } from '../components'
import { formatLongDate, formatMoney } from '../format'
import { slotLabel } from '../stadiums/dates'
import { availabilityKey } from '../stadiums/queries'

const HOUR_MS = 3_600_000

/**
 * The promotion window for one hour. `endsAt` is inclusive in the backend, so
 * it stops one second before the next hour starts.
 */
function hourWindow(date: string, slot: TimeSlot): { startsAt: string; endsAt: string } {
  const startsAt = tashkentToUtc(date, slot.startTime.slice(0, 5))
  const endsAt = new Date(Date.parse(startsAt) + HOUR_MS - 1000).toISOString()
  return { startsAt, endsAt }
}

/** Digits only, 1–100; anything else is not a discount the API accepts. */
function percentOf(text: string): number | undefined {
  if (!/^\d{1,3}$/.test(text)) return undefined
  const value = Number(text)
  return value >= 1 && value <= 100 ? value : undefined
}

/**
 * "Narxni oʻzgartirish" for one free hour. The backend's tool for this is a
 * promotion (a discount percent over a time window), so the owner sets a
 * discount; the player price comes back from availability.
 */
export function DiscountSheet({
  stadiumId,
  date,
  slot,
  onClose,
}: {
  stadiumId: string
  date: string
  slot: TimeSlot
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const hour = hourWindow(date, slot)
  const time = slot.startTime.slice(0, 5)
  const promotions = useQuery({
    queryKey: promotionsKey(stadiumId),
    queryFn: () => getPromotions(stadiumId),
  })
  // Only a promotion made for exactly this hour can be changed here; a wider
  // one (a whole day, a season) stays as it is.
  const own = (promotions.data?.content ?? []).filter(
    (p) => p.isActive && Date.parse(p.startsAt) === Date.parse(hour.startsAt),
  )
  const [text, setText] = useState(
    slot.discountPercent !== undefined ? String(slot.discountPercent) : '',
  )
  const percent = percentOf(text)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: promotionsKey(stadiumId) })
    void queryClient.invalidateQueries({ queryKey: availabilityKey(stadiumId, date) })
    void queryClient.invalidateQueries({ queryKey: scheduleKey(stadiumId, date) })
  }
  const save = useMutation({
    mutationFn: async (discountPercent: number) => {
      for (const p of own) await deactivatePromotion(p.id)
      return createPromotion(stadiumId, {
        name: t('owner.discount.name', { time }),
        discountPercent,
        ...hour,
      })
    },
    onSuccess: () => {
      toast.show(t('owner.discount.saved'), 'success')
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: async () => {
      for (const p of own) await deactivatePromotion(p.id)
    },
    onSuccess: () => {
      toast.show(t('owner.discount.removed'), 'success')
      onClose()
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
    onSettled: refresh,
  })
  const busy = save.isPending || remove.isPending

  return (
    <BottomSheet
      open
      title={t('owner.discount.title')}
      subtitle={`${formatLongDate(date)} · ${slotLabel(slot)}`}
      onClose={() => {
        if (!busy) onClose()
      }}
      actions={
        <>
          <Button
            haptic
            disabled={percent === undefined || busy}
            loading={save.isPending}
            onClick={() => percent !== undefined && save.mutate(percent)}
          >
            {t('owner.save')}
          </Button>
          {own.length > 0 && (
            <Button
              variant="danger-outline"
              disabled={busy}
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {t('owner.discount.remove')}
            </Button>
          )}
        </>
      }
    >
      {slot.pricePerHour !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-3 text-base">
          <span className="text-secondary">{t('owner.discount.playersSee')}</span>
          <span className="flex items-center gap-2">
            {slot.originalPrice !== undefined && (
              <span className="text-sm text-secondary line-through">
                {formatMoney(slot.originalPrice)}
              </span>
            )}
            <span className="font-semibold text-primary">{formatMoney(slot.pricePerHour)}</span>
            {slot.discountPercent !== undefined && (
              <Badge tone="accent">-{slot.discountPercent}%</Badge>
            )}
          </span>
        </div>
      )}
      <Input
        label={t('owner.discount.percent')}
        inputMode="numeric"
        maxLength={3}
        value={text}
        onChange={(event) => setText(event.target.value.replace(/\D/g, ''))}
        hint={t('owner.discount.hint')}
      />
      <p className="text-sm text-secondary">{t('owner.discount.note')}</p>
    </BottomSheet>
  )
}
