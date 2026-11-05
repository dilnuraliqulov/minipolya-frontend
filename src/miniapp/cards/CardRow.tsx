import { Ellipsis } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatMaskedNumber, type SavedCard } from '../api/cards'
import { cx } from '../components'
import { CardBrandTile } from './CardBrandTile'

interface CardRowProps {
  card: SavedCard
  /** Radio mode (checkout): the row is one choice. */
  selected?: boolean
  onSelect?: () => void
  /** List mode (Kartalarim): a ⋯ button. */
  onMore?: () => void
  /** Outlined in danger (a declined payment). */
  invalid?: boolean
}

function Details({ card }: { card: SavedCard }) {
  const type = card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
      <span className="text-md font-semibold text-primary">
        {formatMaskedNumber(card.maskedNumber)}
      </span>
      <span className="text-sm text-secondary">
        {card.expiry ? `${type} · ${card.expiry}` : type}
      </span>
    </span>
  )
}

/** A saved card: brand tile, "•••• 1234", type · expiry — a radio choice or a list row with ⋯. */
export function CardRow({ card, selected, onSelect, onMore, invalid }: CardRowProps) {
  const { t } = useTranslation()
  const frame = cx(
    'flex min-h-16 w-full items-center gap-3 rounded-xl border bg-background px-4 py-3',
    invalid ? 'border-danger' : selected ? 'border-accent' : 'border-border',
  )
  if (onSelect) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected ?? false}
        onClick={onSelect}
        className={frame}
      >
        <CardBrandTile cardType={card.cardType} />
        <Details card={card} />
        <span
          aria-hidden
          className={cx(
            'size-5 shrink-0 rounded-full border-2',
            selected ? 'border-accent bg-accent' : 'border-border',
          )}
        />
      </button>
    )
  }
  return (
    <div className={frame}>
      <CardBrandTile cardType={card.cardType} />
      <Details card={card} />
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          aria-label={t('cards.more')}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center text-secondary"
        >
          <Ellipsis size={20} className="rotate-90" aria-hidden />
        </button>
      )}
    </div>
  )
}
