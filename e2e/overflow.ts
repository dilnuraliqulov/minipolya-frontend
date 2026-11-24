import { expect, type Page } from '@playwright/test'

/** What the in-page walk reports back. */
interface OverflowReport {
  scrollWidth: number
  innerWidth: number
  offenders: string[]
}

/**
 * Fails if the page is wider than the viewport, or if any element spills out of
 * its parent.
 *
 * `label` names the page (and the state it is in) so a failure says which one
 * broke without digging through a trace.
 */
export async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const report = await page.evaluate<OverflowReport>(() => {
    const offenders: string[] = []
    const roots = document.querySelectorAll('main, header, [role="dialog"]')

    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/) : []
      return `${el.tagName.toLowerCase()}${cls.length ? `.${cls.slice(0, 3).join('.')}` : ''}`
    }

    /** A box that scrolls sideways on purpose clips its children legitimately. */
    const scrollsX = (el: Element) => {
      const overflowX = getComputedStyle(el).overflowX
      return overflowX === 'auto' || overflowX === 'scroll'
    }

    for (const root of roots) {
      for (const el of root.querySelectorAll('*')) {
        const box = el.getBoundingClientRect()
        // An element with no box (display:none, an empty inline) reports all
        // zeros and would read as spilling past any parent. It cannot be seen,
        // so it cannot overflow.
        if (box.width === 0 && box.height === 0) continue

        const parent = el.parentElement
        if (!parent) continue
        // Out-of-flow boxes are positioned against an ancestor on purpose: a
        // dropdown anchored right, a chart label centred on a tick with
        // `-translate-x-1/2`. Extending past the parent is their job, and the
        // scrollWidth assertion above still catches one that reaches the edge.
        const position = getComputedStyle(el).position
        if (position === 'absolute' || position === 'fixed') continue
        // Walk up: if anything between here and the root scrolls sideways, the
        // overflow is intended (DataTable, AuditLogTable).
        let ancestor: Element | null = parent
        let intended = false
        while (ancestor && ancestor !== document.documentElement) {
          if (scrollsX(ancestor)) {
            intended = true
            break
          }
          ancestor = ancestor.parentElement
        }
        if (intended) continue

        const parentBox = parent.getBoundingClientRect()
        if (parentBox.width === 0 && parentBox.height === 0) continue
        // 1px for sub-pixel rounding.
        const right = box.right - parentBox.right
        const left = parentBox.left - box.left
        if (right > 1 || left > 1) {
          offenders.push(
            `${describe(el)} spills ${Math.round(Math.max(right, left))}px out of ${describe(parent)}`,
          )
        }
        if (offenders.length >= 5) break
      }
      if (offenders.length >= 5) break
    }

    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      offenders,
    }
  })

  expect(
    report.scrollWidth,
    `${label}: the page scrolls sideways — scrollWidth ${report.scrollWidth} > innerWidth ${report.innerWidth}`,
  ).toBeLessThanOrEqual(report.innerWidth)

  expect(report.offenders, `${label}: ${report.offenders.join('; ')}`).toEqual([])
}
