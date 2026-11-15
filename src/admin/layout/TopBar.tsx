import { ChevronLeft, LogOut, Menu, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { User } from '../api/types'
import { logout } from '../auth/session'
import { Avatar } from '../components/Avatar'
import { cx } from '../components/cx'
import { toggleAdminTheme, useAdminTheme } from '../theme'

/** 44 px, the smallest comfortable touch target. */
const tap =
  'flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-accent'

/**
 * The bar that stands in for the sidebar below 1024px: the menu button, an
 * optional back link, the page title, the theme toggle and the account menu.
 *
 * Its theme button is a single toggle — the sidebar's two-button group keeps
 * its own labels, so the two never share an accessible name.
 */
export function TopBar({
  title,
  back,
  user,
  onOpenMenu,
}: {
  title?: string
  /** Where the back chevron goes; omitted on top-level pages. */
  back?: string
  user: User
  onOpenMenu: () => void
}) {
  const theme = useAdminTheme()
  const [account, setAccount] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!account) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setAccount(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccount(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [account])

  const ThemeIcon = theme === 'dark' ? Sun : Moon
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
      <button type="button" aria-label="Menyuni ochish" onClick={onOpenMenu} className={tap}>
        <Menu size={20} aria-hidden />
      </button>
      {back && (
        <Link to={back} aria-label="Orqaga" className={tap}>
          <ChevronLeft size={20} aria-hidden />
        </Link>
      )}
      {title && (
        <h1 className="min-w-0 flex-1 truncate px-1 text-xl font-semibold text-primary">{title}</h1>
      )}
      {!title && <span className="flex-1" />}
      <button
        type="button"
        aria-label="Mavzuni almashtirish"
        onClick={() => toggleAdminTheme()}
        className={tap}
      >
        <ThemeIcon size={18} aria-hidden />
      </button>
      <div ref={root} className="relative">
        <button
          type="button"
          aria-label="Hisob"
          aria-haspopup="menu"
          aria-expanded={account}
          onClick={() => setAccount((open) => !open)}
          className={tap}
        >
          <Avatar name={user.name} />
        </button>
        {account && (
          <div
            role="menu"
            aria-label="Hisob"
            className="absolute top-full right-0 z-40 mt-1 flex w-56 flex-col gap-1 rounded-lg border border-border bg-background p-2 shadow-lg"
          >
            <span className="flex min-w-0 flex-col gap-px px-2 py-1.5">
              <span className="truncate text-base font-medium text-primary">{user.name}</span>
              <span className="text-xs text-secondary">Administrator</span>
            </span>
            <hr className="border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => logout()}
              className={cx(
                'flex h-11 items-center gap-2.5 rounded-md px-2 text-base font-medium text-primary',
                'hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent',
              )}
            >
              <LogOut size={18} aria-hidden className="text-secondary" />
              Chiqish
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
