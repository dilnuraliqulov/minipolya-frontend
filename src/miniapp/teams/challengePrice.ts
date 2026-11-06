import type { TFunction } from 'i18next'
import type { Challenge } from '../api/games'
import { formatMoney } from '../format'

/**
 * T8: "Jamoangiz toʻlaydi: X" — or "… X dan" when the team may also pay in full
 * (`fullAmount` above `amountToPayNow`, the minimum option's amount).
 */
export function challengePrice(t: TFunction, challenge: Challenge): string {
  const amount = formatMoney(challenge.amountToPayNow)
  return challenge.fullAmount !== undefined && challenge.fullAmount > challenge.amountToPayNow
    ? t('team.payFrom', { amount })
    : t('team.payNow', { amount })
}
