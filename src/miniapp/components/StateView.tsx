import { Inbox, WifiOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { cx } from './cx'

interface StateViewProps {
  icon: LucideIcon
  tone?: 'neutral' | 'danger'
  title: string
  description?: ReactNode
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

/** The design's Empty State / Error State: icon circle, title, text, button. */
export function StateView({
  icon: Icon,
  tone = 'neutral',
  title,
  description,
  actionLabel,
  onAction,
  children,
}: StateViewProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      <div
        className={cx(
          'flex size-16 items-center justify-center rounded-full',
          tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-surface text-secondary',
        )}
      >
        <Icon size={28} aria-hidden />
      </div>
      <h2 className="w-full text-lg font-semibold text-primary">{title}</h2>
      {description && <p className="w-full text-base text-secondary">{description}</p>}
      {children}
      {actionLabel && onAction && (
        <div className="w-full pt-3">
          <Button haptic onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

/** Every list's empty state. */
export function EmptyState({ icon = Inbox, ...props }: EmptyStateProps) {
  return <StateView icon={icon} {...props} />
}

interface ErrorStateProps {
  /** Defaults to the design's "Xatolik yuz berdi". */
  title?: string
  /** Defaults to the design's connection hint. */
  description?: string
  onRetry: () => void
}

/** Every screen's error state, with "Qayta urinish". */
export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <StateView
      icon={WifiOff}
      tone="danger"
      title={title ?? t('states.errorTitle')}
      description={description ?? t('states.errorNetwork')}
      actionLabel={t('common.retry')}
      onAction={onRetry}
    />
  )
}
