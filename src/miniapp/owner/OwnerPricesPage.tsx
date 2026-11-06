import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { somToTiyin } from '../../shared/format'
import { errorMessage } from '../api/errors'
import {
  addPricing,
  OWNER_STADIUMS_KEY,
  pricingKey,
  removePricing,
  updatePricing,
  updateStadium,
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
import { checkPrice } from './stadiumRules'

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

/** A tiyin price as whole soʻm for the field; empty when it is not whole (never rounded). */
const somField = (tiyin: number | undefined) =>
  tiyin !== undefined && tiyin % 100 === 0 ? String(tiyin / 100) : ''

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
  const [editing, setEditing] = useState<PricingRule | 'new' | null>(null)
  const [editingBase, setEditingBase] = useState(false)
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
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold text-primary">{formatMoney(stadium.pricePerHour)}</p>
            <button
              type="button"
              aria-label={t('owner.prices.editBase')}
              onClick={() => setEditingBase(true)}
              className="flex size-11 items-center justify-center text-link"
            >
              <Pencil size={18} aria-hidden />
            </button>
          </div>
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
                onEdit={() => setEditing(rule)}
                onRemove={() => remove.mutate(rule.id)}
              />
            ))}
          </ul>
        </Card>
      )}
      <Button variant="ghost" icon={Plus} onClick={() => setEditing('new')}>
        {t('owner.prices.add')}
      </Button>
      {editing && (
        <RuleSheet
          stadiumId={stadium.id}
          rule={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {editingBase && <BasePriceSheet stadium={stadium} onClose={() => setEditingBase(false)} />}
    </>
  )
}

function RuleRow({
  rule,
  busy,
  onEdit,
  onRemove,
}: {
  rule: PricingRule
  busy: boolean
  onEdit: () => void
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
        aria-label={t('owner.editItem', { item: label })}
        onClick={onEdit}
        className="flex size-11 items-center justify-center text-link"
      >
        <Pencil size={18} aria-hidden />
      </button>
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

/** Adds a rule, or edits `rule` (the API takes one weekday per rule either way). */
function RuleSheet({
  stadiumId,
  rule,
  onClose,
}: {
  stadiumId: string
  rule?: PricingRule
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [day, setDay] = useState(String(rule?.dayOfWeek ?? 0))
  const [from, setFrom] = useState(rule ? hhmm(rule.startTime) : '18:00')
  const [to, setTo] = useState(rule ? hhmm(rule.endTime) : '23:00')
  const [price, setPrice] = useState(somField(rule?.pricePerHour))
  const som = Number(price.replace(/\D/g, ''))
  const add = useMutation({
    mutationFn: () => {
      const body = {
        dayOfWeek: Number(day),
        startTime: `${from}:00`,
        endTime: `${to}:00`,
        pricePerHour: somToTiyin(som),
      }
      return rule ? updatePricing(stadiumId, rule.id, body) : addPricing(stadiumId, body)
    },
    onSuccess: () => {
      toast.show(t(rule ? 'owner.prices.updated' : 'owner.prices.added'), 'success')
      void queryClient.invalidateQueries({ queryKey: pricingKey(stadiumId) })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t(rule ? 'owner.prices.edit' : 'owner.prices.add')}
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
          {t(rule ? 'owner.save' : 'owner.add')}
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

/** The owner's own base hourly price: `PUT /api/owner/stadiums/{id}` with `pricePerHour`. */
function BasePriceSheet({ stadium, onClose }: { stadium: OwnerStadium; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [price, setPrice] = useState(somField(stadium.pricePerHour))
  const som = Number(price || '0')
  const save = useMutation({
    mutationFn: () => updateStadium(stadium.id, { pricePerHour: somToTiyin(som) }),
    onSuccess: () => {
      toast.show(t('owner.saved'), 'success')
      void queryClient.invalidateQueries({ queryKey: OWNER_STADIUMS_KEY })
      onClose()
    },
  })
  return (
    <BottomSheet
      open
      title={t('owner.prices.base')}
      onClose={() => {
        if (!save.isPending) onClose()
      }}
      actions={
        <Button
          haptic
          disabled={checkPrice(som) !== null}
          loading={save.isPending}
          onClick={() => save.mutate()}
        >
          {t('owner.save')}
        </Button>
      }
    >
      <p className="text-sm text-secondary">{t('owner.prices.baseText')}</p>
      <Input
        label={t('owner.field.price')}
        inputMode="numeric"
        value={price}
        hint={t('owner.wizard.priceHint')}
        error={price !== '' && checkPrice(som) ? t('owner.rules.priceRange') : undefined}
        onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, 9))}
      />
      {save.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(save.error)}
        </p>
      )}
    </BottomSheet>
  )
}
