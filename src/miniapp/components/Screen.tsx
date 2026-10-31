import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackButton } from '../telegram'
import { cx } from './cx'

interface HeaderProps {
  title: string
  /** Back navigation. Inside Telegram this drives Telegram's own BackButton. */
  onBack?: () => void
  /** A 44px action on the right. */
  action?: ReactNode
}

/** The design's Header: 56px, title 18 bold, optional back and action. */
export function Header({ title, onBack, action }: HeaderProps) {
  const { t } = useTranslation()
  const telegramDrawsBack = useBackButton(onBack ?? null)
  const ownBack = onBack !== undefined && !telegramDrawsBack
  return (
    <header
      className={cx(
        'sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-bar pr-4',
        ownBack ? 'pl-2' : 'pl-4',
      )}
    >
      {ownBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="flex size-11 items-center justify-center text-primary"
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-title font-bold text-primary">{title}</h1>
      {action}
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
      <main className={cx('flex flex-1 flex-col', padded && 'gap-4 px-4 pt-4 pb-6', className)}>
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
