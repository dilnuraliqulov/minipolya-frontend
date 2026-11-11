import { cx } from '../components'
import { initials } from '../profile/profile'

/** A team's or player's initials in a circle (the API has no logo or photo). */
export function TeamAvatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-on-accent',
        size === 'xs' && 'size-5.5 text-2xs',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-12 text-base',
        size === 'lg' && 'size-16 text-xl',
      )}
    >
      {initials(name)}
    </span>
  )
}
