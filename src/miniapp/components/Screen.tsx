import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useScrolled } from '../lib/useScrolled'
import { useBackButton } from '../telegram'
import { cx } from './cx'
import { LogoMark } from './LogoMark'

interface HeaderProps {
  title: string
  /** The logo mark (24px) before the title — tab roots. */
  brand?: boolean
  /** Back navigation. Inside Telegram this drives Telegram's own BackButton. */
  onBack?: () => void
  /** A 44px action on the right; in Telegram fullscreen, a row under the title. */
  action?: ReactNode
}

/**
 * The design's Header. Normally 56px: own back button (when Telegram has
 * none), title 18 bold, action on the right. In Telegram fullscreen
 * (`tg-fullscreen:`) the title sits centred in Telegram's Close / ⋯ row
 * (`--tg-content-top` high, 102px clear of each pill) and the action moves
 * to a 44px row below it. The bottom line shows once the page has scrolled.
 */
export function Header({ title, brand = false, onBack, action }: HeaderProps) {
  const { t } = useTranslation()
  const scrolled = useScrolled()
  const telegramDrawsBack = useBackButton(onBack ?? null)
  const ownBack = onBack !== undefined && !telegramDrawsBack
  return (
    <header
      className={cx(
        // The ::before paints the bar colour over the safe area above the sticky header.
        'sticky top-(--tg-safe-top) z-10 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b bg-bar',
        'before:absolute before:inset-x-0 before:bottom-full before:h-(--tg-safe-top) before:bg-bar',
        'tg-fullscreen:grid-cols-1',
        scrolled ? 'border-border' : 'border-transparent',
      )}
    >
      {ownBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="col-start-1 ml-2 flex size-11 items-center justify-center text-primary tg-fullscreen:hidden"
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
      )}
      <div
        className={cx(
          'col-start-2 row-start-1 flex h-14 min-w-0 items-center gap-2 pr-4',
          ownBack ? 'pl-1' : 'pl-4',
          'tg-fullscreen:col-start-1 tg-fullscreen:h-(--tg-content-top) tg-fullscreen:justify-center tg-fullscreen:px-[102px]',
        )}
      >
        {brand && <LogoMark size={24} />}
        <h1
          className={cx(
            'min-w-0 flex-1 truncate text-title font-bold text-primary',
            'tg-fullscreen:flex-initial tg-fullscreen:text-center tg-fullscreen:text-xl tg-fullscreen:font-semibold',
          )}
        >
          {title}
        </h1>
      </div>
      {action && (
        <div className="col-start-3 row-start-1 flex items-center pr-4 tg-fullscreen:col-start-1 tg-fullscreen:row-start-2 tg-fullscreen:h-11 tg-fullscreen:px-4">
          {action}
        </div>
      )}
    </header>
  )
}

interface ScreenProps {
  header?: ReactNode
  /** Pinned under the content: a bottom bar or the tab navigation. */
  footer?: ReactNode
  children: ReactNode
  /** Content padding: the design's 16px sides, 16 top, 24 bottom. */
  padded?: boolean
  className?: string
}

/**
 * A full-height screen inside Telegram's safe areas: header on top, footer
 * at the bottom, the page background in between.
 */
export function Screen({ header, footer, children, padded = true, className }: ScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-page pt-(--tg-safe-top) pr-(--tg-safe-right) pl-(--tg-safe-left)">
      {header}
      <main
        className={cx(
          'flex flex-1 flex-col',
          padded && 'gap-4 px-4 pt-4 pb-6 tg-fullscreen:pt-3',
          className,
        )}
      >
        {children}
      </main>
      {footer ?? <div className="pb-(--tg-safe-bottom)" />}
    </div>
  )
}

/** The design's Bottom Bar: the main button pinned above the safe area. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-bar px-4 pt-4 pb-[max(16px,var(--tg-safe-bottom))]">
      {children}
    </div>
  )
}
