import type { CSSProperties } from 'react'
import { cx } from './cx'

/** The design's card: 12 px radius, border, card background. */
export const CARD = 'rounded-xl border border-border bg-background'

/**
 * A card that opens a page. Hover lifts it about 2 px, deepens the shadow and
 * tints the border with the accent; in dark mode, where shadows do not show on
 * black, it lightens the surface instead. Only for cards that really are
 * links — a card without a destination must not use this.
 */
export function interactiveCard(reducedMotion: boolean): string {
  return cx(
    CARD,
    'group relative hover:border-accent/60 hover:shadow-lg',
    'dark:hover:bg-surface dark:hover:shadow-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    !reducedMotion && 'transition duration-150 ease-out hover:-translate-y-0.5',
  )
}

/** Delay between cards in the entrance animation; 6 cards finish within 300 ms. */
const STAGGER_MS = 25

/**
 * Entrance animation for the `index`-th card on a page: fade and slide up,
 * one after another. Nothing at all with reduced motion.
 */
export function rise(
  index: number,
  reducedMotion: boolean,
): { className?: string; style?: CSSProperties } {
  if (reducedMotion) return {}
  return { className: 'animate-rise', style: { animationDelay: `${index * STAGGER_MS}ms` } }
}
