import { useTranslation } from 'react-i18next'
import { MONTH_KEYS } from '../format'
import { BottomSheet, cx } from '../components'
import { haptic } from '../telegram'
import { bookingMonths, dayTitle, isInBookingWindow, WEEKDAY_SHORT_KEYS } from './dates'

/**
 * The date strip's "Boshqa sana" sheet: the months the booking window touches,
 * whole. Today is marked, the window (today … 28 days) is pickable, and every
 * other day is shown but disabled, so where the window ends is visible.
 */
export function DatePickerSheet({
  today,
  value,
  onChange,
  onClose,
}: {
  today: string
  value: string
  onChange: (iso: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <BottomSheet open title={t('home.pickDateTitle')} onClose={onClose}>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_SHORT_KEYS.map((key) => (
          <span key={key} className="text-center text-xs font-medium text-secondary">
            {t(key)}
          </span>
        ))}
      </div>

      {bookingMonths(today).map((month) => (
        <section key={`${month.year}-${month.month}`} className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-primary capitalize">
            {t(MONTH_KEYS[month.month - 1] ?? MONTH_KEYS[0])}
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: month.days[0]?.dayOfWeek ?? 0 }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden />
            ))}
            {month.days.map((date) => {
              const selected = date.iso === value
              const isToday = date.iso === today
              const pickable = isInBookingWindow(date.iso, today)
              return (
                <button
                  key={date.iso}
                  type="button"
                  disabled={!pickable}
                  aria-label={dayTitle(date.iso)}
                  aria-pressed={selected}
                  aria-current={isToday ? 'date' : undefined}
                  onClick={() => {
                    haptic.selection()
                    onChange(date.iso)
                  }}
                  className={cx(
                    'flex h-12 items-center justify-center rounded-lg text-base font-medium',
                    selected
                      ? 'bg-accent text-on-accent'
                      : pickable
                        ? 'bg-surface text-primary'
                        : 'text-secondary opacity-40',
                    !selected && isToday && 'ring-1 ring-accent',
                  )}
                >
                  {date.day}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </BottomSheet>
  )
}
