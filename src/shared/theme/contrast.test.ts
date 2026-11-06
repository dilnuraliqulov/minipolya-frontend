/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * WCAG AA for every colour pair the two apps rely on, in light and dark, computed
 * from the real token values: 4.5:1 for text, 3:1 for icons and UI boundaries.
 * A token change that drops a pair below its threshold fails here.
 *
 * Backgrounds are stacks, bottom first: a translucent -soft fill (the admin's)
 * is composited over the card it sits on.
 */

type Palette = Record<string, string>

function block(css: string, selector: RegExp): Palette {
  const match = selector.exec(css)
  if (!match) throw new Error(`no block for ${String(selector)}`)
  const out: Palette = {}
  for (const [, name, value] of match[1]!.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6,8})\s*;/g)) {
    out[name!] = value!.toLowerCase()
  }
  return out
}

/** The two stylesheets that hold the palettes, read as text from the project root. */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const tokens = read('src/shared/theme/tokens.css')
const mini = read('src/miniapp/index.css')
const LIGHT = /:root\s*\{([^}]*)\}/
const DARK = /:root\[data-theme='dark'\]\s*\{([^}]*)\}/

const adminLight = block(tokens, LIGHT)
const adminDark = { ...adminLight, ...block(tokens, DARK) }
const miniLight = { ...adminLight, ...block(mini, LIGHT) }
const miniDark = { ...adminDark, ...block(mini, DARK) }

type Rgba = [number, number, number, number]
function parse(hex: string): Rgba {
  const h = hex.slice(1)
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
}
function over(top: Rgba, base: Rgba): Rgba {
  const a = top[3]
  return [0, 1, 2].map((i) => top[i]! * a + base[i]! * (1 - a)).concat(1) as Rgba
}
function luminance([r, g, b]: Rgba): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** `fg` may carry an opacity (Tailwind's `/75`), applied over the stacked background. */
function contrast(fg: string, bgs: string[], fgOpacity = 1): number {
  const base = bgs.map(parse).reduce((acc, layer) => over(layer, acc))
  const top = parse(fg)
  const front = over([top[0], top[1], top[2], top[3] * fgOpacity], base)
  const [hi, lo] = [luminance(front), luminance(base)].sort((a, b) => b - a)
  return (hi! + 0.05) / (lo! + 0.05)
}

const TEXT = 4.5
const NON_TEXT = 3

interface Pair {
  fg: string
  on: string[]
  min: number
  fgOpacity?: number
}

/** Each pair names tokens; `on` is the background stack. */
function pairs(mini: boolean): Pair[] {
  const plain = mini ? ['page-bg', 'bg', 'surface', 'bar-bg'] : ['page-bg', 'bg', 'surface']
  const text = [
    'text',
    'text-secondary',
    'link',
    'success-text',
    'warning-text',
    'danger-text',
    'link-text',
  ]
  const list: Pair[] = []
  for (const fg of text) for (const bg of plain) list.push({ fg, on: [bg], min: TEXT })
  for (const base of ['page-bg', 'bg']) {
    // Badges, notices, toasts: status text on its own soft fill.
    list.push(
      { fg: 'success-text', on: [base, 'success-soft'], min: TEXT },
      { fg: 'warning-text', on: [base, 'warning-soft'], min: TEXT },
      { fg: 'danger-text', on: [base, 'danger-soft'], min: TEXT },
      { fg: 'link-text', on: [base, 'accent-soft'], min: TEXT },
      { fg: 'text-secondary', on: [base, 'neutral-soft'], min: TEXT },
      { fg: 'text', on: [base, 'accent-soft'], min: TEXT },
      { fg: 'text', on: [base, 'warning-soft'], min: TEXT },
      // Accent icons on accent-soft tiles.
      { fg: 'link', on: [base, 'accent-soft'], min: NON_TEXT },
    )
  }
  list.push(
    // A disabled slot's state chip (bg-border).
    { fg: 'text-secondary', on: ['border'], min: TEXT },
    // White text on fills: primary / danger buttons, badges, the UZCARD tile.
    { fg: 'on-accent', on: ['accent'], min: TEXT },
    { fg: 'on-accent', on: ['danger-fill'], min: TEXT },
    { fg: 'on-accent', on: ['success-fill'], min: TEXT },
    // Selected slot price: accent text on white (bg-on-accent).
    { fg: 'accent', on: ['on-accent'], min: TEXT },
    // Switches, radio dots, focus outlines, chart bars.
    { fg: 'accent', on: ['bg'], min: NON_TEXT },
    { fg: 'accent', on: ['page-bg'], min: NON_TEXT },
  )
  // Admin chart tooltip: bg-primary with text-background and text-background/75.
  if (!mini) list.push({ fg: 'bg', on: ['text'], min: TEXT, fgOpacity: 0.75 })
  return list
}

const PALETTES: Array<[string, Palette, boolean]> = [
  ['admin light', adminLight, false],
  ['admin dark', adminDark, false],
  ['Mini App light', miniLight, true],
  ['Mini App dark', miniDark, true],
]

describe('colour contrast (WCAG AA)', () => {
  for (const [name, palette, isMini] of PALETTES) {
    it(`${name}: every pair meets its threshold`, () => {
      const value = (token: string) => {
        const v = palette[token]
        if (!v) throw new Error(`${name}: no --${token}`)
        return v
      }
      const failures = pairs(isMini)
        .map((p) => ({
          ...p,
          ratio: contrast(value(p.fg), p.on.map(value), p.fgOpacity),
        }))
        .filter((p) => p.ratio < p.min)
        .map((p) => `${p.fg} on ${p.on.join(' + ')}: ${p.ratio.toFixed(2)} < ${p.min}`)
      expect(failures).toEqual([])
    })
  }

  it('composites a translucent fill before measuring', () => {
    expect(contrast('#000000', ['#ffffff'])).toBeCloseTo(21, 5)
    expect(contrast('#000000', ['#ffffff', '#00000000'])).toBeCloseTo(21, 5)
  })
})
