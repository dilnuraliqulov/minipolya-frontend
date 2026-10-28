import {
  CalendarCheck,
  History,
  House,
  LandPlot,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/** What a menu item's count badge shows; the sidebar reads each from its query. */
export type MenuBadge = 'pendingStadiums' | 'failedRefunds'

export interface MenuItem {
  path: string
  label: string
  icon: LucideIcon
  /** A count shown as a badge when it is above zero. */
  badge?: MenuBadge
  /** Draw the divider above this item. */
  dividerBefore?: boolean
}

/** The sidebar menu, in the design's order. Routes are generated from it. */
export const MENU: MenuItem[] = [
  { path: '/', label: 'Bosh sahifa', icon: House },
  { path: '/maydonlar', label: 'Maydonlar', icon: LandPlot, badge: 'pendingStadiums' },
  { path: '/foydalanuvchilar', label: 'Foydalanuvchilar', icon: Users },
  { path: '/bronlar', label: 'Bronlar', icon: CalendarCheck },
  { path: '/tolovlar', label: 'Toʻlovlar', icon: Wallet, badge: 'failedRefunds' },
  { path: '/jurnal', label: 'Jurnal', icon: History, dividerBefore: true },
  { path: '/sozlamalar', label: 'Sozlamalar', icon: Settings },
]
