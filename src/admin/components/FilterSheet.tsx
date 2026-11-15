import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { useFocusTrap, useScrollLock } from './overlay'

/**
 * The filters as a sheet from the bottom of a phone screen. Esc, the backdrop,
 * the close button and "Tayyor" all close it.
 *
 * Esc is handled on the panel and stops there: a page can have a side panel
 * open underneath, and that panel listens for Esc on the document.
 */
export function FilterSheet({
  open,
  onClose,
  onClear,
  children,
}: {
  open: boolean
  onClose: () => void
  onClear?: () => void
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useFocusTrap(panel, open)
  useScrollLock(open)

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        data-testid="sheet-backdrop"
        aria-hidden
        onMouseDown={onClose}
        className="absolute inset-0 bg-overlay"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Filtrlar"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          onCloseRef.current()
        }}
        className="relative flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-background outline-none"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="flex-1 text-xl font-semibold text-primary">Filtrlar</h2>
          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {/* Each control fills the width here, however it looks in the toolbar. */}
        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-4 [&>*]:w-full [&_label]:w-full">
          {children}
        </div>
        <div className="flex gap-2.5 border-t border-border px-4 pt-3 pb-4">
          {onClear && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                onClear()
                onClose()
              }}
            >
              Tozalash
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>
            Tayyor
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
