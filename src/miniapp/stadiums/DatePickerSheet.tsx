import { useTranslation } from 'react-i18next'
import { MONTH_KEYS } from '../format'
import { BottomSheet, cx } from '../components'
import { haptic } from '../telegram'
import { bookingDates, dayTitle, WEEKDAY_SHORT_KEYS } from './dates'

/** The calendar button's sheet: the booking window (today … 28 days) as a month grid. */
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
  const dates = bookingDates(today)
  const leadingBlanks = dates[0]?.dayOfWeek ?? 0
  return (
    <BottomSheet open title={t('home.pickDateTitle')} onClose={onClose}>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_SHORT_KEYS.map((key) => (
          <span key={key} className="text-center text-xs font-medium text-secondary">
            {t(key)}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {dates.map((date, i) => {
          const selected = date.iso === value
          const showMonth = i === 0 || date.day === 1
          const month = Number(date.iso.slice(5, 7))
          return (
            <button
              key={date.iso}
              type="button"
              aria-label={dayTitle(date.iso)}
              aria-pressed={selected}
              onClick={() => {
                haptic.selection()
                onChange(date.iso)
              }}
              className={cx(
                'flex h-12 flex-col items-center justify-center rounded-lg text-base font-medium',
                selected ? 'bg-accent text-on-accent' : 'bg-surface text-primary',
              )}
            >
              {date.day}
              {showMonth && (
                <span
                  className={cx('text-2xs leading-none', !selected && 'text-secondary')}
                  aria-hidden
                >
                  {t(MONTH_KEYS[month - 1] ?? MONTH_KEYS[0]).slice(0, 3)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
