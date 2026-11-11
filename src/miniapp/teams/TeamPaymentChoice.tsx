import { useTranslation } from 'react-i18next'
import { formatTime } from '../../shared/format'
import type { PaymentOption } from '../api/bookings'
import type { TeamGameQuote } from '../api/games'
import { PaymentOptions } from '../booking/PaymentOptions'
import { isAhead } from '../bookings/when'
import { formatLongDate } from '../format'
import type { TeamQuoteChoice } from './teamQuote'

/** T12: the quote's options as cards, plus the cancellation deadline from the quote. */
export function TeamPaymentChoice({
  quote,
  choice,
  value,
  onChange,
  disabled,
}: {
  quote: TeamGameQuote
  choice: TeamQuoteChoice
  value: PaymentOption
  onChange: (option: PaymentOption) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3" aria-labelledby="team-payment-type">
      <h3 id="team-payment-type" className="text-lg font-semibold text-primary">
        {t('checkout.paymentType')}
      </h3>
      <PaymentOptions
        kind="team"
        value={value}
        onChange={onChange}
        price={choice.full.amount}
        deposit={choice.minimum?.amount}
        remainder={choice.minimum?.remainderAmount}
        disabled={disabled}
      />
      {isAhead(quote.cancellationDeadline) && (
        <p className="text-sm text-secondary">
          {t('game.deadline', {
            date: formatLongDate(quote.cancellationDeadline),
            time: formatTime(quote.cancellationDeadline),
          })}
        </p>
      )}
    </section>
  )
}
