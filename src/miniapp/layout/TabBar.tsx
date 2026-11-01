import { Calendar, CircleUser, LandPlot, Users, type LucideIcon } from 'lucide-react'
import type { ParseKeys } from 'i18next'
import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { cx } from '../components'
import { haptic } from '../telegram'
import { TABS, type TabKey } from './tabs'

export interface TabItem {
  path: string
  labelKey: ParseKeys
  icon: LucideIcon
}

const ICONS: Record<TabKey, LucideIcon> = {
  stadiums: LandPlot,
  team: Users,
  games: Calendar,
  profile: CircleUser,
}

const PLAYER_TABS: TabItem[] = TABS.map(({ key, path }) => ({
  path,
  labelKey: `tabs.${key}`,
  icon: ICONS[key],
}))

/**
 * The design's Bottom Nav: four tabs, 56px, the active one in the accent
 * colour. The player's tabs by default; owner mode passes its own.
 */
export function TabBar({
  items = PLAYER_TABS,
  labelKey = 'tabs.label',
}: {
  items?: TabItem[]
  labelKey?: ParseKeys
}) {
  const { t } = useTranslation()
  const root = items[0]?.path
  return (
    <nav
      aria-label={t(labelKey)}
      className="sticky bottom-0 z-10 border-t border-border bg-bar pb-(--tg-safe-bottom)"
    >
      <ul className="flex h-14">
        {items.map(({ path, labelKey: label, icon: Icon }) => (
          <li key={path} className="flex-1">
            <NavLink
              to={path}
              end={path === root}
              onClick={() => haptic.selection()}
              className={({ isActive }) =>
                cx(
                  'flex h-full flex-col items-center justify-center gap-1 text-2xs',
                  isActive ? 'font-semibold text-accent' : 'font-medium text-secondary',
                )
              }
            >
              <Icon size={24} aria-hidden />
              {t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
