import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, cx } from '../components'
import { haptic } from '../telegram'
import { levelDescription, levelLabel, levelTone, TEAM_LEVELS, type TeamLevel } from './level'

/**
 * The three levels as choice cards: a coloured badge, the name and the one line
 * that says what it means. Used when a team is created and again when its
 * captain changes it, so the choice reads the same in both places.
 */
export function TeamLevelCards({
  value,
  onChange,
  disabled,
}: {
  value?: TeamLevel
  onChange: (level: TeamLevel) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={t('team.level.title')} className="flex flex-col gap-2">
      {TEAM_LEVELS.map((level) => {
        const chosen = level === value
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={disabled}
            onClick={() => {
              haptic.selection()
              onChange(level)
            }}
            className={cx(
              'flex min-h-11 items-start gap-3 rounded-xl border p-4 text-left disabled:opacity-60',
              chosen ? 'border-accent bg-accent-soft' : 'border-border bg-background',
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex">
                <Badge tone={levelTone(level)}>{levelLabel(t, level)}</Badge>
              </span>
              <span className="text-sm text-secondary">{levelDescription(t, level)}</span>
            </span>
            <span
              aria-hidden
              className={cx(
                'mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full border',
                chosen ? 'border-accent bg-accent text-on-accent' : 'border-border',
              )}
            >
              {chosen && <Check size={14} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
