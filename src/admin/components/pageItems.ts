/**
 * Which page buttons to show (1-based labels), with `null` for a gap:
 * always first and last, plus the current page and its neighbours.
 */
export function pageItems(current: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const page = current + 1
  const pages = new Set([1, total, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p))
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const items: Array<number | null> = []
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1]
    if (previous !== undefined && p - previous > 1) items.push(null)
    items.push(p)
  })
  return items
}
