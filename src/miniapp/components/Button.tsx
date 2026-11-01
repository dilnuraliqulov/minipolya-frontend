import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, MouseEvent } from 'react'
import { Link, type LinkProps } from 'react-router'
import { haptic as feedback } from '../telegram'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'danger-outline'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'border border-border bg-background text-primary',
  danger: 'bg-danger text-on-accent',
  ghost: 'text-link',
  'danger-outline': 'border border-border text-danger',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: LucideIcon
  /** Light haptic feedback on tap — for main actions. */
  haptic?: boolean
  loading?: boolean
  /** Full width by default, as in the design. */
  block?: boolean
  /** `compact`: 40px tall with 14px text (the stadium card's Band qilish). */
  size?: 'default' | 'compact'
}

function buttonClass(variant: ButtonVariant, size: 'default' | 'compact', block: boolean) {
  return cx(
    'inline-flex items-center justify-center gap-2 font-semibold',
    size === 'compact' ? 'h-10 rounded-lg px-3.5 text-base' : 'min-h-12 rounded-xl px-4 text-md',
    'transition-opacity active:opacity-80 disabled:opacity-50',
    block && 'w-full',
    VARIANTS[variant],
  )
}

/** A router link that looks like a Button (navigation, not an action). */
export function ButtonLink({
  variant = 'primary',
  block = true,
  className,
  ...rest
}: LinkProps & { variant?: ButtonVariant; block?: boolean }) {
  return <Link className={cx(buttonClass(variant, 'default', block), className)} {...rest} />
}

/** Button / Primary · Secondary · Danger · Ghost · Danger Outline (48px, radius 12). */
export function Button({
  variant = 'primary',
  icon: Icon,
  haptic = false,
  loading = false,
  block = true,
  size = 'default',
  disabled,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (haptic) feedback.light()
    onClick?.(event)
  }
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={handleClick}
      className={cx(buttonClass(variant, size, block), className)}
      {...rest}
    >
      {loading ? (
        <LoaderCircle size={20} className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={20} aria-hidden />
      )}
      {children}
    </button>
  )
}
