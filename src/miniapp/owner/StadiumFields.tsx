import { Check, ChevronDown, Minus, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../shared/format'
import type { Amenities } from '../api/stadiums'
import { DISTRICTS, FORMATS } from '../api/stadiums'
import { BottomSheet, Input, OptionList } from '../components'
import { cx } from '../components/cx'
import { formatPhoneInput } from '../profile/phone'
import { FACILITIES } from '../stadiums/facilities'
import { formatLabel, SURFACE_KEYS } from '../stadiums/labels'
import { haptic } from '../telegram'
import { hourLabel, STADIUM_LIMITS } from './stadiumRules'

/** A segmented choice (the design's Format / Qoplama rows): radios, 44px. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium text-secondary">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex gap-1 rounded-xl bg-surface p-1"
      >
        {options.map((option) => {
          const checked = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => {
                haptic.selection()
                onChange(option.value)
              }}
              className={cx(
                'min-h-11 min-w-0 flex-1 rounded-lg px-2 text-sm font-medium transition-colors',
                checked ? 'bg-background text-primary shadow-sm' : 'text-secondary',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FormatField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <Segmented
      label={t('owner.field.format')}
      value={value}
      onChange={onChange}
      options={FORMATS.map((f) => ({ value: f, label: formatLabel(f) }))}
    />
  )
}

export function SurfaceField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Segmented
      label={t('owner.field.surface')}
      value={value}
      onChange={onChange}
      options={(['artificial', 'natural', 'hybrid'] as const).map((s) => ({
        value: s,
        label: t(SURFACE_KEYS[s]),
      }))}
    />
  )
}

/** "+998 XX XXX XX XX" as typed; the caller sends `toWirePhone`. */
export function PhoneField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <Input
      label={t('owner.field.phone')}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      error={error}
      onChange={(e) => onChange(formatPhoneInput(e.target.value))}
    />
  )
}

/** The district from a sheet (design "2 Joylashuv – Tuman tanlash"); no default. */
export function DistrictField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const labelId = useId()
  const noteId = useId()
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium text-secondary">
        {t('owner.field.district')}
      </span>
      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        aria-describedby={error ? noteId : undefined}
        aria-invalid={error ? true : undefined}
        onClick={() => setOpen(true)}
        className={cx(
          'flex h-12 items-center gap-2 rounded-xl border bg-background px-4 text-left text-lg',
          error ? 'border-danger-text' : 'border-border',
        )}
      >
        <span className={cx('min-w-0 flex-1 truncate', value ? 'text-primary' : 'text-secondary')}>
          {value || t('owner.field.districtPlaceholder')}
        </span>
        <ChevronDown size={18} className="shrink-0 text-secondary" aria-hidden />
      </button>
      {error && (
        <p id={noteId} className="text-xs text-danger-text">
          {error}
        </p>
      )}
      <BottomSheet
        open={open}
        title={t('owner.field.districtPlaceholder')}
        onClose={() => setOpen(false)}
      >
        <OptionList
          label={t('owner.field.district')}
          value={value}
          options={DISTRICTS.map((d) => ({ value: d, label: d }))}
          onChange={(district) => {
            onChange(district)
            setOpen(false)
          }}
        />
      </BottomSheet>
    </div>
  )
}

/** A multi-line field with a "12/500" counter. */
export function TextAreaField({
  label,
  value,
  onChange,
  max,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  max: number
  placeholder?: string
  error?: string
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-secondary">
        {label}
      </label>
      <div
        className={cx(
          'flex flex-col gap-1 rounded-xl border bg-background px-4 py-3 focus-within:border-accent',
          error ? 'border-danger-text' : 'border-border',
        )}
      >
        <textarea
          id={id}
          value={value}
          rows={4}
          maxLength={max}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-20 resize-none bg-transparent text-md text-primary outline-none placeholder:text-secondary"
        />
        <span className="self-end text-xs text-secondary tabular-nums">
          {t('owner.field.counter', { count: value.length, max })}
        </span>
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  )
}

export function DescriptionField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <TextAreaField
      label={t('owner.field.description')}
      placeholder={t('owner.field.descriptionPlaceholder')}
      value={value}
      onChange={onChange}
      max={STADIUM_LIMITS.descriptionMax}
      error={error}
    />
  )
}

/** The ten facilities as toggle chips with icons (`aria-pressed`). */
export function FacilityChips({
  value,
  onChange,
}: {
  value: Amenities
  onChange: (next: Amenities) => void
}) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t('owner.section.facilities')}>
      {FACILITIES.map(({ key, icon: Icon, label }) => {
        const on = value[key]
        return (
          <li key={key}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => {
                haptic.selection()
                onChange({ ...value, [key]: !on })
              }}
              className={cx(
                'flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-base font-medium transition-colors',
                on
                  ? 'border-accent bg-accent-soft text-link-text'
                  : 'border-border bg-background text-primary',
              )}
            >
              <Icon size={18} className={on ? 'text-link' : 'text-secondary'} aria-hidden />
              {t(label)}
              {on && <Check size={16} aria-hidden />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** One time of day in whole hours, −/+ (design "5 Ish vaqti va narx"; D15). */
export function HourStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 23,
}: {
  label: string
  value: number
  onChange: (hour: number) => void
  min?: number
  max?: number
}) {
  const { t } = useTranslation()
  const labelId = useId()
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span id={labelId} className="text-sm font-medium text-secondary">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex h-12 items-center rounded-xl border border-border bg-background"
      >
        <button
          type="button"
          aria-label={t('owner.wizard.earlier', { label })}
          disabled={value <= min}
          onClick={() => {
            haptic.selection()
            onChange(value - 1)
          }}
          className="flex size-11 shrink-0 items-center justify-center text-primary disabled:opacity-30"
        >
          <Minus size={18} aria-hidden />
        </button>
        <output
          aria-live="polite"
          className="min-w-0 flex-1 text-center text-lg font-semibold text-primary tabular-nums"
        >
          {hourLabel(value)}
        </output>
        <button
          type="button"
          aria-label={t('owner.wizard.later', { label })}
          disabled={value >= max}
          onClick={() => {
            haptic.selection()
            onChange(value + 1)
          }}
          className="flex size-11 shrink-0 items-center justify-center text-primary disabled:opacity-30"
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/** Whole soʻm, shown grouped ("150 000"); `value` is digits only. */
export function SomField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string
  value: string
  onChange: (digits: string) => void
  hint?: string
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <Input
      label={label}
      inputMode="numeric"
      autoComplete="off"
      value={value === '' ? '' : formatNumber(Number(value))}
      hint={hint}
      error={error}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
      trailing={<span className="text-base text-secondary">{t('money.unit')}</span>}
    />
  )
}
