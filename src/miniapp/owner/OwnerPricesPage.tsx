import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin } from '../../shared/format'
import { errorMessage } from '../api/errors'
import {
  addPricing,
  pricingKey,
  removePricing,
  type OwnerStadium,
  type PricingRule,
} from '../api/owner'
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  SkeletonList,
  useToast,
} from '../components'
import { formatMoney } from '../format'
import { OwnerStadiumSubPage } from './OwnerStadiumSubPage'
import { usePricing } from './queries'
import { SelectField } from './SelectField'

const WEEKDAY_KEYS = [
  'weekdays.long.mon',
  'weekdays.long.tue',
  'weekdays.long.wed',
  'weekdays.long.thu',
  'weekdays.long.fri',
  'weekdays.long.sat',
  'weekdays.long.sun',
] as const

const hhmm = (time: string) => time.slice(0, 5)

/** Narxlar: the base price and the per-day hour rules, in the owner's own prices. */
export function OwnerPricesPage() {
  const { t } = useTranslation()
  return (
    <OwnerStadiumSubPage title={t('owner.prices.title')}>
      {(stadium) => <Prices stadium={stadium} />}
    </OwnerStadiumSubPage>
  )
}

function Prices({ stadium }: { stadium: OwnerStadium }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const rules = usePricing(stadium.id)
  const [adding, setAdding] = useState(false)
  const remove = useMutation({
    mutationFn: (id: string) => removePricing(stadium.id, id),
    onSuccess: () => {
      toast.show(t('owner.prices.removed'), 'success')
      void queryClient.invalidateQueries({ queryKey: pricingKey(stadium.id) })
    },
    onError: (error) => toast.show(errorMessage(error), 'danger'),
  })
  const active = (rules.data ?? [])
    .filter((r) => r.isActive)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))

  return (
    <>
      {stadium.pricePerHour !== undefined && (
        <Card className="flex flex-col gap-1 p-4">
          <p className="text-sm text-secondary">{t('owner.section.prices')}</p>
          <p className="text-2xl font-bold text-primary">{formatMoney(stadium.pricePerHour)}</p>
          {stadium.playerPrice !== undefined && (
            <p className="text-sm text-secondary">
              {t('owner.prices.player', { price: formatMoney(stadium.playerPrice) })}
            </p>
          )}
        </Card>
      )}
      {rules.isPending ? (
        <SkeletonList count={3} variant="item" />
      ) : rules.isError ? (
        <ErrorState onRetry={() => void rules.refetch()} />
      ) : active.length === 0 ? (
        <EmptyState title={t('owner.prices.empty')} />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border" aria-label={t('owner.prices.title')}>
            {active.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                busy={remove.isPending}
                onRemove={() => remove.mutate(rule.id)}
              />
            ))}
          </ul>
        </Card>
      )}
      <Button variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
        {t('owner.prices.add')}
      </Button>
      {adding && <AddRuleSheet stadiumId={stadium.id} onClose={() => setAdding(false)} />}
    </>
  )
}

function RuleRow({
  rule,
  busy,
  onRemove,
}: {
  rule: PricingRule
  busy: boolean
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const day = t(WEEKDAY_KEYS[rule.dayOfWeek] ?? WEEKDAY_KEYS[0])
  const label = `${day}, ${hhmm(rule.startTime)}–${hhmm(rule.endTime)}`
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base text-primary">{label}</span>
        {rule.playerPrice !== undefined && (
          <span className="text-xs text-secondary">
            {t('owner.prices.player', { price: formatMoney(rule.playerPrice) })}
          </span>
        )}
      </div>
      <span className="text-base font-semibold text-primary">{formatMoney(rule.pricePerHour)}</span>
      <button
        type="button"
        aria-label={t('owner.removeItem', { item: label })}
        disabled={busy}
        onClick={onRemove}
        className="flex size-11 items-center justify-center text-danger disabled:opacity-50"
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </li>
  )
}

function AddRuleSheet({ stadiumId, onClose }: { stadiumId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [day, setDay] = useState('0')
  const [from, setFrom] = useState('18:00')
  const [to, setTo] = useState('23:00')
  const [price, setPrice] = useState('')
  const som = Number(price.replace(/\D/g, ''))
  const add = useMutation({
    mutationFn: () =>
      addPricing(stadiumId, {
        dayOfWeek: Number(day),
        startTime: `${from}:00`,
        endTime: `${to}:00`,
        pricePerHour: somToTiyin(som),
      }),
    onSuccess: () => {
      toast.show(t('owner.prices.added'), 'success')
      void queryClient.invalidateQueries({ queryKey: pricingKey(stadiumId) })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t('owner.prices.add')}
      onClose={() => {
        if (!add.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={som <= 0 || from >= to || !from.endsWith(':00') || !to.endsWith(':00')}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          {t('owner.add')}
        </Button>
      }
    >
      <SelectField
        label={t('owner.field.day')}
        value={day}
        onChange={setDay}
        options={WEEKDAY_KEYS.map((key, i) => ({ value: String(i), label: t(key) }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('owner.field.from')}
          type="time"
          step={3600}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          label={t('owner.field.to')}
          type="time"
          step={3600}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Input
        label={t('owner.field.price')}
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 9))}
      />
      {add.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(add.error)}
        </p>
      )}
    </BottomSheet>
  )
}
