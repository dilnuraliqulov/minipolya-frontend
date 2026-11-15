import { useEffect, type RefObject } from 'react'

/** Everything inside a container that can take focus, in tab order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps focus inside an open overlay: moves it into the container, cycles Tab
 * between the first and last control, and gives focus back to whatever had it
 * when the overlay closes.
 *
 * The container itself needs `tabIndex={-1}`, so an overlay with no controls
 * still has somewhere to put focus.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const container = ref.current
    const previous = document.activeElement as HTMLElement | null
    container?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !container) return
      const stops = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = stops[0]
      const last = stops.at(-1)
      if (!first || !last) return
      // Also catches focus sitting on the container itself, where
      // document.activeElement is neither end.
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === container)
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === container)
      ) {
        event.preventDefault()
        first.focus()
      }
    }

    container?.addEventListener('keydown', onKeyDown)
    return () => {
      container?.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [ref, active])
}

/**
 * Stops the page behind an open overlay from scrolling, so a phone does not
 * scroll the list under a drawer or a sheet. Restores whatever `overflow` the
 * body had.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
