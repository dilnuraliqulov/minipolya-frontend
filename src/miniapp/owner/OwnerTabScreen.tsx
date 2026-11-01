import { CalendarDays, ChartColumn, CircleUser, LandPlot } from 'lucide-react'
import type { ReactNode } from 'react'
import { Header, Screen } from '../components'
import { TabBar, type TabItem } from '../layout/TabBar'

/** Owner mode's four tabs (the design's Owner Bottom Nav). */
const OWNER_TABS: TabItem[] = [
  { path: '/owner', labelKey: 'owner.tabs.schedule', icon: CalendarDays },
  { path: '/owner/stadium', labelKey: 'owner.tabs.stadium', icon: LandPlot },
  { path: '/owner/report', labelKey: 'owner.tabs.report', icon: ChartColumn },
  { path: '/owner/profile', labelKey: 'owner.tabs.profile', icon: CircleUser },
]

export function OwnerTabScreen({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Screen
      header={<Header title={title} brand action={action} />}
      footer={<TabBar items={OWNER_TABS} labelKey="owner.tabsLabel" />}
    >
      {children}
    </Screen>
  )
}
