import { Fragment, type ReactElement, type ReactNode } from 'react'
import { cx } from './cx'
import { COMPACT_NAV, useMediaQuery } from './useMediaQuery'

/** One card (or section) of a detail page, and which desktop column it sits in. */
export interface DetailBlock {
  key: string
  node: ReactNode
  column: 'main' | 'aside'
}

/** The main column's gap differs per page: 6 on the user page, 4 on the stadium's. */
const MAIN_GAP = { 4: 'gap-4', 6: 'gap-6' } as const

/**
 * The layout of a detail page, at both widths, from ONE ordered list.
 *
 * The array order is the **phone** order; `column` picks the desktop column
 * and the array order is kept within each column. So a page lists its blocks
 * the way a phone reads them, and the desktop arrangement follows from the
 * tags — which is why the stadium page can put Maʼlumotlar (a main block)
 * first, then its three aside blocks, then Bron shartlari (main) and Tarix.
 *
 * Exactly one branch is rendered, never two hidden by CSS, so the visual, DOM
 * and focus order agree at every width — the same reason `AdminLayout` renders
 * one navigation. Crossing 1024px therefore remounts the blocks and resets
 * their local state (an open tab, an expanded audit row); that only happens
 * when a desktop window is dragged across the breakpoint, and the alternative
 * was a keyboard order fighting the visual one.
 */
export function DetailLayout({
  blocks,
  asideLabel,
  mainGap = 6,
  asideMaxHeight = false,
}: {
  blocks: DetailBlock[]
  /** Accessible name of the desktop `<aside>`. */
  asideLabel: string
  /** Tailwind gap step for the main column. */
  mainGap?: 4 | 6
  /** The stadium page's aside scrolls on its own, at `lg` and up only. */
  asideMaxHeight?: boolean
}): ReactElement {
  const compact = useMediaQuery(COMPACT_NAV)

  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        {blocks.map((block) => (
          <Fragment key={block.key}>{block.node}</Fragment>
        ))}
      </div>
    )
  }

  const render = (column: DetailBlock['column']) =>
    blocks
      .filter((block) => block.column === column)
      .map((block) => <Fragment key={block.key}>{block.node}</Fragment>)

  return (
    <div className="flex items-start gap-6">
      <div className={cx('flex min-w-0 flex-1 flex-col', MAIN_GAP[mainGap])}>{render('main')}</div>
      <aside
        aria-label={asideLabel}
        className={cx(
          'sticky top-6 flex w-94 shrink-0 flex-col gap-4',
          asideMaxHeight && 'max-h-[calc(100dvh-3rem)] overflow-y-auto',
        )}
      >
        {render('aside')}
      </aside>
    </div>
  )
}
