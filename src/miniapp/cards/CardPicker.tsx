import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, ErrorState, SkeletonList } from '../components'
import { AddCardSheet } from './AddCardSheet'
import { CardRow } from './CardRow'
import type { useCardChoice } from './useCardChoice'

/** "Karta": the saved cards as one radio group, plus "Karta qoʻshish". */
export function CardPicker({
  choice,
  disabled,
  invalid,
}: {
  choice: ReturnType<typeof useCardChoice>
  disabled?: boolean
  /** Outline the chosen card in danger (it was declined). */
  invalid?: boolean
}) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const { cards, card, setCardId } = choice
  const list = cards.data ?? []
  return (
    <section className="flex flex-col gap-3" aria-labelledby="card-picker">
      <h3 id="card-picker" className="text-lg font-semibold text-primary">
        {t('checkout.card')}
      </h3>
      {cards.isPending ? (
        <SkeletonList count={2} variant="item" />
      ) : cards.isError ? (
        <ErrorState onRetry={() => void cards.refetch()} />
      ) : (
        list.length > 0 && (
          <div role="radiogroup" aria-labelledby="card-picker" className="flex flex-col gap-3">
            {list.map((c) => (
              <CardRow
                key={c.id}
                card={c}
                selected={c.id === card?.id}
                invalid={invalid && c.id === card?.id}
                onSelect={() => {
                  if (!disabled) setCardId(c.id)
                }}
              />
            ))}
          </div>
        )
      )}
      <Button variant="ghost" icon={Plus} disabled={disabled} onClick={() => setAdding(true)}>
        {t('cards.add')}
      </Button>
      {cards.isSuccess && list.length === 0 && (
        <p className="px-1 text-sm text-secondary">{t('checkout.addCardFirst')}</p>
      )}
      <AddCardSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(saved) => {
          setAdding(false)
          setCardId(saved.id)
        }}
      />
    </section>
  )
}
