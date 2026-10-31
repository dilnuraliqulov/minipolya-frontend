import { Calendar, CircleUser, LandPlot, Users, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { cx } from '../components'
import { haptic } from '../telegram'
import { TABS, type TabKey } from './tabs'

const ICONS: Record<TabKey, LucideIcon> = {
  stadiums: LandPlot,
  team: Users,
  games: Calendar,
  profile: CircleUser,
}

/** The design's Bottom Nav: four tabs, 56px, the active one in the accent colour. */
export function TabBar() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('tabs.label')}
      className="sticky bottom-0 z-10 border-t border-border bg-bar pb-(--tg-safe-bottom)"
    >
      <ul className="flex h-14">
        {TABS.map(({ key, path }) => {
          const Icon = ICONS[key]
          return (
            <li key={key} className="flex-1">
              <NavLink
                to={path}
                end={path === '/'}
                onClick={() => haptic.selection()}
                className={({ isActive }) =>
                  cx(
                    'flex h-full flex-col items-center justify-center gap-1 text-2xs',
                    isActive ? 'font-semibold text-accent' : 'font-medium text-secondary',
                  )
                }
              >
                <Icon size={24} aria-hidden />
                {t(`tabs.${key}`)}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
