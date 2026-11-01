import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CARDS_KEY, deleteCard, getCards } from '../api/cards'

/** GET /api/cards — the player's saved cards (no default flag, server order). */
export function useCards() {
  return useQuery({ queryKey: CARDS_KEY, queryFn: getCards })
}

/** DELETE /api/cards/{id}; the list reloads. */
export function useDeleteCard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CARDS_KEY }),
  })
}
