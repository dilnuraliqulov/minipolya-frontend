import { useState } from 'react'
import type { SavedCard } from '../api/cards'
import { useCards } from './queries'

/**
 * "Karta": the saved cards as one radio group, plus "Karta qoʻshish". The
 * chosen card is the explicit pick, else the first; a card just added becomes
 * the pick (AddCardSheet seeds the list, so it is there at once).
 */
export function useCardChoice() {
  const cards = useCards()
  const [cardId, setCardId] = useState<string | null>(null)
  const list = cards.data ?? []
  const card: SavedCard | undefined = list.find((c) => c.id === cardId) ?? list[0]
  return { cards, card, setCardId }
}
