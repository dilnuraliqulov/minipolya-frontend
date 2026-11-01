import { api } from '../../shared/api'

/** `SavedCardResponse`. There is no token; payments take `id` as `cardId`. */
export interface SavedCard {
  id: string
  /** `"8600 •••• 1234"` */
  maskedNumber: string
  cardType: string
  /** `MM/YY` */
  expiry: string
  isActive: boolean
  createdAt: string
}

export const CARDS_KEY = ['cards'] as const

/** `"8600 •••• 1234"` → `"1234"`. */
export function lastFour(masked: string): string {
  return masked.slice(-4)
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

export function confirmCard(bindingId: string, smsCode: string): Promise<SavedCard> {
  return api.post<SavedCard>('/api/cards/confirm', { bindingId, smsCode })
}

export function deleteCard(id: string): Promise<void> {
  return api.delete<void>(`/api/cards/${id}`)
}
