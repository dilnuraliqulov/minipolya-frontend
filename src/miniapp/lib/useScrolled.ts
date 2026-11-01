import { useEffect, useState } from 'react'

/** Whether the page has scrolled away from the top (`window.scrollY > 0`). */
export function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > 0)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return scrolled
}
