# Admin panel responsive layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/admin` usable on phones and tablets without changing
anything the desktop admin sees at ≥ 1280px.

**Architecture:** Three Tailwind breakpoints carry the whole change — `md`
(768px) swaps tables for cards and filters for a sheet, `lg` (1024px) swaps the
sidebar for a top bar plus drawer, `xl` (1280px) restores today's layout
untouched. Where a component must *render* differently (one nav, one table
body) a `useMediaQuery` hook decides, so the DOM never carries two copies of
the same content; where it only *looks* different, Tailwind `max-*` variants
do it in CSS.

**Tech Stack:** React 19, react-router 8, Tailwind CSS 4, TanStack Query 5,
Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-14-admin-responsive-design.md`

## Global Constraints

- Nothing changes at ≥ 1280px. Every new rule is either a `max-*` variant or a
  default that an `xl:` rule overrides back to today's value.
- Tailwind's default breakpoints only: `md` 768px, `lg` 1024px, `xl` 1280px.
  The one exception the spec names is 480px, written `min-[480px]:`.
- Colours are design tokens only — no hex, no `bg-white`, no Tailwind palette
  colours. Both light and dark must be checked.
- Admin text is Uzbek Latin with `ʻ` (U+02BB) in oʻ/gʻ and `ʼ` (U+02BC) for the
  tutuq belgisi. No translation layer in the admin panel.
- Use the components in `src/admin/components/`; do not restyle per page.
- Real data only: no new endpoint, field or sample value.
- `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` must
  pass before each commit.
- Commit on the current branch only (`feature/admin-responsive`). No branches,
  no pushes, no PRs.

## Review Focus

1. **The viewport crosses a breakpoint while an overlay is open** — open the
   drawer at 390px and widen to 1280px: the drawer must close and focus must
   return to the page, not vanish with the unmounted top bar. *(Task 2)*
2. **`window.matchMedia` is absent** (jsdom, old browsers) — `useMediaQuery`
   must answer `false` and never throw, so the panel degrades to the desktop
   layout rather than crashing. *(Task 1)*
3. **A `DataTable` with no card renderer at phone width** — the secondary
   tables (UserPage tabs, stadium pricing) must stay readable as a
   horizontally scrollable table with a sticky first column, not silently
   render an empty list. *(Task 4)*
4. **A long unbroken string at 360px** — a 40-character stadium name, a
   transaction id, a 15-digit money figure must truncate or wrap inside their
   card and must not widen the page. *(Task 8)*
5. **Two overlays stacked** — a filter sheet opened on a page that already has
   a side panel in the URL: Esc must close the sheet only, and the panel must
   still be open underneath. *(Task 5)*

---

### Task 1: Media-query hook and the test helper

**Files:**
- Create: `src/admin/components/useMediaQuery.ts`
- Create: `src/admin/components/useMediaQuery.test.ts`
- Modify: `src/admin/test-utils.tsx` (add `stubMedia`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `useMediaQuery(query: string): boolean`
  - `const COMPACT_NAV = '(max-width: 1023px)'` — drawer instead of a sidebar
  - `const RAIL_NAV = '(min-width: 1024px) and (max-width: 1279px)'` — icon rail
  - `const CARD_ROWS = '(max-width: 767px)'` — table rows as cards
  - `stubMedia(...queries: string[]): void` from `test-utils` — stubs
    `window.matchMedia` so exactly the listed query strings match; cleared by
    `useAdminTestSetup`'s `vi.unstubAllGlobals()`.

- [ ] **Step 1: Write the failing test** in `src/admin/components/useMediaQuery.test.ts`

```ts
it('answers false and does not throw when matchMedia is missing', () => {
  vi.stubGlobal('matchMedia', undefined)
  const { result } = renderHook(() => useMediaQuery(CARD_ROWS))
  expect(result.current).toBe(false)
})

it('answers the query and follows a change', () => {
  // A fake MediaQueryList whose `matches` flips and notifies its listener.
  const { result } = renderHook(() => useMediaQuery(CARD_ROWS))
  expect(result.current).toBe(true)
  act(() => flip(false))
  expect(result.current).toBe(false)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/admin/components/useMediaQuery.test.ts`
Expected: FAIL — `useMediaQuery` is not exported.

- [ ] **Step 3: Implement `useMediaQuery(query: string): boolean`**

Same shape as `src/admin/components/motion.ts`: `useSyncExternalStore` over
`matchMedia(query)`, subscribing with `addEventListener('change', …)`,
returning `false` from both `getSnapshot` and the server snapshot when
`typeof window.matchMedia !== 'function'`. Export the three query constants
above with the one-line comments given in Interfaces.

- [ ] **Step 4: Add `stubMedia` to `src/admin/test-utils.tsx`**

`stubMedia(...queries: string[])` calls `vi.stubGlobal('matchMedia', …)` with a
function returning `{ matches: queries.includes(query), media: query,
addEventListener() {}, removeEventListener() {} }`. Document that a test which
calls no `stubMedia` gets the desktop layout, which is why every existing test
is unaffected.

- [ ] **Step 5: Run the checks**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS, including every existing admin test unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/admin/components/useMediaQuery.ts src/admin/components/useMediaQuery.test.ts src/admin/test-utils.tsx
git commit -m "feat(admin): add useMediaQuery and the stubMedia test helper"
```

---

### Task 2: Top bar, navigation drawer and icon rail

**Files:**
- Create: `src/admin/components/overlay.ts` (focus trap + scroll lock)
- Create: `src/admin/layout/TopBar.tsx`
- Create: `src/admin/layout/NavDrawer.tsx`
- Create: `src/admin/layout/drawer.test.tsx`
- Modify: `src/admin/layout/Sidebar.tsx` (add `variant`)
- Modify: `src/admin/layout/AdminLayout.tsx`

**Interfaces:**
- Consumes: `useMediaQuery`, `COMPACT_NAV`, `RAIL_NAV`, `stubMedia` (Task 1).
- Produces:
  - `useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void` —
    focuses the container, keeps Tab inside it, restores focus on close.
  - `useScrollLock(active: boolean): void` — `overflow: hidden` on `<body>`.
  - `Sidebar({ user, variant }: { user: User; variant?: 'full' | 'rail' | 'drawer' })`,
    default `'full'` (today's markup, unchanged).
  - `TopBar({ title, user, onOpenMenu }: { title?: string; user: User; onOpenMenu: () => void })`
  - `NavDrawer({ open, user, onClose }: { open: boolean; user: User; onClose: () => void })`

- [ ] **Step 1: Write the failing tests** in `src/admin/layout/drawer.test.tsx`

```tsx
describe('navigation drawer', () => {
  useAdminTestSetup()

  const open = async () => {
    stubMedia(COMPACT_NAV)
    mockBackend({ '/api/admin/stats': [200, stats] })
    signIn()
    const router = renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Menyuni ochish' }))
    return router
  }

  it('shows the top bar instead of the sidebar, and no sidebar until the menu opens', () => {
    stubMedia(COMPACT_NAV)
    mockBackend({ '/api/admin/stats': [200, stats] })
    signIn()
    renderAt('/')
    expect(screen.getByRole('button', { name: 'Menyuni ochish' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Asosiy menyu' })).not.toBeInTheDocument()
  })

  it('opens the menu as a dialog with the menu inside', async () => {
    await open()
    const drawer = screen.getByRole('dialog', { name: 'Menyu' })
    expect(within(drawer).getByRole('navigation', { name: 'Asosiy menyu' })).toBeInTheDocument()
  })

  it('closes on navigation', async () => {
    const router = await open()
    fireEvent.click(screen.getByRole('link', { name: /Bronlar/ }))
    expect(router.state.location.pathname).toBe('/bronlar')
    expect(screen.queryByRole('dialog', { name: 'Menyu' })).not.toBeInTheDocument()
  })

  it('closes on the backdrop and on Esc', async () => {
    await open()
    fireEvent.mouseDown(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByRole('dialog', { name: 'Menyu' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Menyuni ochish' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Menyu' })).not.toBeInTheDocument()
  })

  it('keeps focus inside while open and gives it back on close', async () => {
    await open()
    expect(screen.getByRole('dialog', { name: 'Menyu' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Menyuni ochish' })).toHaveFocus()
  })

  // Review Focus 1
  it('closes when the viewport grows past the drawer breakpoint', async () => {
    await open()
    act(() => stubMedia()) // nothing matches: desktop
    // force a re-render through the hook's subscription
    expect(screen.queryByRole('dialog', { name: 'Menyu' })).not.toBeInTheDocument()
  })

  it('shows an icon-only rail between 1024 and 1280px', () => {
    stubMedia(RAIL_NAV)
    mockBackend({ '/api/admin/stats': [200, stats] })
    signIn()
    renderAt('/')
    const menu = screen.getByRole('navigation', { name: 'Asosiy menyu' })
    const link = within(menu).getByRole('link', { name: 'Bronlar' })
    expect(link).toHaveAttribute('title', 'Bronlar')
    expect(screen.queryByRole('button', { name: 'Menyuni ochish' })).not.toBeInTheDocument()
  })
})
```

For Review Focus 1, make `stubMedia` notify registered listeners so a later
`stubMedia()` call flips live queries; if that proves awkward, close the drawer
from an effect on `compact` turning false and assert that instead.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/admin/layout/drawer.test.tsx`
Expected: FAIL — no "Menyuni ochish" button.

- [ ] **Step 3: Implement `useFocusTrap` and `useScrollLock` in `src/admin/components/overlay.ts`**

`useFocusTrap` remembers `document.activeElement`, focuses the container, and
on `keydown` of Tab cycles between the first and last of
`container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')`;
on deactivation it restores the remembered element.

- [ ] **Step 4: Add `variant` to `Sidebar`**

- `'full'` — exactly today's markup and classes, including `sticky top-0 h-dvh w-60`.
- `'rail'` — `w-16`, same `<nav aria-label="Asosiy menyu">`, each `NavLink`
  icon-only: `title={item.label}` plus `<span className="sr-only">{item.label}</span>`,
  the badge a 6px dot in the corner with its existing `aria-label`. The brand
  shows the mark alone; the footer shows the avatar, a single theme toggle
  button and a log-out icon button, each with its `title` and `aria-label`.
- `'drawer'` — the `'full'` body without `sticky`/`h-dvh`, filling the drawer.

Keep one `MENU.map`; only the row's contents and the wrapper classes branch.

- [ ] **Step 5: Implement `TopBar`**

A `<header>` with `bg-background border-b border-border`, `h-14`, sticky at the
top, holding: a ☰ `<button aria-label="Menyuni ochish">` (≥ 44px), the page
`title` as a single truncating line, a theme toggle
`<button aria-label="Mavzuni almashtirish">` calling `toggleAdminTheme()`
(a different accessible name from the sidebar's two-button group, so neither
query becomes ambiguous), and a user button opening a small popover with the
admin's name and "Chiqish" — the popover's contents render only while open.

- [ ] **Step 6: Implement `NavDrawer`**

`createPortal` into `document.body`. Returns `null` when closed. Renders a
backdrop `<div data-testid="drawer-backdrop" className="fixed inset-0 z-40 bg-overlay">`
whose `onMouseDown` closes, and a panel
`<div role="dialog" aria-modal="true" aria-label="Menyu" tabIndex={-1}>` on the
left, `w-72 max-w-[85vw] h-dvh`, holding `<Sidebar variant="drawer" />`.
Esc closes. Uses `useFocusTrap` and `useScrollLock`.

- [ ] **Step 7: Rewire `AdminLayout`**

```tsx
const compact = useMediaQuery(COMPACT_NAV)
const rail = useMediaQuery(RAIL_NAV)
const [menuOpen, setMenuOpen] = useState(false)
useEffect(() => { if (!compact) setMenuOpen(false) }, [compact])
```

Render exactly one navigation: `<NavDrawer>` + `<TopBar>` when `compact`,
`<Sidebar variant="rail" />` when `rail`, `<Sidebar />` otherwise. Close the
drawer on every location change (`useLocation()` in an effect). `<main>`
padding becomes `p-4 lg:p-6` and keeps `min-w-0 flex-1`. The `PageHeader` is
hidden below `lg` (`max-lg:hidden`) because the top bar already shows the
title; breadcrumbs move with it, so detail pages get a back link in Task 7.

- [ ] **Step 8: Run the tests**

Run: `npx vitest run src/admin/layout/drawer.test.tsx src/admin/app.test.tsx`
Expected: PASS — the drawer tests, and `app.test.tsx` unchanged (no
`stubMedia` means desktop).

- [ ] **Step 9: Check in Chrome, light and dark**

Open `http://localhost:5173/admin/` at 360×800, 390×844, 768×1024 and
1280×800. Confirm: the drawer opens, closes three ways and traps focus; the
rail shows tooltips at 1100px; 1280px is pixel-identical to `main`; and
`document.documentElement.scrollWidth === document.documentElement.clientWidth`
at every width.

- [ ] **Step 10: Commit**

```bash
git add src/admin/components/overlay.ts src/admin/layout
git commit -m "feat(admin): top bar with a navigation drawer below 1024px and an icon rail below 1280px"
```

---

### Task 3: Bosh sahifa

**Files:**
- Modify: `src/admin/pages/overview/OverviewPage.tsx`
- Modify: `src/admin/components/KpiCard.tsx`
- Modify: `src/admin/components/BarChart.tsx`

**Interfaces:**
- Consumes: Task 2's layout.
- Produces: nothing new.

- [ ] **Step 1: KPI grid**

`KPI_GRID` becomes `'grid grid-cols-1 min-[480px]:grid-cols-2 gap-4 xl:grid-cols-4'`.
Unchanged at ≥ 1280px.

- [ ] **Step 2: To-do tiles full width**

The tile row becomes `flex flex-col gap-4 lg:flex-row`, so each tile is full
width below 1024px and the ≥ 1280px row is unchanged. In `TodoTile`, the
"Koʻrib chiqish" text gets `max-sm:sr-only` so only the arrow shows at phone
width while the link's accessible name is unchanged, and the count drops to
`text-5xl min-[480px]:text-6xl`.

- [ ] **Step 3: KPI value and chart fit the width**

In `KpiCard`, the value becomes `text-4xl min-[480px]:text-5xl` and the label
keeps `break-words`. In `BarChart`, the y-axis column becomes `w-5 md:w-6` and
the x-axis label strip's `ml-8.5` becomes `ml-7.5 md:ml-8.5`; `height` already
comes from the caller and the plot already measures its own width.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/admin/app.test.tsx src/admin/components/BarChart.test.tsx src/admin/components/basics.test.tsx`
Expected: PASS.

- [ ] **Step 5: Check in Chrome, light and dark**

At 360, 390, 768 and 1280: one KPI column below 480, two up to 1024, four at
1280; the chart's last bar and axis labels are inside the card; no horizontal
scroll.

- [ ] **Step 6: Commit**

```bash
git add src/admin/pages/overview/OverviewPage.tsx src/admin/components/KpiCard.tsx src/admin/components/BarChart.tsx
git commit -m "feat(admin): stack the overview KPI cards, tiles and chart on small screens"
```

---

### Task 4: Tables as cards below 768px

**Files:**
- Modify: `src/admin/components/DataTable.tsx`
- Modify: `src/admin/components/DataTable.test.tsx`
- Modify: `src/admin/audit/AuditLogTable.tsx`
- Modify: `src/admin/pages/stadiums/StadiumsPage.tsx`
- Modify: `src/admin/pages/users/UsersPage.tsx`
- Modify: `src/admin/pages/bookings/BookingsPage.tsx`
- Modify: `src/admin/pages/payments/PaymentsPage.tsx`
- Modify: `src/admin/components/Pagination.tsx`
- Create: `src/admin/pages/users/UsersPage.cards.test.tsx`

**Interfaces:**
- Consumes: `useMediaQuery`, `CARD_ROWS`, `stubMedia` (Task 1).
- Produces:
  - `DataTable` gains `card?: (row: T) => ReactNode`. With `card`, below 768px
    the table is replaced by `<ul>` of `<li><button>` cards; the same
    `onRowClick`, `loading`, `error` and `empty` states apply. Without `card`,
    the table keeps its `overflow-x-auto` and its first column becomes sticky
    below 768px.
  - `RowCard({ title, status, children }: { title: ReactNode; status?: ReactNode; children: ReactNode })`
    exported from `DataTable.tsx` — the card shell every page fills: a title
    line with the status badge on the right, then 2–3 `<dl>` lines.

- [ ] **Step 1: Write the failing tests**

In `src/admin/components/DataTable.test.tsx`:

```tsx
it('renders rows as cards below 768px and opens one on tap', () => {
  stubMedia(CARD_ROWS)
  const onRowClick = vi.fn()
  render(<DataTable {...props} card={(row) => <RowCard title={row.name}>…</RowCard>} onRowClick={onRowClick} />)
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Chilonzor Arena/ }))
  expect(onRowClick).toHaveBeenCalledWith(rows[0])
})

it('keeps the empty and error states in card mode', () => { … })

// Review Focus 3
it('without a card renderer it stays a table with a sticky first column', () => {
  stubMedia(CARD_ROWS)
  render(<DataTable {...props} />)
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(screen.getAllByRole('cell')[0]).toHaveClass('max-md:sticky')
})
```

In `src/admin/pages/users/UsersPage.cards.test.tsx`: at `stubMedia(CARD_ROWS)`,
the users list shows one card per user carrying the name, the phone and the
status badge, and tapping it navigates to `/foydalanuvchilar/<id>`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/admin/components/DataTable.test.tsx src/admin/pages/users/UsersPage.cards.test.tsx`
Expected: FAIL — `card` is not a prop.

- [ ] **Step 3: Implement `card` and `RowCard` in `DataTable.tsx`**

`const cards = useMediaQuery(CARD_ROWS) && Boolean(card)`. When `cards`, render
`<ul aria-label={label}>` of `<li>` holding a full-width
`<button type="button" onClick={() => onRowClick?.(row)}>` (or a plain `<div>`
when there is no `onRowClick`) with `min-h-11` and the card border from
`CARD`; the selected row keeps `bg-accent-soft`. Loading renders `loadingRows`
skeleton cards, error renders `ErrorState`, empty renders `EmptyState` — the
same components the table body uses. When `card` is absent, add
`max-md:sticky max-md:left-0 max-md:bg-inherit` to the first `<th>`/`<td>` and
`bg-background` to each `<tr>` so the sticky cell inherits a background.

- [ ] **Step 4: Give each list its card**

Pass `card` to the five lists, each showing the 3–4 fields the spec asks for
plus the status badge, using `RowCard`:

| Page | Card title | Lines | Status |
|---|---|---|---|
| Maydonlar | `row.name` | Egasi, Format, Qoʻshilgan | status badge (or ATMOS on the pending tab) |
| Foydalanuvchilar | `user.name` with `Avatar` | Telefon, Rol, Roʻyxatdan oʻtgan | `UserStatusBadge` |
| Bronlar | `formatSlot(startsAt, endsAt)` | Maydon, Mijoz, Toʻlangan / narx | booking status badge |
| Oʻyinlar | `formatSlot(...)` | Maydon, Jamoalar | game status badge |
| Toʻlovlar | `p.userName ?? '—'` | Vaqt, Turi, Summa | payment status badge |

Jurnal is `AuditLogTable`: below 768px render the same entries as an expandable
list — time and `actionLabel` on the first line, `Who` and `ObjectCell` on the
second, the existing `AuditDetails` under the same chevron button, with the
same `aria-expanded`/`aria-controls` wiring.

- [ ] **Step 5: Keep pagination usable**

In `Pagination`, the summary line and the buttons wrap:
`flex flex-wrap items-center gap-2 px-4 py-3`, the range `<p>` gets
`max-md:w-full`, and each square grows to `max-md:size-11` for the 44px touch
target. Below 768px show only the previous/next buttons and the current page
(`max-md:hidden` on the numbered buttons and the gaps, plus a
`md:hidden` "`page + 1` / `totalPages`" label), so eight page buttons never
overflow 360px.

- [ ] **Step 6: Run the tests**

Run: `npm run test`
Expected: PASS, including the five page test files unchanged.

- [ ] **Step 7: Check in Chrome, light and dark**

At 360 and 390: every list page shows cards, a tap opens the right detail or
panel, pagination fits. At 768 and 1280: tables, unchanged at 1280.

- [ ] **Step 8: Commit**

```bash
git add src/admin/components/DataTable.tsx src/admin/components/DataTable.test.tsx src/admin/components/Pagination.tsx src/admin/audit/AuditLogTable.tsx src/admin/pages src/admin/pages/users/UsersPage.cards.test.tsx
git commit -m "feat(admin): show list rows as cards below 768px"
```

---

### Task 5: Filters in a bottom sheet

**Files:**
- Create: `src/admin/components/FilterSheet.tsx`
- Modify: `src/admin/components/FilterBar.tsx`
- Modify: `src/admin/components/navigation.test.tsx`
- Modify: the five pages that use `FilterBar` (stadiums, users, bookings, payments, journal)

**Interfaces:**
- Consumes: `useMediaQuery`, `CARD_ROWS`, `useFocusTrap`, `useScrollLock`.
- Produces:
  - `FilterSheet({ open, onClose, onClear, children }: { open: boolean; onClose: () => void; onClear?: () => void; children: ReactNode })`
    — a bottom sheet, `role="dialog" aria-modal="true" aria-label="Filtrlar"`.
  - `FilterBar` gains `search?: ReactNode` and `activeCount?: number`. At
    ≥ 768px it renders `search` then `children` then "Tozalash" — the same row
    as today. Below 768px it renders `search` full width and a
    `<button>Filtrlar</button>` carrying `activeCount` as a badge, which opens
    the sheet with `children` and "Tozalash" inside.

- [ ] **Step 1: Write the failing tests** in `src/admin/components/navigation.test.tsx`

```tsx
it('collapses the filters into a sheet below 768px, keeping the search visible', () => {
  stubMedia(CARD_ROWS)
  render(<FilterBar search={<SearchField … />} activeCount={2} onClear={onClear}>{selects}</FilterBar>)
  expect(screen.getByRole('searchbox', { name: 'Ism boʻyicha qidirish' })).toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: 'Holat' })).not.toBeInTheDocument()
  const button = screen.getByRole('button', { name: 'Filtrlar' })
  expect(button).toHaveTextContent('2')
  fireEvent.click(button)
  const sheet = screen.getByRole('dialog', { name: 'Filtrlar' })
  expect(within(sheet).getByRole('combobox', { name: 'Holat' })).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Filtrlar' })).not.toBeInTheDocument()
})

// Review Focus 5
it('Esc closes only the filter sheet, leaving an open side panel behind', () => {
  stubMedia(CARD_ROWS)
  // BookingsPage at /bronlar?bron=b1, sheet opened on top
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Filtrlar' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: /Bron/ })).toBeInTheDocument()
})
```

The second test belongs in `src/admin/pages/bookings/BookingsPage.test.tsx`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/admin/components/navigation.test.tsx`
Expected: FAIL — no "Filtrlar" button.

- [ ] **Step 3: Implement `FilterSheet`**

`createPortal` into `document.body`; backdrop `bg-overlay`; panel pinned to the
bottom, `rounded-t-xl border-t border-border bg-background p-4`,
`max-h-[80dvh] overflow-y-auto`, with a title row ("Filtrlar" + a close
button) and the children stacked full width. Esc and the backdrop close.
Uses `useFocusTrap` and `useScrollLock`. It must stop its `keydown` handler
from reaching an underlying overlay: register on the panel element, not on
`document`, or call `event.stopPropagation()` before closing.

- [ ] **Step 4: Rework `FilterBar` and update the five pages**

Move each page's `SearchField` from `children` to the `search` prop and pass
`activeCount` — the number of set filters the page already computes for
`filtered` (count them instead of OR-ing them). The `DisabledHint` "Tez orada"
placeholders stay in `children` and so appear inside the sheet.

- [ ] **Step 5: Run the tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Check in Chrome, light and dark**

At 360 and 390 on all five pages: the search field is full width, "Filtrlar"
shows the active count, the sheet opens over the page, Tozalash clears, Esc and
the backdrop close it. At 768 and 1280 the filter row is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/admin/components/FilterSheet.tsx src/admin/components/FilterBar.tsx src/admin/components/navigation.test.tsx src/admin/pages
git commit -m "feat(admin): collapse filters into a bottom sheet below 768px"
```

---

### Task 6: Overlays — full-screen panels, sheet modals, touch targets

**Files:**
- Modify: `src/admin/components/SidePanel.tsx`
- Modify: `src/admin/components/Modal.tsx`
- Modify: `src/admin/components/Button.tsx`
- Modify: `src/admin/components/FilterBar.tsx` (search input font)
- Modify: `src/admin/components/DateRangePicker.tsx`
- Modify: `src/admin/components/NumberField.tsx`
- Modify: `src/admin/components/overlays.test.tsx`
- Modify: `src/admin/pages/bookings/panels.tsx`, `src/admin/pages/payments/PaymentPanel.tsx`

**Interfaces:**
- Consumes: Task 2's `useScrollLock`.
- Produces: `SidePanel` gains `actions?: ReactNode` — rendered in a bar that is
  sticky at the bottom of the panel, `border-t border-border bg-background
  px-6 py-3`, and omitted entirely when not given.

- [ ] **Step 1: Write the failing test** in `src/admin/components/overlays.test.tsx`

```tsx
it('fills the screen on phones and keeps its actions in a bottom bar', () => {
  stubMedia(CARD_ROWS)
  render(<SidePanel open title="Bron" onClose={onClose} actions={<Button>Bekor qilish</Button>}>…</SidePanel>)
  const panel = screen.getByRole('dialog', { name: 'Bron' })
  expect(panel).toHaveClass('max-md:w-full')
  expect(within(panel).getByRole('button', { name: 'Bekor qilish' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/admin/components/overlays.test.tsx`
Expected: FAIL — `actions` is not a prop.

- [ ] **Step 3: `SidePanel` full-screen on phones**

Panel classes become `h-full w-120 max-w-full max-md:w-full max-md:border-l-0`;
the header's close button grows to `size-11` below 768px and gains a visible
`<ChevronLeft>` back affordance (`aria-label` stays "Yopish"). Add the optional
`actions` bar and `useScrollLock(open)`.

- [ ] **Step 4: `Modal` as a full-width sheet on phones**

The overlay becomes `items-end md:items-center` and `p-0 md:p-4`; the dialog
`w-110 max-w-full max-md:w-full max-md:rounded-b-none max-md:rounded-t-2xl
max-md:max-h-[90dvh] max-md:overflow-y-auto`. The footer stacks:
`flex flex-col-reverse gap-2.5 md:flex-row md:justify-end`, each `Button`
`max-md:w-full`.

- [ ] **Step 5: 16px inputs and 44px touch targets**

Every text input, `<select>` and `<textarea>` the admin can type into needs a
**16px** computed size, or iOS Safari zooms the page on focus. The admin type
scale's `base` is 14px, so add one entry to the `@theme` block in
`src/shared/theme/index.css` — `--text-field: 16px;` with the comment
`/* 16px: the minimum that stops iOS zooming a focused input */` — and use
`max-md:text-field` on:
`FilterBar`'s `SearchField` input, `StadiumFilter`'s search input,
`DateRangePicker`'s two date inputs, `ReasonModal`'s textarea, `NumberField`'s
input and `LoginPage`'s two fields. `Button` gains `max-md:h-11`; icon-only
buttons in `SidePanel`, `Modal`, `AuditLogTable` and `Pagination` get
`max-md:size-11`. Confirm the 11px/12px type is untouched — only inputs change.

- [ ] **Step 6: Move the panels' decision buttons into `actions`**

`BookingPanel`'s "Belgini bekor qilish" and `PaymentPanel`'s "Qayta urinish" /
"Qoʻlda qaytarildi" move to the `actions` prop so they stay reachable at phone
height. Their `ConfirmModal`/`ReasonModal` stay where they are.

- [ ] **Step 7: Run the tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 8: Check in Chrome, light and dark**

At 360 and 390: a booking panel, a payment panel and a game panel fill the
screen with a visible close; a confirm modal and a reason modal are bottom
sheets with full-width buttons; tapping a text field does not zoom (DevTools
device toolbar, iPhone profile); every control measures ≥ 44px. At 1280 all
three are unchanged.

- [ ] **Step 9: Commit**

```bash
git add src/admin/components src/admin/pages/bookings/panels.tsx src/admin/pages/payments/PaymentPanel.tsx src/shared/theme/index.css
git commit -m "feat(admin): full-screen side panels, sheet modals and 44px touch targets on phones"
```

---

### Task 7: Detail and settings pages

**Files:**
- Modify: `src/admin/layout/TopBar.tsx`
- Create: `src/admin/components/StickyActions.tsx`
- Modify: `src/admin/pages/stadiums/StadiumPage.tsx`
- Modify: `src/admin/pages/users/UserPage.tsx`
- Modify: `src/admin/pages/settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: Task 2's layout (the page header is hidden below `lg`).
- Produces:
  - `StickyActions({ children }: { children: ReactNode })` — a plain stack at
    ≥ 768px; below it, `fixed inset-x-0 bottom-0 z-30` with
    `border-t border-border bg-background px-4 py-3` and the buttons full
    width.
  - `TopBar` gains `back?: string` — when set, a `<Link to={back}>` with
    `aria-label="Orqaga"` and a `<ChevronLeft>` sits between the ☰ button and
    the title. The ☰ button stays on every page, so the menu is always one tap
    away.

- [ ] **Step 1: Back link on detail pages**

`AdminLayout` already resolves the active route's `crumbs`; pass the `to` of
the last crumb that has one as `TopBar`'s `back`. On a detail page the phone
user then gets one tap back to its list; on a top-level page `back` is
undefined and the ☰ button stays. `PageHeader` is untouched, so the desktop
header keeps today's markup exactly.

- [ ] **Step 2: Stack the detail pages**

`StadiumPage`'s and `UserPage`'s root become
`flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6`; the `<aside>` keeps
`lg:sticky lg:top-6 lg:w-94` and loses `shrink-0` below `lg`, where it is full
width and `order-first` so the decision comes before the long history.
`InfoSection`'s and `TermsSection`'s `xl:grid-cols-*` stay as they are.
`DetailSkeleton` mirrors the same stacking.

- [ ] **Step 3: Sticky decision bar**

Wrap `DecisionPanel`'s and `BlockPanel`'s action buttons (`Tasdiqlash`,
`Rad etish`, `Bloklash`, `Blokdan chiqarish`) in `StickyActions`, and add
`max-md:pb-20` to each page's root so the bar never covers the last card. The
explanatory text and the `DisabledHint` warning stay in the card.

- [ ] **Step 4: Settings page**

`max-w-200` keeps its desktop width; add `w-full` and change the field rows
that sit side by side to `flex flex-col gap-2 md:flex-row md:items-center`.
`NumberField`'s `w-55` becomes `w-full md:w-55`.

- [ ] **Step 5: Run the tests**

Run: `npm run test`
Expected: PASS, including `SettingsPage.test.tsx`, `StadiumsPage.test.tsx` and
`UsersPage.test.tsx` unchanged.

- [ ] **Step 6: Check in Chrome, light and dark**

At 360 and 390: a stadium detail and a user detail stack with the decision
first, the decision buttons sit in a bar at the bottom of the screen and
nothing is hidden under it; the back link returns to the list. At 1280 both are
unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/admin/components/PageHeader.tsx src/admin/components/StickyActions.tsx src/admin/pages/stadiums/StadiumPage.tsx src/admin/pages/users/UserPage.tsx src/admin/pages/settings/SettingsPage.tsx
git commit -m "feat(admin): stack the detail pages and pin their decision buttons on phones"
```

---

### Task 8: Money and long text

**Files:**
- Create: `src/admin/components/Som.tsx`
- Create: `src/admin/components/Som.test.tsx`
- Modify: every admin JSX site that renders `formatSom(...)` or `money(...)` as
  visible text (49 sites across `pages/`, `audit/` and `components/`)

**Interfaces:**
- Consumes: `formatSom` from `src/shared/format`.
- Produces: `Som({ tiyin }: { tiyin: number })` — `formatSom(tiyin)` inside
  `<span className="whitespace-nowrap">`. Sites that need the raw string
  (a `title` attribute, a modal's message template) keep calling `formatSom`.

- [ ] **Step 1: Write the failing tests** in `src/admin/components/Som.test.tsx`

```tsx
it('shows the amount and never breaks it across lines', () => {
  render(<Som tiyin={15_500_000} />)
  const span = screen.getByText("155 000 so'm")
  expect(span).toHaveClass('whitespace-nowrap')
})

// Review Focus 4
it('a long name truncates inside a card instead of widening it', () => {
  stubMedia(CARD_ROWS)
  // UsersPage with a 60-character name
  expect(screen.getByText(longName)).toHaveClass('truncate')
})
```

The second test belongs in `src/admin/pages/users/UsersPage.cards.test.tsx`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/admin/components/Som.test.tsx`
Expected: FAIL — no `Som`.

- [ ] **Step 3: Implement `Som` and sweep the call sites**

Replace `{formatSom(x)}` with `<Som tiyin={x} />` wherever the result is
rendered as a child. Leave `formatSom` in `title=`, in template literals and in
`formatSomParts` callers (`KpiCard`, the payments summary, `wholeSom`), adding
`whitespace-nowrap` to the amount span in those three places instead.

- [ ] **Step 4: Long names and ids**

Give the card title, the table `Maydon`/`Mijoz`/`Toʻlovchi` cells and the
`PanelRow` value `min-w-0` with `truncate` (single-line fields) or
`break-words` (free text: addresses, reasons, descriptions). The transaction id
already uses `shortTxn`.

- [ ] **Step 5: Run the tests**

Run: `npm run test`
Expected: PASS — the page tests query by text, which `Som` does not change.

- [ ] **Step 6: Check in Chrome, light and dark**

At 360: no money figure wraps on Bosh sahifa, Bronlar, Toʻlovlar, a booking
panel, a payment panel or a stadium detail; a 60-character stadium name
truncates; the page still does not scroll sideways.

- [ ] **Step 7: Commit**

```bash
git add src/admin
git commit -m "feat(admin): keep money on one line and truncate long names"
```

---

### Task 9: Full sweep

**Files:**
- Modify: whatever the sweep finds
- Modify: `CLAUDE.md` (a short "Responsive" paragraph under "Admin components")

- [ ] **Step 1: Run every check**

Run: `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build`
Expected: PASS.

- [ ] **Step 2: Chrome sweep**

`npm run dev`, then for each of `/`, `/maydonlar`, a stadium detail,
`/foydalanuvchilar`, a user detail, `/bronlar` (both tabs, a panel open),
`/tolovlar` (all three tabs, a panel open), `/jurnal`, `/sozlamalar` and
`/login`: check 360×800, 390×844, 768×1024 and 1280×800 in light **and** dark.
At each stop confirm no horizontal scroll
(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`),
no clipped text, no control under 44px, and that 1280×800 matches `main`.

- [ ] **Step 3: Document the breakpoints in `CLAUDE.md`**

Under "Admin components", add: the three breakpoints and what each switches,
that `useMediaQuery` decides what renders while `max-*` variants decide what it
looks like, and that nothing may change at ≥ 1280px.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(admin): record the responsive breakpoints; fixes from the full sweep"
```
