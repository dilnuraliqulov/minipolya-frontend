import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from './overlay'

/**
 * The design's drawer: a 480 px panel on the right over a dimmed page. Esc,
 * the close button and a click on the overlay close it; focus moves into the
 * panel and back to where it was on close.
 */
export function SidePanel({
  open,
  title,
  subtitle,
  onClose,
  actions,
  children,
}: {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  /**
   * Decisions about what the panel shows. They sit in a bar at the bottom,
   * which stays put while the body scrolls, so they are reachable on a phone
   * without scrolling to the end.
   */
  actions?: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-40 flex justify-end bg-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-full w-120 max-w-full flex-col border-l border-border bg-background shadow-xl outline-none max-md:w-full max-md:border-l-0"
      >
        <div className="flex items-start gap-3 border-b border-border px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={titleId} className="text-xl font-semibold text-primary">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-accent md:size-auto md:hover:bg-transparent"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 md:px-6">
          {children}
        </div>
        {actions && (
          <div
            data-testid="panel-actions"
            className="flex flex-wrap gap-2.5 border-t border-border px-4 pt-3 pb-4 md:px-6"
          >
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** A titled block inside the panel ("BRON MAʼLUMOTLARI"). */
export function PanelSection({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold tracking-caps text-secondary uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** A label/value row inside a panel section. */
export function PanelRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-40 shrink-0 text-sm text-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 text-base text-primary">{children}</dd>
    </div>
  )
}
