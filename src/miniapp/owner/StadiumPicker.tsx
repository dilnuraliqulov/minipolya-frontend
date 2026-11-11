import { Plus, Store } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import type { OwnerStadium } from '../api/owner'
import { cx, EmptyState, ErrorState, SkeletonList } from '../components'
import { useOwnerStadiumList } from './queries'

/**
 * Every owner tab starts with the owner's stadiums: loading / error / none,
 * chips to switch when there are several (kept in `?stadium=`), then the tab's
 * content for the chosen one.
 */
export function WithOwnerStadium({ children }: { children: (stadium: OwnerStadium) => ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const list = useOwnerStadiumList()
  const strip = useRef<HTMLDivElement>(null)
  const chosen = search.get('stadium')
  // A stadium chosen by link (e.g. just added) may sit past the edge of the chips: bring it in.
  useEffect(() => {
    strip.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [chosen, list.data])
  if (list.isPending) return <SkeletonList count={3} />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  if (list.data.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title={t('owner.noStadiumTitle')}
        description={t('owner.noStadiumText')}
        actionLabel={t('owner.addStadium')}
        onAction={() => navigate('/owner/new')}
      />
    )
  }
  const current = list.data.find((s) => s.id === search.get('stadium')) ?? list.data[0]
  if (!current) return null
  return (
    <>
      {list.data.length > 1 && (
        <div
          ref={strip}
          role="tablist"
          aria-label={t('owner.pickStadium')}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          {list.data.map((stadium) => {
            const selected = stadium.id === current.id
            return (
              <button
                key={stadium.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  const next = new URLSearchParams(search)
                  next.set('stadium', stadium.id)
                  setSearch(next, { replace: true })
                }}
                className={cx(
                  'flex min-h-11 shrink-0 items-center rounded-full px-4 text-base font-medium',
                  selected ? 'bg-accent text-on-accent' : 'bg-surface text-primary',
                )}
              >
                {stadium.name}
              </button>
            )
          })}
        </div>
      )}
      {children(current)}
    </>
  )
}

/** The header's "+": a new stadium. */
export function AddStadiumButton() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      aria-label={t('owner.addStadium')}
      onClick={() => navigate('/owner/new')}
      className="flex size-11 items-center justify-center text-link"
    >
      <Plus size={22} aria-hidden />
    </button>
  )
}
