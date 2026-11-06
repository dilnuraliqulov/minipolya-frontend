import { CreditCard } from 'lucide-react'
import { cx } from '../components'

/**
 * The card system's tile: UZCARD / HUMO as text (brand names, not translated),
 * any other type a card icon. Tokens only.
 */
export function CardBrandTile({ cardType }: { cardType: string }) {
  const type = cardType.toLowerCase()
  const base = 'flex h-8 w-11 shrink-0 items-center justify-center rounded-sm'
  if (type.includes('humo')) {
    return <span className={cx(base, 'bg-accent text-2xs font-bold text-on-accent')}>HUMO</span>
  }
  if (type.includes('uzcard')) {
    return (
      <span className={cx(base, 'bg-success-fill text-2xs font-bold text-on-accent')}>UZCARD</span>
    )
  }
  return (
    <span className={cx(base, 'bg-surface text-secondary')}>
      <CreditCard size={18} aria-hidden />
    </span>
  )
}
