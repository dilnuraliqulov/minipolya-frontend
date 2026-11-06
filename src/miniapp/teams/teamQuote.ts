import type { PaymentOption } from '../api/bookings'
import type { TeamGameQuote, TeamQuoteOption } from '../api/games'

/**
 * T12: a team's choice on creating or accepting a team game, from the quote (T7):
 * "Minimal toʻlov" (only when the stadium offers it) or "Toʻliq toʻlov". Every
 * amount is the quote's; nothing is worked out here.
 */
export interface TeamQuoteChoice {
  minimum?: TeamQuoteOption
  full: TeamQuoteOption
}

export function quoteChoice(quote: TeamGameQuote): TeamQuoteChoice | null {
  const minimum = quote.options.find((o) => o.option === 'minimum')
  const full = quote.options.find((o) => o.option === 'full')
  return full ? { minimum, full } : null
}

/** The option to send: the player's pick, or the minimum when offered (the backend's default). */
export function chosenOption(choice: TeamQuoteChoice, picked: PaymentOption | null): PaymentOption {
  if (!choice.minimum) return 'FULL'
  return picked ?? 'MINIMUM'
}

/** What the chosen option takes now (the pay button's amount). */
export function chosenAmount(choice: TeamQuoteChoice, option: PaymentOption): number {
  return option === 'MINIMUM' && choice.minimum ? choice.minimum.amount : choice.full.amount
}
