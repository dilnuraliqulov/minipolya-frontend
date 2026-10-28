import { createContext, useContext, useEffect } from 'react'
import type { Crumb } from '../components/PageHeader'
import type { BadgeTone } from '../components/StatusBadge'

/** What a page may set over its route's static title: a count, or a detail page's own title. */
export interface PageHeaderOverride {
  title?: string
  /** Shown after the title: "Jurnal · 2 318". */
  count?: number
  crumbs?: Crumb[]
  /** A status badge after a detail page's title. */
  status?: { label: string; tone: BadgeTone }
}

export const PageHeaderContext = createContext<(override: PageHeaderOverride | null) => void>(
  () => {},
)

/** Sets the page header for as long as the calling page is shown. */
export function usePageHeader(override: PageHeaderOverride) {
  const set = useContext(PageHeaderContext)
  // A string key, so a new object with the same content does not re-run the effect.
  const key = JSON.stringify(override)
  useEffect(() => {
    set(JSON.parse(key) as PageHeaderOverride)
    return () => set(null)
  }, [key, set])
}
