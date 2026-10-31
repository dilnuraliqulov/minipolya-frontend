import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cx } from './cx'

interface ListRowProps {
  icon?: LucideIcon
  label: string
  sub?: string
  value?: string
  onClick?: () => void
  disabled?: boolean
}

/** The design's List Row: 52px, icon 22 (link colour), label 15 medium, value, chevron. */
export function ListRow({ icon: Icon, label, sub, value, onClick, disabled }: ListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left',
        'border-b border-border last:border-b-0 active:bg-hover disabled:opacity-60',
      )}
    >
      {Icon && <Icon size={22} className="shrink-0 text-link" aria-hidden />}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-md font-medium text-primary">{label}</span>
        {sub && <span className="text-sm text-secondary">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-base text-secondary">{value}</span>}
      <ChevronRight size={18} className="shrink-0 text-secondary" aria-hidden />
    </button>
  )
}
