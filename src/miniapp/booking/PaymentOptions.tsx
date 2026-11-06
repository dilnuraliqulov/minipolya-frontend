import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { PaymentOption } from '../api/bookings'
import { cx } from '../components'
import { formatMoney } from '../format'

/**
 * "Toʻlov turi" (design E12). With a deposit on the slot (`depositAmount` and
 * `remainderAmount` straight from the availability) the player chooses between
 * Oldindan toʻlov and Toʻliq toʻlov; without one there is no choice — only the
 * full price, shown as the one option.
 */
export function PaymentOptions({
  value,
  onChange,
  price,
  deposit,
  remainder,
  disabled,
}: {
  value: PaymentOption
  onChange: (option: PaymentOption) => void
  price: number
  deposit?: number
  remainder?: number
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const fullLabel = t('checkout.full', { amount: formatMoney(price) })

  if (deposit === undefined) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-accent bg-background px-4">
          <span className="flex-1 text-md font-medium text-primary">{fullLabel}</span>
          <Dot checked />
        </div>
        <p className="px-1 text-sm text-secondary">{t('checkout.fullOnly')}</p>
      </div>
    )
  }

  const options: Array<{ option: PaymentOption; label: string; note?: string }> = [
    {
      option: 'MINIMUM',
      label: t('checkout.deposit', { amount: formatMoney(deposit) }),
      note:
        remainder !== undefined
          ? t('checkout.remainderNote', { amount: formatMoney(remainder) })
          : t('checkout.remainderNoteGeneric'),
    },
    { option: 'FULL', label: fullLabel },
  ]
  return (
    <div role="radiogroup" aria-label={t('checkout.paymentType')} className="flex flex-col gap-3">
      {options.map(({ option, label, note }) => {
        const checked = value === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-labelledby={`${id}-${option}`}
            aria-describedby={note ? `${id}-${option}-note` : undefined}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cx(
              'flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left disabled:opacity-60',
              checked ? 'border-accent bg-accent-soft' : 'border-border bg-background',
            )}
          >
            <span className="flex flex-1 flex-col gap-1">
              <span id={`${id}-${option}`} className="text-md font-medium text-primary">
                {label}
              </span>
              {note && (
                <span
                  id={`${id}-${option}-note`}
                  className={cx('text-sm', checked ? 'text-primary' : 'text-secondary')}
                >
                  {note}
                </span>
              )}
            </span>
            <Dot checked={checked} />
          </button>
        )
      })}
    </div>
  )
}

function Dot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
        checked ? 'border-accent' : 'border-border',
      )}
    >
      {checked && <span className="size-2.5 rounded-full bg-accent" />}
    </span>
  )
}
