import { api } from '../../shared/api'

/** `SavedCardResponse`. There is no token; payments take `id` as `cardId`. */
export interface SavedCard {
  id: string
  /**
   * `"8600 •••• •••• 1234"` (backend `CardMask`); cards saved before it keep
   * `"8600 •••• 1234"`. Show it through `formatMaskedNumber`.
   */
  maskedNumber: string
  cardType: string
  /** MM/YY as the provider reports it; `null` when it reports none (the dev fake provider). */
  expiry?: string | null
  isActive: boolean
  createdAt: string
}

export const CARDS_KEY = ['cards'] as const

/** The digit runs of a masked number: `"8600 •••• •••• 1234"` → `["8600", "1234"]`. */
function digitRuns(masked: string): string[] {
  return masked.match(/\d+/g) ?? []
}

/**
 * One display form for every saved card, whichever mask the backend stored:
 * `"8600 •••• •••• 1234"` (now) and `"8600 •••• 1234"` (older rows) both show as
 * `"8600 •••• •••• 1234"`. Without a visible prefix: `"•••• 1234"`. Never more
 * digits than the backend sent.
 */
export function formatMaskedNumber(masked: string): string {
  const runs = digitRuns(masked)
  const last = runs.at(-1)?.slice(-4)
  if (!last) return masked.trim()
  const first = runs.length > 1 ? runs[0]?.slice(0, 4) : undefined
  return first && first.length === 4 ? `${first} •••• •••• ${last}` : `•••• ${last}`
}

export function getCards(): Promise<SavedCard[]> {
  return api.get<SavedCard[]>('/api/cards')
}

/** Step one of binding: the number goes straight to the provider, an SMS is sent. */
export function startCardBinding(
  cardNumber: string,
  expiry: string,
): Promise<{ bindingId: string; maskedPhone: string }> {
  return api.post<{ bindingId: string; maskedPhone: string }>('/api/cards', {
    cardNumber,
    expiry,
  })
}

/**
 * The SMS code again, for the same binding. Before the provider's 60-second
 * cooldown: 400 `SMS_RESEND_TOO_EARLY`; when the provider cannot resend at all:
 * 400 `SMS_RESEND_UNAVAILABLE` (the card has to be entered again).
 */
export function resendCardCode(
  bindingId: string,
): Promise<{ bindingId: string; maskedPhone: string }> {
  return api.post<{ bindingId: string; maskedPhone: string }>('/api/cards/resend', { bindingId })
}

export function confirmCard(bindingId: string, smsCode: string): Promise<SavedCard> {
  return api.post<SavedCard>('/api/cards/confirm', { bindingId, smsCode })
}

export function deleteCard(id: string): Promise<void> {
  return api.delete<void>(`/api/cards/${id}`)
}
