import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Switch, cx } from '../components'
import { haptic } from '../telegram'
import { SelectField } from './SelectField'
import { HourStepper } from './StadiumFields'
import {
  closingLabel,
  closingOptions,
  dayName,
  everyDaySame,
  hoursSummary,
  isSameEveryDay,
  sameEveryDay,
  type DayHours,
} from './hours'
import { hourLabel } from './stadiumRules'

/**
 * "Har kuni bir xil" or "Har kun alohida": the stadium's weekly opening schedule, as the
 * wizard's "Ish vaqti va narx" step and Maydonim → Ish vaqti both edit it. Closing times
 * after midnight read "02:00 (ertasi kuni)"; the summary line underneath says what the
 * week adds up to.
 */
export function WeeklyHoursEditor({
  days,
  onChange,
  error,
}: {
  days: DayHours[]
  onChange: (days: DayHours[]) => void
  error?: string
}) {
  const { t } = useTranslation()
  // The chosen mode, not derived from the data: a week that happens to be uniform is still
  // being edited day by day once the owner has said so.
  const [uniform, setUniform_] = useState(() => isSameEveryDay(days))
  const { open, close } = everyDaySame(days)

  const setDay = (dayOfWeek: number, next: Partial<DayHours>) => {
    onChange(
      days.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) return day
        const merged = { ...day, ...next }
        // A day that opens needs hours; one that closes keeps none.
        if (merged.closed) return { dayOfWeek, closed: true }
        const openHour = merged.open ?? open
        let closeHour = merged.close ?? close
        // Changing the opening can invalidate the chosen closing; take the first option.
        const options = closingOptions(openHour)
        if (!options.includes(closeHour)) closeHour = options[0] ?? 0
        return { dayOfWeek, closed: false, open: openHour, close: closeHour }
      }),
    )
  }

  const setUniform = (nextOpen: number, nextClose: number) => {
    const options = closingOptions(nextOpen)
    onChange(sameEveryDay(nextOpen, options.includes(nextClose) ? nextClose : (options[0] ?? 0)))
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t('owner.hours.mode')} className="flex gap-2">
        {(
          [
            ['same', t('owner.hours.modeSame')],
            ['perDay', t('owner.hours.modePerDay')],
          ] as const
        ).map(([mode, label]) => {
          const checked = mode === 'same' ? uniform : !uniform
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => {
                haptic.selection()
                // Switching seeds the other shape from this one, so nothing is lost: the
                // uniform pair comes from the first open day, and the seven rows keep
                // whatever they already hold.
                setUniform_(mode === 'same')
                if (mode === 'same') setUniform(open, close)
              }}
              className={cx(
                'min-h-11 flex-1 rounded-xl px-3 text-sm font-medium',
                checked ? 'bg-accent text-on-accent' : 'bg-surface text-primary',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {uniform ? (
        <div className="flex gap-3">
          <HourStepper
            label={t('owner.wizard.open')}
            value={open}
            onChange={(next) => setUniform(next, close)}
          />
          <SelectField
            label={t('owner.wizard.close')}
            value={String(close)}
            onChange={(next) => setUniform(open, Number(next))}
            options={closingOptions(open).map((hour) => ({
              value: String(hour),
              label: closingLabel(open, hour),
            }))}
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {days.map((day) => (
            <li
              key={day.dayOfWeek}
              className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
            >
              <span className="w-7 shrink-0 text-sm font-semibold text-primary">
                {dayName(day.dayOfWeek)}
              </span>
              {day.closed ? (
                <span className="flex-1 text-sm text-secondary">
                  {t('owner.hours.closedSwitch')}
                </span>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <select
                    aria-label={`${dayName(day.dayOfWeek)} ${t('owner.wizard.open')}`}
                    value={String(day.open ?? open)}
                    onChange={(event) =>
                      setDay(day.dayOfWeek, { open: Number(event.target.value) })
                    }
                    className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-primary"
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {hourLabel(hour)}
                      </option>
                    ))}
                  </select>
                  <span aria-hidden className="text-secondary">
                    –
                  </span>
                  <select
                    aria-label={`${dayName(day.dayOfWeek)} ${t('owner.wizard.close')}`}
                    value={String(day.close ?? close)}
                    onChange={(event) =>
                      setDay(day.dayOfWeek, { close: Number(event.target.value) })
                    }
                    className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-primary"
                  >
                    {closingOptions(day.open ?? open).map((hour) => (
                      <option key={hour} value={hour}>
                        {closingLabel(day.open ?? open, hour)}
                      </option>
                    ))}
                  </select>
                </span>
              )}
              <Switch
                label={`${dayName(day.dayOfWeek)} ${t('owner.hours.closedSwitch')}`}
                checked={day.closed}
                onChange={(closed) => setDay(day.dayOfWeek, { closed })}
              />
            </li>
          ))}
        </ul>
      )}

      {error !== undefined ? (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      ) : (
        <p className="text-sm font-medium text-primary">{hoursSummary(days)}</p>
      )}
    </div>
  )
}
