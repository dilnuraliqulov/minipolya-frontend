# Admin detail views responsive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every admin detail view one readable column below 1024px without
changing the desktop layout, and add a headless Playwright check that fails if
any admin page overflows its viewport.

**Architecture:** One new component, `DetailLayout`, owns the whole layout
change: it takes an ordered list of blocks, each tagged `column: 'main' |
'aside'`, renders them as today's two-column flex row at ≥ 1024px and as a
single column in array order below it, choosing the branch with
`useMediaQuery(COMPACT_NAV)`. The two detail pages become callers. Four small
overflow fixes and one shared formatting fix follow, then a Playwright project
that stubs every API call with deliberately hostile fixtures and measures each
route at three viewports in both themes.

**Tech Stack:** React 19, react-router 8, Tailwind CSS 4, TanStack Query 5,
Vitest + Testing Library (jsdom), Playwright (Chromium only).

**Spec:** `docs/superpowers/specs/2026-11-15-admin-detail-responsive-design.md`

## Global Constraints

- Nothing changes at ≥ 1280px — visual, DOM order or focus order. Every new
  rule is a `max-*` variant or a default an `lg:`/`xl:` rule restores.
- Breakpoints: Tailwind's `md` 768, `lg` 1024, `xl` 1280. The layout switch is
  `COMPACT_NAV` = `'(max-width: 1023px)'` from
  `src/admin/components/useMediaQuery.ts`.
- Design tokens only — no hex, no `bg-white`, no Tailwind palette colours.
  Light and dark both checked.
- Admin text is Uzbek Latin with `ʻ` (U+02BB) in oʻ/gʻ and `ʼ` (U+02BC) for the
  tutuq belgisi. No translation layer in the admin panel.
- Use `src/admin/components/`; do not restyle per page.
- Touch targets ≥ 44px; inputs ≥ 16px font.
- Real data only: no new endpoint, field or sample value. `MISSING_ENDPOINTS`
  stays empty.
- `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` must
  pass before each commit.
- Commit on the current branch (`fix/admin-dashboard`) only. No branches, no
  pushes, no PRs. No attribution lines in commit messages.

## Review Focus

1. **Money pasted into a number field.** After Task 5 the page shows
   `12 345 000` with U+00A0, so an admin who copies a figure and pastes it into
   a price filter feeds `somInputToTiyin` a string with NBSPs; its regex is
   `^(\d*)(?:\.(\d{0,2}))?$` and it throws. It must strip spaces and NBSPs
   first. *(Task 5, Step 1)*
2. **The viewport crosses 1024px while a modal is open.** `DetailLayout`
   switches branches, remounting the blocks under a different parent, so a
   `ReasonModal` opened from `BlockPanel` unmounts mid-flow and focus is lost
   to `document.body`. The switch must still render the right order and must
   not throw. *(Task 1, Step 5)*
3. **The overflow walk meets a zero-size or hidden element.**
   `getBoundingClientRect()` on a `display: none` node is all zeros, so a naive
   `right > parent.right` comparison reports false positives and the check
   becomes noise nobody trusts. Elements with no box are skipped. *(Task 6,
   Step 3)*
4. **`window.matchMedia` is absent** (jsdom, old browsers). `useMediaQuery`
   answers `false`, so `DetailLayout` must render the desktop branch and never
   throw. *(Task 1, Step 1)*
5. **A 36-character UUID or a 40-character stadium name at 360px.** A booking
   id in `AuditDetails` or a long name in `SummaryCard` must wrap or truncate
   inside its card and must not widen the page. *(Task 6, Step 6 fixtures)*

---

### Task 1: `DetailLayout`

**Files:**
- Create: `src/admin/components/DetailLayout.tsx`
- Create: `src/admin/components/DetailLayout.test.tsx`

**Interfaces:**
- Consumes: `useMediaQuery`, `COMPACT_NAV` from
  `src/admin/components/useMediaQuery.ts`; `stubMedia` from
  `src/admin/test-utils.tsx`.
- Produces:
  ```ts
  export interface DetailBlock {
    key: string
    node: ReactNode
    column: 'main' | 'aside'
  }
  export function DetailLayout(props: {
    blocks: DetailBlock[]
    asideLabel: string
    /** Tailwind gap step for the main column: 4 or 6. Default 6. */
    mainGap?: 4 | 6
    /** The stadium page's scrolling aside, at `lg` only. */
    asideMaxHeight?: boolean
  }): ReactElement
  ```

Array order is the phone order. `column` picks the desktop column, keeping
array order within each column.

- [ ] **Step 1: Write the failing tests** in `src/admin/components/DetailLayout.test.tsx`

```tsx
const blocks: DetailBlock[] = [
  { key: 'summary', column: 'aside', node: <p>Maʼlumotlar</p> },
  { key: 'decision', column: 'aside', node: <p>Qaror</p> },
  { key: 'tabs', column: 'main', node: <p>Tablar</p> },
  { key: 'history', column: 'main', node: <p>Tarix</p> },
]

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
```

`texts()` is a local helper reading every `<p>`'s text content in document
order.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/admin/components/DetailLayout.test.tsx`
Expected: FAIL — `DetailLayout` is not exported.

- [ ] **Step 3: Implement `DetailLayout` in `src/admin/components/DetailLayout.tsx`**

Desktop branch: `<div className="flex items-start gap-6">` holding
`<div className="flex min-w-0 flex-1 flex-col gap-{mainGap}">` with the `main`
blocks, then `<aside aria-label={asideLabel} className="sticky top-6 flex w-94
shrink-0 flex-col gap-4">` with the `aside` blocks, adding
`max-h-[calc(100dvh-3rem)] overflow-y-auto` when `asideMaxHeight`.
Compact branch: one `<div className="flex flex-col gap-4">` with every block in
array order, no `<aside>`, no `sticky`. Both branches wrap each block in a
`<Fragment key={block.key}>`.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/admin/components/DetailLayout.test.tsx`
Expected: PASS

- [ ] **Step 5: Write the breakpoint-crossing test** (Review Focus 2)

```tsx
it('reorders without throwing when the viewport crosses 1024px', () => {
  const flip = stubMedia()
  const withButton: DetailBlock[] = [
    { key: 'decision', column: 'aside', node: <button>Bloklash</button> },
    ...blocks.filter((b) => b.key !== 'decision'),
  ]
  render(<DetailLayout blocks={withButton} asideLabel="Foydalanuvchi" />)
  screen.getByRole('button', { name: 'Bloklash' }).focus()
  expect(document.activeElement).toHaveAccessibleName('Bloklash')

  act(() => flip(COMPACT_NAV))

  // The remount is accepted (see the spec's Approaches): what must hold is
  // that the order is right, the button is still there, and focus fell back
  // to the document rather than to a detached node.
  expect(texts()).toEqual(['Maʼlumotlar', 'Qaror', 'Tablar', 'Tarix'])
  expect(screen.getByRole('button', { name: 'Bloklash' })).toBeInTheDocument()
  expect(document.activeElement).toBe(document.body)
})
```

`texts()` reads the `<p>`s, so the button block contributes nothing to it —
keep `Qaror` as a `<p>` sibling inside that block's node.

- [ ] **Step 6: Run the checks and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS, every existing test unchanged (jsdom has no `matchMedia`, so
they all take the desktop branch).

```bash
git add src/admin/components/DetailLayout.tsx src/admin/components/DetailLayout.test.tsx
git commit -m "feat(admin): add DetailLayout for one-column detail views on phones"
```

---

### Task 2: The user detail page

**Files:**
- Modify: `src/admin/pages/users/UserPage.tsx:450-475`

**Interfaces:**
- Consumes: `DetailLayout`, `DetailBlock` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Replace the flex row with `DetailLayout`**

In `UserPage`, blocks in this order, `mainGap={6}`, `asideLabel="Foydalanuvchi"`:
`summary` (aside, `<SummaryCard user={data} />`), `decision` (aside,
`<BlockPanel user={data} own={own} />`), `tabs` (main, `<UserTabs user={data}
/>`), `history` (main, `<UserHistory userId={data.id} />`).

- [ ] **Step 2: Fix the loading skeleton** at `UserPage.tsx:455`

`flex gap-6` → `flex flex-col gap-4 lg:flex-row lg:gap-6`, and the aside
skeleton `h-80 w-94` → `h-80 w-full lg:w-94 lg:shrink-0`.

- [ ] **Step 3: Run the checks**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS — the existing admin tests render the desktop branch and see the
same DOM as before.

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/users/UserPage.tsx
git commit -m "fix(admin): one-column user detail page below 1024px"
```

---

### Task 3: The stadium detail page

**Files:**
- Modify: `src/admin/pages/stadiums/StadiumPage.tsx:823-885`

**Interfaces:**
- Consumes: `DetailLayout`, `DetailBlock` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Replace the flex row with `DetailLayout`**

Blocks in this order, `mainGap={4}`, `asideLabel="Qaror va egasi"`,
`asideMaxHeight`: `info` (main, `<InfoSection stadium={data} extras={extras}
/>`), `decision` (aside, `<DecisionPanel stadium={data} />`), `owner` (aside,
`<OwnerCard stadium={data} />`), `notes` (aside, `<NotesCard stadiumId={data.id}
/>`), `terms` (main, `<TermsSection stadium={data} extras={extras} />`),
`history` (main, `<StadiumHistory stadiumId={data.id} />`).

Desktop columns are therefore unchanged: main = Maʼlumotlar, Bron shartlari,
Tarix; aside = Qaror, Egasi, Ichki izohlar.

- [ ] **Step 2: Fix `DetailSkeleton`** at `StadiumPage.tsx:823`

`flex gap-6` → `flex flex-col gap-4 lg:flex-row lg:gap-6`, and the aside column
`flex w-94 flex-col gap-4` → `flex w-full flex-col gap-4 lg:w-94 lg:shrink-0`.

- [ ] **Step 3: Run the checks**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/admin/pages/stadiums/StadiumPage.tsx
git commit -m "fix(admin): one-column stadium detail page below 1024px"
```

---

### Task 4: The four narrow-width overflow fixes

**Files:**
- Modify: `src/admin/audit/AuditLogTable.tsx:62-70` (`Detail`)
- Modify: `src/admin/components/SidePanel.tsx:118-126` (`PanelRow`)
- Modify: `src/admin/audit/StatusTimeline.tsx:33`
- Modify: `src/admin/pages/settings/SettingsPage.tsx:403-421`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing new.

- [ ] **Step 1: `Detail` in `AuditLogTable.tsx`** — label above value on phones

Outer `flex gap-2` → `flex flex-col gap-0.5 md:flex-row md:gap-2`; the `dt`'s
`w-44 shrink-0` → `md:w-44 md:shrink-0`.

- [ ] **Step 2: `PanelRow` in `SidePanel.tsx`** — the same treatment

Outer `flex items-start gap-3` → `flex flex-col gap-0.5 md:flex-row
md:items-start md:gap-3`; the `dt`'s `w-40 shrink-0` → `md:w-40 md:shrink-0`.

- [ ] **Step 3: `StatusTimeline.tsx:33`** — the text column may not push the row

`flex flex-col gap-0.5` → `flex min-w-0 flex-col gap-0.5`, and the reason line
gets `break-words`.

- [ ] **Step 4: The settings dirty bar** at `SettingsPage.tsx:403`

`flex items-center gap-3 … px-6 py-4` → `flex flex-wrap items-center gap-3 …
px-4 py-4 md:px-6`; give the text `min-w-0 flex-1 basis-full md:basis-auto` so
it takes its own line on a phone, and wrap the two buttons in a
`flex flex-1 gap-3 md:flex-none` with `className="flex-1 md:flex-none"` on each
`Button`, so they are full width side by side below `md`.

- [ ] **Step 5: Run the checks**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS — all four are `max-*`/`md:` variants, so the desktop DOM and
computed desktop styles are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/admin/audit/AuditLogTable.tsx src/admin/components/SidePanel.tsx src/admin/audit/StatusTimeline.tsx src/admin/pages/settings/SettingsPage.tsx
git commit -m "fix(admin): stop label rows, timelines and the settings bar overflowing at 360px"
```

---

### Task 5: Money never splits mid-number

**Files:**
- Modify: `src/shared/format/number.ts:7`
- Modify: `src/shared/format/money.ts:66-77` (`somInputToTiyin`)
- Modify: `src/shared/format/number.test.ts`, `src/shared/format/money.test.ts`,
  `src/admin/audit/labels.test.ts`, `src/miniapp/format.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export const GROUP_SEPARATOR = ' '` from
  `src/shared/format/number.ts`, so tests and any future caller name it
  instead of pasting an invisible character.

- [ ] **Step 1: Write the failing tests** (Review Focus 1 first)

In `src/shared/format/money.test.ts`:

```ts
it('accepts a grouped amount pasted from the page', () => {
  expect(somInputToTiyin('12 345 000')).toBe(1_234_500_000)
  expect(somInputToTiyin('12 345 000')).toBe(1_234_500_000)
})
```

In `src/shared/format/number.test.ts`:

```ts
it('groups with a non-breaking space so a number never splits', () => {
  expect(formatNumber(1234567)).toBe(`1${GROUP_SEPARATOR}234${GROUP_SEPARATOR}567`)
  expect(formatNumber(1234567)).not.toContain(' ')
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/shared/format`
Expected: FAIL — `somInputToTiyin` throws a `TypeError` on the grouped input,
and `formatNumber` still returns U+0020.

- [ ] **Step 3: Implement both changes**

`number.ts`: export `GROUP_SEPARATOR` and use it as the `replace` replacement.
`money.ts`: in `somInputToTiyin`, strip every `\s` (which matches U+00A0) from
`text` before the regex test, and keep the error message quoting the original
text.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/shared/format`
Expected: PASS

- [ ] **Step 5: Update the 12 strict-equality assertions**

Only `.toBe()` comparisons are affected; Testing Library's default normalizer
collapses `\s+`, which matches U+00A0, so every `getByText` /
`toHaveTextContent` assertion keeps passing. Replace the plain space with
`GROUP_SEPARATOR` (or a literal ` `) in: `shared/format/number.test.ts`
(3), `shared/format/money.test.ts` (5), `admin/audit/labels.test.ts` (2),
`miniapp/format.test.ts` (2). Leave `cardInput.test.ts`, `phone.test.ts` and
the `search`-parameter assertions alone — they do not go through
`formatNumber`.

- [ ] **Step 6: Run the checks and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: PASS, whole suite.

```bash
git add src/shared/format src/admin/audit/labels.test.ts src/miniapp/format.test.ts
git commit -m "fix(format): group numbers with a non-breaking space so money never splits"
```

---

### Task 6: The Playwright overflow check

**Files:**
- Create: `playwright.config.ts`, `tsconfig.e2e.json`
- Create: `e2e/fixtures/data.ts`, `e2e/fixtures/routes.ts`, `e2e/overflow.ts`,
  `e2e/responsive.spec.ts`
- Modify: `package.json`, `tsconfig.json`, `vite.config.ts`, `Dockerfile`,
  `CLAUDE.md`

**Interfaces:**
- Consumes: the running app; nothing from earlier tasks.
- Produces:
  ```ts
  // e2e/fixtures/routes.ts
  export async function installFixtures(page: Page, opts?: { empty?: boolean }): Promise<void>
  export async function signIn(page: Page, theme: 'light' | 'dark'): Promise<void>
  // e2e/overflow.ts
  export async function expectNoOverflow(page: Page, label: string): Promise<void>
  ```

- [ ] **Step 1: Install Playwright, Chromium only**

```bash
npm install -D playwright @playwright/test
npx playwright install chromium
```

Add to `package.json` scripts: `"e2e": "playwright test"`,
`"e2e:ui": "playwright test --ui"`.

- [ ] **Step 2: Wire the configs so the four existing commands are unaffected**

- `vite.config.ts`: add `include: ['src/**/*.test.{ts,tsx}']` to `test`, so
  Vitest stops matching `e2e/responsive.spec.ts` by its `.spec.ts` name.
- `tsconfig.e2e.json`: `include: ["e2e", "playwright.config.ts"]`,
  `types: ["node"]`, same strict flags as `tsconfig.node.json`.
- `tsconfig.json`: add `{ "path": "./tsconfig.e2e.json" }` to `references`.
- `Dockerfile`: `ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` before its `npm ci`.
- `playwright.config.ts`: `testDir: 'e2e'`, headless, `webServer` running
  `npm run dev` on `http://localhost:5173` with `reuseExistingServer: true`,
  and six projects — 360×800, 390×844, 1024×800, each in `light` and `dark`,
  passing the theme through `use.colorScheme` plus a project-level
  `metadata.theme` the spec reads.

- [ ] **Step 3: Write `expectNoOverflow` in `e2e/overflow.ts`**

Two assertions, both reported with `label` so a failure names the page:

1. `document.documentElement.scrollWidth > window.innerWidth` → fail with both
   numbers in the message.
2. Every element under `main`, `[role="dialog"]` and `header` whose
   `getBoundingClientRect()` has a non-zero width and height: fail if its
   `right` exceeds its `parentElement`'s `right`, or its `left` is less than
   its parent's `left`, by more than 1px. **Skip elements with no box**
   (`width === 0 && height === 0`) — Review Focus 3 — and skip any ancestor
   chain crossing an element whose computed `overflow-x` is `auto` or
   `scroll`, since `DataTable` and `AuditLogTable` scroll sideways on purpose.
   Report up to five offenders as `tagName.className`.

- [ ] **Step 4: Write the failing spec** in `e2e/responsive.spec.ts`

One `test` per route, each calling `installFixtures`, `signIn` and
`expectNoOverflow`, plus the interaction tests:

```ts
const ROUTES = [
  ['/admin/login', 'Kirish'],
  ['/admin/', 'Bosh sahifa'],
  ['/admin/maydonlar', 'Maydonlar'],
  ['/admin/maydonlar/' + STADIUM_ID, 'Maʼlumotlar'],
  ['/admin/foydalanuvchilar', 'Foydalanuvchilar'],
  ['/admin/foydalanuvchilar/' + USER_ID, 'Maʼlumotlar'],
  ['/admin/bronlar', 'Bronlar'],
  ['/admin/bronlar?bron=' + BOOKING_ID, 'BRON MAʼLUMOTLARI'],
  ['/admin/bronlar?tab=oyinlar', 'Oʻyinlar'],
  ['/admin/bronlar?oyin=' + GAME_ID, 'Oʻyin'],
  ['/admin/tolovlar', 'Toʻlovlar'],
  ['/admin/tolovlar?tolov=' + PAYMENT_ID, 'Toʻlov'],
  ['/admin/jurnal', 'Jurnal'],
  ['/admin/sozlamalar', 'Sozlamalar'],
] as const
```

Each test waits for its expected text before measuring — a page that did not
render is a failure, not a pass. The theme comes from
`test.info().project.metadata.theme` and is passed to `signIn`. Then the five
interaction tests from the spec:
expand one audit row (user detail, stadium detail, Jurnal), each user tab
(Bronlar / Jamoalar / Maydonlar), one dirtied settings field, the Bloklash
reason modal, the stadium reject modal — each followed by `expectNoOverflow`.
Finally one test per list page with `installFixtures(page, { empty: true })`.

- [ ] **Step 5: Run it to verify it fails**

Run: `npm run e2e`
Expected: FAIL — `installFixtures` does not exist yet.

- [ ] **Step 6: Write the fixtures**

`e2e/fixtures/data.ts` — the records, stressed on purpose per the spec: long
Uzbek and Russian names ("Abdurahmonov Shohruhmirzo Bahodirovich",
"Владислав Константинопольский"), a 40-character stadium name and a long
address, amounts at `1_234_500_000` tiyin (12 345 000 soʻm), a full page of
rows per list (`size` 10 or 20 to match each page), a 500-character block
reason, audit entries with long reasons and 36-character UUIDs in their
changed values. The fixture stadium **has** `latitude`/`longitude`, so
`StadiumMap` is measured.

`e2e/fixtures/routes.ts` — `installFixtures` fulfils all 31 endpoint/method
pairs listed in the spec's §4 with `{ success: true, data, message: null }`,
plus `/api/uploads/**` with a real 1×1 PNG buffer and an `abort()` on
`**/tile.openstreetmap.org/**`. `opts.empty` returns empty pages
(`content: []`, `totalElements: 0`) from every list endpoint. `signIn` uses
`addInitScript` to set `localStorage['minipolya-admin-token']` to a token whose
payload carries `isAdmin: true` and an expiry far in the future, and
`localStorage['minipolya-admin-theme']` to the project's theme, which
`initAdminTheme()` reads before the first render.

- [ ] **Step 7: Run it and fix what it finds**

Run: `npm run e2e`
Expected: every test passes. Anything it reports is a real overflow — fix it
with a `max-*`/`md:`/`lg:` variant in the offending component, re-run, and
repeat until clean. Record what was fixed for the handover.

- [ ] **Step 8: Document it in CLAUDE.md**

Add to the Commands block:

```bash
npm run e2e           # Playwright: every admin route at 360/390/1024, light + dark
npm run e2e:ui        # the same, in Playwright's inspector
```

with a line under it: the check stubs the API, so it needs no backend, and it
must be run after any change to the admin layout. Note that it is deliberately
not part of the pre-commit gate.

- [ ] **Step 9: Run every check and commit**

Run: `npm run typecheck && npm run lint && npm run test && npm run build && npm run e2e`
Expected: PASS

```bash
git add playwright.config.ts tsconfig.e2e.json tsconfig.json vite.config.ts package.json package-lock.json Dockerfile CLAUDE.md e2e
git commit -m "test(admin): add a headless Playwright check for viewport overflow"
```

---

### Task 7: Verify in Chrome and close the predecessor spec

**Files:**
- Modify: `docs/superpowers/specs/2026-11-14-admin-responsive-design.md`

- [ ] **Step 1: Check the fixed pages in Chrome**

At 360×800, 390×844, 768×1024 and 1280×800, light and dark: both detail pages,
the three side panels, Sozlamalar and Jurnal. Confirm no sideways scroll,
nothing overlapping, nothing cut off.

- [ ] **Step 2: Confirm the desktop is untouched**

At 1280×800, compare both detail pages against `git stash`-ed `main`: the two
columns, their order and their widths must be identical.

- [ ] **Step 3: Note the superseded requirement**

In `2026-11-14-admin-responsive-design.md`, mark "decision buttons in a sticky
bottom bar" as superseded by the 2026-11-15 spec, which puts Qaror second in
the phone order instead.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-11-14-admin-responsive-design.md
git commit -m "docs: note the sticky action bar superseded by the detail-view order"
```
