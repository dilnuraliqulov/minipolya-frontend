import { useTranslation } from 'react-i18next'
import type { PaymentOption } from '../api/bookings'
import { cx } from '../components'
import { formatMoney } from '../format'

/**
 * "Toʻlov turi": Oldindan toʻlov (only when the stadium's minimum is below
 * the slot price — both figures straight from the API) and Toʻliq toʻlov.
 */
export function PaymentOptions({
  value,
  onChange,
  price,
  deposit,
  disabled,
}: {
  value: PaymentOption
  onChange: (option: PaymentOption) => void
  price: number
  deposit?: number
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const options: Array<{ option: PaymentOption; label: string }> = [
    ...(deposit !== undefined
      ? [
          {
            option: 'MINIMUM' as const,
            label: t('checkout.deposit', { amount: formatMoney(deposit) }),
          },
        ]
      : []),
    { option: 'FULL', label: t('checkout.full', { amount: formatMoney(price) }) },
  ]
  return (
    <div role="radiogroup" aria-label={t('checkout.paymentType')} className="flex flex-col gap-3">
      {options.map(({ option, label }) => {
        const checked = value === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cx(
              'flex min-h-14 w-full items-center gap-3 rounded-xl border bg-background px-4 text-left disabled:opacity-60',
              checked ? 'border-accent' : 'border-border',
            )}
          >
            <span className="flex-1 text-md font-medium text-primary">{label}</span>
            <span
              aria-hidden
              className={cx(
                'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                checked ? 'border-accent' : 'border-border',
              )}
            >
              {checked && <span className="size-2.5 rounded-full bg-accent" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
