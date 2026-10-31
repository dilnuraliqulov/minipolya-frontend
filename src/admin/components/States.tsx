import { Inbox, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cx } from './cx'

interface StateProps {
  title: string
  description?: string
  className?: string
}

/** Nothing to show: icon in a grey circle, title, one line of help. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
}: StateProps & { icon?: LucideIcon }) {
  return (
    <div
      className={cx('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-surface">
        <Icon size={22} aria-hidden className="text-secondary" />
      </span>
      <p className="text-md font-medium text-primary">{title}</p>
      {description && <p className="text-sm text-secondary">{description}</p>}
    </div>
  )
}

/** Loading failed: danger icon, message, retry button. */
export function ErrorState({
  title = 'Maʼlumotlarni yuklab boʻlmadi',
  description = 'Internet aloqasini tekshirib, qayta urinib koʻring',
  onRetry,
  className,
}: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className={cx('flex flex-col items-center justify-center gap-2 py-18 text-center', className)}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-danger-soft">
        <TriangleAlert size={22} aria-hidden className="text-danger" />
      </span>
      <p className="text-md font-medium text-primary">{title}</p>
      <p className="text-sm text-secondary">{description}</p>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} className="mt-2">
          Qayta urinish
        </Button>
      )}
    </div>
  )
}
