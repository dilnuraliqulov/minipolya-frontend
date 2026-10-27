import { Goal, LogOut, Moon, Sun } from 'lucide-react'
import { Fragment } from 'react'
import { NavLink } from 'react-router'
import { formatNumber } from '../../shared/format'
import type { User } from '../api/types'
import { logout } from '../auth/session'
import { Avatar } from '../components/Avatar'
import { cx } from '../components/cx'
import { useStats } from '../queries'
import { setAdminTheme, useAdminTheme } from '../theme'
import { MENU } from './menu'

const row =
  'flex items-center gap-2.5 rounded-md px-3 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-accent'

function ThemeToggle() {
  const theme = useAdminTheme()
  const options = [
    { mode: 'light' as const, icon: Sun, label: 'Yorugʻ mavzu' },
    { mode: 'dark' as const, icon: Moon, label: 'Tungi mavzu' },
  ]
  return (
    <div className="flex items-center gap-2.5 py-2 pr-2 pl-3">
      <span className="flex-1 text-sm text-secondary">Mavzu</span>
      <div role="group" aria-label="Mavzu" className="flex gap-0.5 rounded-md bg-surface p-0.5">
        {options.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            aria-label={label}
            aria-pressed={theme === mode}
            onClick={() => setAdminTheme(mode)}
            className={cx(
              'flex h-6 w-7 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-accent',
              theme === mode ? 'bg-background text-primary shadow-sm' : 'text-secondary',
            )}
          >
            <Icon size={14} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}

export function Sidebar({ user }: { user: User }) {
  const { data: stats } = useStats()

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex size-8 items-center justify-center rounded-md bg-accent">
          <Goal size={18} aria-hidden className="text-on-accent" />
        </span>
        <span className="flex flex-col gap-px">
          <span className="text-md font-semibold text-primary">MiniPolya</span>
          <span className="text-xs text-secondary">Admin</span>
        </span>
      </div>

      <nav aria-label="Asosiy menyu" className="flex flex-col gap-0.5 px-3 py-2">
        {MENU.map((item) => {
          const count = item.badge && stats ? stats[item.badge] : 0
          return (
            <Fragment key={item.path}>
              {item.dividerBefore && <hr className="mx-3 my-1.5 border-border" />}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cx(row, isActive ? 'bg-accent-soft text-accent' : 'text-primary hover:bg-hover')
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      aria-hidden
                      className={isActive ? 'text-accent' : 'text-secondary'}
                    />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        aria-label={`${count} ta kutilmoqda`}
                        className="rounded-full bg-accent px-1.75 py-0.5 text-2xs leading-none font-semibold text-on-accent"
                      >
                        {formatNumber(count)}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </Fragment>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border px-3 pt-3 pb-4">
        <div className="flex items-center gap-2.5 p-2">
          <Avatar name={user.name} size="lg" />
          <span className="flex min-w-0 flex-col gap-px">
            <span className="truncate text-base font-medium text-primary">{user.name}</span>
            <span className="text-xs text-secondary">Administrator</span>
          </span>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={() => logout()}
          className={cx(row, 'text-primary hover:bg-hover')}
        >
          <LogOut size={18} aria-hidden className="text-secondary" />
          Chiqish
        </button>
      </div>
    </aside>
  )
}
