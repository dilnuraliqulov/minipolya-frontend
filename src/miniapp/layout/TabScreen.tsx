import type { ReactNode } from 'react'
import { Header, Screen } from '../components'
import { TabBar } from './TabBar'

/**
 * A tab's root screen: header (logo mark + title, no back), content, and the
 * bottom navigation. In Telegram fullscreen the Header itself moves `action`
 * to a row under Telegram's Close / ⋯ row.
 */
export function TabScreen({
  title,
  brand = true,
  action,
  children,
}: {
  title: string
  brand?: boolean
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Screen header={<Header title={title} brand={brand} action={action} />} footer={<TabBar />}>
      {children}
    </Screen>
  )
}
