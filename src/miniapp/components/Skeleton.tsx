import { useTranslation } from 'react-i18next'
import { cx } from './cx'

function Bar({ className }: { className: string }) {
  return <div className={cx('rounded-xs bg-skeleton motion-safe:animate-pulse', className)} />
}

/** Skeleton / Block: a card with a title bar and three lines. */
export function SkeletonBlock() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
      <Bar className="h-4 w-40" />
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-full" />
      <Bar className="h-3 w-50" />
    </div>
  )
}

/** Skeleton / List Item: a thumbnail and three lines. */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <Bar className="size-16 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Bar className="h-3.5 w-45" />
        <Bar className="h-3 w-30" />
        <Bar className="h-3 w-20" />
      </div>
    </div>
  )
}

/** Every screen's loading state: skeleton cards, announced as "Yuklanmoqda". */
export function SkeletonList({
  count = 3,
  variant = 'block',
}: {
  count?: number
  variant?: 'block' | 'item'
}) {
  const { t } = useTranslation()
  const Item = variant === 'block' ? SkeletonBlock : SkeletonListItem
  return (
    <div role="status" aria-label={t('common.loading')} className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </div>
  )
}
