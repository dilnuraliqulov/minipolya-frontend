import {
  CalendarCheck,
  FileText,
  History,
  House,
  LandPlot,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { PlatformStats } from '../api/types'

export interface MenuItem {
  path: string
  label: string
  icon: LucideIcon
  /** A stats field shown as a count badge when it is above zero. */
  badge?: keyof PlatformStats
  /** Draw the divider above this item. */
  dividerBefore?: boolean
}

/** The sidebar menu, in the design's order. Routes are generated from it. */
export const MENU: MenuItem[] = [
  { path: '/', label: 'Bosh sahifa', icon: House },
  { path: '/arizalar', label: 'Arizalar', icon: FileText, badge: 'pendingOwnerApplications' },
  { path: '/maydonlar', label: 'Maydonlar', icon: LandPlot, badge: 'pendingStadiumApprovals' },
  { path: '/foydalanuvchilar', label: 'Foydalanuvchilar', icon: Users },
  { path: '/bronlar', label: 'Bronlar', icon: CalendarCheck },
  { path: '/jurnal', label: 'Jurnal', icon: History, dividerBefore: true },
  { path: '/sozlamalar', label: 'Sozlamalar', icon: Settings },
]
