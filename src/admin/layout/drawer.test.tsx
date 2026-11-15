import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { COMPACT_NAV, RAIL_NAV } from '../components/useMediaQuery'
import {
  mockBackend,
  renderAt,
  signIn,
  stats,
  stubMedia,
  useAdminTestSetup,
  type Reply,
} from '../test-utils'

const replies: Record<string, Reply> = {
  '/api/admin/stats': [200, stats],
  '/api/admin/stats/bookings-daily': [200, []],
}

const MENU_BUTTON = 'Menyuni ochish'
const THEME_BUTTON = 'Mavzuni almashtirish'
const DRAWER = { name: 'Menyu' }

/** Signs in at the given width and renders the overview. */
function show(...media: string[]) {
  const resize = stubMedia(...media)
  mockBackend(replies)
  signIn()
  return { router: renderAt('/'), resize }
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: MENU_BUTTON }))
  return screen.getByRole('dialog', DRAWER)
}

describe('navigation below 1024px', () => {
  useAdminTestSetup()

  it('replaces the sidebar with a top bar carrying the page title', () => {
    show(COMPACT_NAV)
    expect(screen.getByRole('button', { name: MENU_BUTTON })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: THEME_BUTTON })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Bosh sahifa' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Asosiy menyu' })).not.toBeInTheDocument()
  })

  it('offers the account and logging out from the top bar', () => {
    show(COMPACT_NAV)
    fireEvent.click(screen.getByRole('button', { name: 'Hisob' }))
    const account = screen.getByRole('menu', { name: 'Hisob' })
    expect(account).toHaveTextContent('Aziz Rahimov')
    expect(within(account).getByRole('menuitem', { name: 'Chiqish' })).toBeInTheDocument()
  })

  it('opens the menu as a dialog holding the whole menu', () => {
    show(COMPACT_NAV)
    const drawer = openMenu()
    const menu = within(drawer).getByRole('navigation', { name: 'Asosiy menyu' })
    expect(within(menu).getByRole('link', { name: /Bronlar/ })).toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: 'Chiqish' })).toBeInTheDocument()
  })

  it('closes on navigation', () => {
    const { router } = show(COMPACT_NAV)
    const drawer = openMenu()
    fireEvent.click(within(drawer).getByRole('link', { name: /Bronlar/ }))
    expect(router.state.location.pathname).toBe('/bronlar')
    expect(screen.queryByRole('dialog', DRAWER)).not.toBeInTheDocument()
  })

  it('closes on the backdrop', () => {
    show(COMPACT_NAV)
    openMenu()
    fireEvent.mouseDown(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByRole('dialog', DRAWER)).not.toBeInTheDocument()
  })

  it('closes on Esc and gives focus back to the menu button', () => {
    show(COMPACT_NAV)
    // A real click focuses the button first; jsdom's fireEvent does not.
    screen.getByRole('button', { name: MENU_BUTTON }).focus()
    expect(openMenu()).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', DRAWER)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: MENU_BUTTON })).toHaveFocus()
  })

  it('keeps Tab inside the drawer while it is open', () => {
    show(COMPACT_NAV)
    const drawer = openMenu()
    const stops = within(drawer).getAllByRole('link')
    const last = within(drawer).getByRole('button', { name: 'Chiqish' })
    last.focus()
    fireEvent.keyDown(drawer, { key: 'Tab' })
    expect(stops[0]).toHaveFocus()
    fireEvent.keyDown(drawer, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('locks the page behind the drawer and releases it on close', () => {
    show(COMPACT_NAV)
    openMenu()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })

  // Review Focus 1: the viewport crosses a breakpoint while the drawer is open.
  it('closes the drawer when the viewport grows past 1024px', () => {
    const { resize } = show(COMPACT_NAV)
    openMenu()
    act(() => resize())
    expect(screen.queryByRole('dialog', DRAWER)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: MENU_BUTTON })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Asosiy menyu' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('navigation between 1024 and 1280px', () => {
  useAdminTestSetup()

  it('is an icon-only rail whose links carry their label as a tooltip', () => {
    show(RAIL_NAV)
    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    const link = within(menu).getByRole('link', { name: 'Bronlar' })
    expect(link).toHaveAttribute('title', 'Bronlar')
    expect(screen.queryByRole('button', { name: MENU_BUTTON })).not.toBeInTheDocument()
  })

  it('still reads out a menu badge', async () => {
    show(RAIL_NAV)
    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    expect(await within(menu).findByLabelText('2 ta kutilmoqda')).toBeInTheDocument()
  })
})

describe('navigation at 1280px and above', () => {
  useAdminTestSetup()

  it('is the full sidebar, with no top bar', () => {
    show()
    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    expect(within(menu).getByRole('link', { name: /Bronlar/ })).not.toHaveAttribute('title')
    expect(screen.queryByRole('button', { name: MENU_BUTTON })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: THEME_BUTTON })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tungi mavzu' })).toBeInTheDocument()
  })
})
