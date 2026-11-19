import { cx } from '../components'
import { initials } from '../profile/profile'
import { AVATAR_TONES, avatarTone } from './avatarTone'

/**
 * A team's or player's initials in a circle. With an `id` the circle takes that
 * team's own colour; without one (a person, a team being typed) it is the
 * accent, as it always was. The API has no team logo — see the design's D1.
 */
export function TeamAvatar({
  name,
  id,
  size = 'md',
}: {
  name: string
  /** The team's id: the same team is the same colour everywhere. */
  id?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        id ? AVATAR_TONES[avatarTone(id)] : 'bg-accent text-on-accent',
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
