import { Goal, LogOut, Moon, Sun } from 'lucide-react'
import { Fragment } from 'react'
import { NavLink } from 'react-router'
import { formatNumber } from '../../shared/format'
import type { User } from '../api/types'
import { logout } from '../auth/session'
import { Avatar } from '../components/Avatar'
import { cx } from '../components/cx'
import { useFailedRefunds, useStats } from '../queries'
import { setAdminTheme, useAdminTheme } from '../theme'
import { MENU, type MenuBadge } from './menu'

const BADGES: Record<MenuBadge, { className: string; label: (count: string) => string }> = {
  pendingStadiums: { className: 'bg-accent', label: (count) => `${count} ta kutilmoqda` },
  failedRefunds: {
    className: 'bg-danger-fill',
    label: (count) => `${count} ta muvaffaqiyatsiz qaytarish`,
  },
}

const row =
  'flex items-center gap-2.5 rounded-md px-3 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-accent'

/** Icon-only rows in the rail: the same height, centred, nothing but the icon. */
const railRow =
  'relative flex size-11 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-accent'

/**
 * How the menu is shown.
 *
 * - `full` — the design's 240 px sidebar (≥ 1280px, and inside the drawer).
 * - `rail` — icon-only, 1024–1280px; every label is a `title` tooltip.
 * - `drawer` — `full` without the sticky full-height frame, inside `NavDrawer`.
 */
export type SidebarVariant = 'full' | 'rail' | 'drawer'

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

/** The rail's theme control: one button that flips between the two modes. */
function RailThemeToggle() {
  const theme = useAdminTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Tungi mavzu' : 'Yorugʻ mavzu'
  const Icon = next === 'dark' ? Moon : Sun
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setAdminTheme(next)}
      className={cx(railRow, 'text-secondary hover:bg-hover hover:text-primary')}
    >
      <Icon size={18} aria-hidden />
    </button>
  )
}

export function Sidebar({ user, variant = 'full' }: { user: User; variant?: SidebarVariant }) {
  const { data: stats } = useStats()
  const failedRefunds = useFailedRefunds()
  const counts: Record<MenuBadge, number> = {
    pendingStadiums: stats?.pendingStadiumApprovals ?? 0,
    failedRefunds: failedRefunds?.count ?? 0,
  }
  const rail = variant === 'rail'

  return (
    <aside
      className={cx(
        'flex shrink-0 flex-col border-border bg-background',
        variant === 'drawer' ? 'h-full w-full' : 'sticky top-0 h-dvh border-r',
        rail ? 'w-16 items-center' : variant === 'full' && 'w-60',
      )}
    >
      <div className={cx('flex items-center gap-2.5', rail ? 'px-3 pt-5 pb-4' : 'px-5 pt-5 pb-4')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent">
          <Goal size={18} aria-hidden className="text-on-accent" />
        </span>
        {rail ? (
          <span className="sr-only">MiniPolya Admin</span>
        ) : (
          <span className="flex flex-col gap-px">
            <span className="text-md font-semibold text-primary">MiniPolya</span>
            <span className="text-xs text-secondary">Admin</span>
          </span>
        )}
      </div>

      <nav
        aria-label="Asosiy menyu"
        className={cx('flex flex-col gap-0.5 py-2', rail ? 'px-2.5' : 'px-3')}
      >
        {MENU.map((item) => {
          const count = item.badge ? counts[item.badge] : 0
          const badge = item.badge ? BADGES[item.badge] : null
          return (
            <Fragment key={item.path}>
              {item.dividerBefore && (
                <hr className={cx('my-1.5 border-border', rail ? 'mx-1.5 w-8' : 'mx-3')} />
              )}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                title={rail ? item.label : undefined}
                className={({ isActive }) =>
                  cx(
                    rail ? railRow : row,
                    isActive ? 'bg-accent-soft text-link-text' : 'text-primary hover:bg-hover',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      aria-hidden
                      className={cx('shrink-0', isActive ? 'text-link' : 'text-secondary')}
                    />
                    {rail ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="flex-1">{item.label}</span>
                    )}
                    {badge &&
                      count > 0 &&
                      (rail ? (
                        // No room for the number: a dot, with the count read out.
                        <span
                          aria-label={badge.label(formatNumber(count))}
                          className={cx(
                            'absolute top-1.5 right-1.5 size-2 rounded-full',
                            badge.className,
                          )}
                        />
                      ) : (
                        <span
                          aria-label={badge.label(formatNumber(count))}
                          className={cx(
                            'rounded-full px-1.75 py-0.5 text-2xs leading-none font-semibold text-on-accent',
                            badge.className,
                          )}
                        >
                          {formatNumber(count)}
                        </span>
                      ))}
                  </>
                )}
              </NavLink>
            </Fragment>
          )
        })}
      </nav>

      <div
        className={cx(
          'mt-auto flex flex-col gap-1 border-t border-border pt-3 pb-4',
          rail ? 'items-center px-2.5' : 'px-3',
        )}
      >
        {rail ? (
          <>
            <span title={user.name} className="flex size-11 items-center justify-center">
              <Avatar name={user.name} size="lg" />
              <span className="sr-only">{user.name}</span>
            </span>
            <RailThemeToggle />
            <button
              type="button"
              title="Chiqish"
              aria-label="Chiqish"
              onClick={() => logout()}
              className={cx(railRow, 'text-secondary hover:bg-hover hover:text-primary')}
            >
              <LogOut size={18} aria-hidden />
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </aside>
  )
}
