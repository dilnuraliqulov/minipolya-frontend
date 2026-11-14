import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '../api/types'
import { useFocusTrap, useScrollLock } from '../components/overlay'
import { Sidebar } from './Sidebar'

/**
 * The menu below 1024px: the sidebar slid in from the left over a dimmed page.
 * Esc, the backdrop and following a link close it (`AdminLayout` closes it on
 * navigation); focus stays inside while it is open.
 */
export function NavDrawer({
  open,
  user,
  onClose,
}: {
  open: boolean
  user: User
  onClose: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useFocusTrap(panel, open)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div
        data-testid="drawer-backdrop"
        aria-hidden
        onMouseDown={onClose}
        className="absolute inset-0 bg-overlay"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menyu"
        tabIndex={-1}
        // Following a menu link navigates, so the drawer has done its job.
        onClick={(event) => {
          if ((event.target as Element).closest('a')) onClose()
        }}
        className="relative flex h-dvh w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-xl outline-none"
      >
        <Sidebar user={user} variant="drawer" />
      </div>
    </div>,
    document.body,
  )
}
