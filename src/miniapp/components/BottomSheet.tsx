import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBackButton } from '../telegram'

interface BottomSheetProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children?: ReactNode
  /** Buttons at the bottom (the design's Actions). */
  actions?: ReactNode
}

/**
 * The design's Bottom Sheet: scrim, handle, title 18 bold, subtitle, content,
 * actions; top corners 20. Closes from the scrim, Escape, and Telegram's
 * BackButton (which goes to the sheet, not the screen under it).
 */
export function BottomSheet(props: BottomSheetProps) {
  if (!props.open) return null
  return createPortal(<OpenSheet {...props} />, document.body)
}

function OpenSheet({ title, subtitle, onClose, children, actions }: BottomSheetProps) {
  const titleId = useId()
  useBackButton(onClose)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div
        data-testid="sheet-scrim"
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90dvh] flex-col gap-3 overflow-y-auto rounded-t-sheet bg-bar px-4 pt-2 pb-[max(16px,var(--tg-safe-bottom))]"
      >
        <div className="flex justify-center pb-1">
          <span className="h-1 w-9 rounded-xs bg-border" />
        </div>
        <h2 id={titleId} className="text-title font-bold text-primary">
          {title}
        </h2>
        {subtitle && <p className="text-base text-secondary">{subtitle}</p>}
        {children && <div className="flex flex-col gap-3">{children}</div>}
        {actions && <div className="flex flex-col gap-2 pt-1">{actions}</div>}
      </div>
    </div>
  )
}
