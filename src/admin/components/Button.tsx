import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'text'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110',
  secondary: 'border border-border bg-background text-primary hover:bg-hover',
  danger: 'bg-danger text-on-accent hover:brightness-110',
  'danger-outline': 'border border-danger text-danger hover:bg-danger-soft',
  text: 'text-link hover:bg-hover',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: LucideIcon
  /** Icon after the label instead of before it (e.g. an arrow). */
  iconEnd?: boolean
}

/** The design's 36 px buttons: BtnPrimary, BtnSecondary, BtnDanger, BtnDangerOutline, BtnText. */
export function Button({
  variant = 'primary',
  icon: Icon,
  iconEnd = false,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const icon = Icon ? <Icon size={16} aria-hidden className="shrink-0" /> : null
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-3.5 text-base font-medium whitespace-nowrap transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {!iconEnd && icon}
      {children}
      {iconEnd && icon}
    </button>
  )
}
