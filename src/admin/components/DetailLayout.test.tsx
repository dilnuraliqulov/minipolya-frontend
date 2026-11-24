import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../test-utils'
import { DetailLayout, type DetailBlock } from './DetailLayout'
import { COMPACT_NAV } from './useMediaQuery'

const blocks: DetailBlock[] = [
  { key: 'summary', column: 'aside', node: <p>Maʼlumotlar</p> },
  { key: 'decision', column: 'aside', node: <p>Qaror</p> },
  { key: 'tabs', column: 'main', node: <p>Tablar</p> },
  { key: 'history', column: 'main', node: <p>Tarix</p> },
]

/** Every block's text in document order, so the order itself is asserted. */
function texts() {
  return Array.from(document.querySelectorAll('p'), (p) => p.textContent)
}

describe('DetailLayout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the desktop two-column layout when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    render(<DetailLayout blocks={blocks} asideLabel="Foydalanuvchi" />)
    const aside = screen.getByRole('complementary', { name: 'Foydalanuvchi' })
    expect(aside).toHaveTextContent('Maʼlumotlar')
    expect(aside).not.toHaveTextContent('Tarix')
  })

  it('keeps each desktop column in array order', () => {
    render(<DetailLayout blocks={blocks} asideLabel="Foydalanuvchi" />)
    expect(texts()).toEqual(['Tablar', 'Tarix', 'Maʼlumotlar', 'Qaror'])
  })

  it('renders one column in array order below 1024px', () => {
    stubMedia(COMPACT_NAV)
    render(<DetailLayout blocks={blocks} asideLabel="Foydalanuvchi" />)
    expect(texts()).toEqual(['Maʼlumotlar', 'Qaror', 'Tablar', 'Tarix'])
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('reorders without throwing when the viewport crosses 1024px', () => {
    const flip = stubMedia()
    const withButton: DetailBlock[] = [
      {
        key: 'decision',
        column: 'aside',
        node: (
          <>
            <button>Bloklash</button>
            <p>Qaror</p>
          </>
        ),
      },
      ...blocks.filter((b) => b.key !== 'decision'),
    ]
    render(<DetailLayout blocks={withButton} asideLabel="Foydalanuvchi" />)
    screen.getByRole('button', { name: 'Bloklash' }).focus()
    expect(document.activeElement).toHaveAccessibleName('Bloklash')

    act(() => flip(COMPACT_NAV))

    // The remount is accepted (see the spec's Approaches): what must hold is
    // that the order is right, the button is still there, and focus fell back
    // to the document rather than to a detached node.
    expect(texts()).toEqual(['Qaror', 'Maʼlumotlar', 'Tablar', 'Tarix'])
    expect(screen.getByRole('button', { name: 'Bloklash' })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })
})
