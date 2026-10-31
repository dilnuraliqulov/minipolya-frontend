import type { ReactNode } from 'react'
import { Header, Screen } from '../components'
import { TabBar } from './TabBar'

/** A tab's root screen: header (no back), content, and the bottom navigation. */
export function TabScreen({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Screen header={<Header title={title} action={action} />} footer={<TabBar />}>
      {children}
    </Screen>
  )
}
