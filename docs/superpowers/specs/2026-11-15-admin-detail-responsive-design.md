# Admin detail views — responsive design spec

Make every **detail view** in the admin panel (`src/admin`) usable on a phone,
and add an automated check that keeps it that way. The desktop layout at
≥ 1280px does not change. Follow CLAUDE.md; commit per fix with
`typecheck`, `lint`, `test` and `build` passing.

Follows `2026-11-14-admin-responsive-design.md`, which made the shell, the
list tables, the filters and the modals responsive but never touched the
detail pages. **It supersedes that spec's "decision buttons in a sticky bottom
bar"** — see §3.

## Intent and the why

The panel was reported broken on a real phone at ~360px: on
`/admin/foydalanuvchilar/:id` the "Tarix" section sits in a column pushed off
the left edge, the "Maʼlumotlar" and "Qaror" cards overlap it, and the page
scrolls sideways. An admin who gets a complaint about a user is away from a
desk as often as not, and blocking a user is the one action that cannot wait
for a laptop. The page has to work at 360px.

The cause is narrow and the same on both detail pages — a desktop-only flex
row with a fixed-width aside, with no breakpoint at all:

- `src/admin/pages/users/UserPage.tsx:464` — `flex items-start gap-6` with
  `aside … sticky top-6 w-94 shrink-0`
- `src/admin/pages/stadiums/StadiumPage.tsx:869` — the same, plus
  `max-h-[calc(100dvh-3rem)] overflow-y-auto`

`w-94` is 376px and `shrink-0`, so at 360px the aside on its own is wider than
the viewport: the page scrolls sideways and the `min-w-0 flex-1` main column
collapses to almost nothing. Both pages' loading skeletons
(`UserPage.tsx:455`, `StadiumPage.tsx:825`) carry the identical bug.

## Goals

- Below 1024px every detail view is one column, nothing overlaps, nothing is
  cut off, and no admin page scrolls sideways at 360px.
- The order below 1024px is: top bar (name / back), **Maʼlumotlar**, **Qaror**,
  the tabs, **Tarix** last.
- One automated, headless regression check covering every admin route and
  detail view at 360×800, 390×844 and 1024×800, light and dark.

## Non-goals

- Any change to what the panel shows at ≥ 1280px — visual, DOM order or focus
  order. Point 4 of the request: desktop unchanged.
- The Mini App's own screens. `src/shared/format/number.ts` is the one shared
  file this touches, deliberately — see §3.
- New endpoints, fields, statuses or business rules. `MISSING_ENDPOINTS` is
  empty (backend `00d3bb7`); nothing here adds to it.
- Redesigning any detail view. This is a layout fix, not new UI. In
  particular the page status badge (Bloklangan / Faol) is **not** added to the
  phone top bar: `BlockPanel` and `DecisionPanel` already carry that state and
  they sit second in the phone order.
- Replacing Vitest. The Playwright check is additional, not a migration.

## Anti-goals

Things that would make this a failure even if every viewport measured clean:

- **A check that passes on a page it never really rendered.** A detail view
  that 404s, or sits in a skeleton, cannot overflow. Every asserted page must
  be confirmed to have rendered its real content first.
- **A check that never opens the broken states.** Two of the three small fixes
  below are invisible until an audit row is expanded or a settings field is
  dirtied, and `UserTabs` holds its tab in local state, so a load-only check
  would measure the "Bronlar" tab and nothing else. §4 drives those states.
- **Phone layout bought with desktop regressions.** Reordering with `order-*`
  or grid areas would leave the keyboard and screen-reader order fighting the
  visual order (WCAG 1.3.2) on the admin's own blocking flow.
- **Per-page one-off CSS.** Two detail pages diverging again is how this bug
  survived the first responsive pass.

## Constraints

- Tailwind's default breakpoints: `md` 768, `lg` 1024, `xl` 1280. The whole
  change hangs off `lg` (1024px), matching `COMPACT_NAV` in
  `src/admin/components/useMediaQuery.ts`.
- Design tokens only — no hex, no `bg-white`, no Tailwind palette colours.
  Light **and** dark both checked; a screen is unfinished until both are.
- Admin text is Uzbek Latin with `ʻ` (U+02BB) in oʻ/gʻ and `ʼ` (U+02BC) for
  the tutuq belgisi. No translation layer in the admin panel.
- Use `src/admin/components/`; do not restyle per page.
- Touch targets ≥ 44px; inputs ≥ 16px font.
- Commit on the current branch (`fix/admin-dashboard`) only. No branches, no
  pushes, no PRs.

## Approaches

The layout fix itself is not in question: the container becomes
`flex-col lg:flex-row`, the aside `w-full lg:w-94`, and `sticky` / `max-h` /
`overflow-y-auto` move behind `lg:`. The question was how the blocks reach the
required order, since below 1024px the aside's contents must come *before* the
main column and above it they sit to its right.

1. **`order-*` utilities or `grid-template-areas`, pure CSS.** One DOM, no JS.
   Rejected: the DOM keeps today's order, so below 1024px the keyboard and
   screen-reader order is tabs → Tarix → Maʼlumotlar → Qaror against the
   opposite visual order — a WCAG 1.3.2 mismatch on the blocking flow.
2. **One DOM in phone order, two columns via grid at `lg`.** Also pure CSS and
   correct on phones. Rejected: it flips *desktop* tab order, so the aside
   precedes the tabs for every existing desktop admin. Non-goal.
3. **A shared `DetailLayout` whose blocks are ordered by
   `useMediaQuery(COMPACT_NAV)` — chosen.** Visual, DOM and focus order agree
   at every width, and the desktop order is byte-for-byte today's. It is the
   pattern the panel already committed to: `AdminLayout` renders exactly one
   navigation through `useMediaQuery`, commented *"never two hidden by CSS"*,
   and `stubMedia` already exists in `test-utils.tsx` to drive it under
   Vitest, where the default is desktop — so no existing test changes.

**Crossing 1024px remounts the blocks, and that is accepted.** An earlier
draft of this document claimed a keyed array would preserve the open tab and
the expanded audit rows. That was wrong: keys preserve identity only among
siblings of one parent, and the two branches necessarily put the blocks under
different parents (`<aside>` versus the flat column). Preserving state and
dropping the `<aside>` landmark on phones are mutually exclusive, and the
landmark matters more: the state is lost only when someone drags a *desktop*
window across 1024px, never on a phone or a tablet in use, and all it costs is
a reset tab.

For the regression check, fixtures were chosen over a real sign-in: the
backend and a DB-created test admin would be needed, and a live run silently
*skips* a detail page when no such record exists — precisely the page most
likely to be broken. Fixtures also let the data be hostile on purpose.

## The design

### 1. `DetailLayout` — the shared component

New: `src/admin/components/DetailLayout.tsx`.

One ordered list of blocks. **The array order is the phone order; `column`
picks the desktop column, keeping the array order within each column.**

```tsx
export interface DetailBlock {
  key: string
  node: ReactNode
  column: 'main' | 'aside'
}

<DetailLayout
  blocks={[
    { key: 'summary', column: 'aside', node: <SummaryCard … /> },
    { key: 'decision', column: 'aside', node: <BlockPanel … /> },
    { key: 'tabs', column: 'main', node: <UserTabs … /> },
    { key: 'history', column: 'main', node: <UserHistory … /> },
  ]}
  asideLabel="Foydalanuvchi"
  mainGap={6}
/>
```

A four-slot API (`summary` / `decision` / `main` / `history`) was the first
draft and cannot express this page: Maʼlumotlar (`InfoSection`) and Bron
shartlari (`TermsSection`) are *main-column* blocks on the stadium page, so
its phone order is main → aside → aside → aside → main → history. Passing
`InfoSection` as a `summary` slot would move it into the desktop `<aside>`,
which the "desktop unchanged" non-goal forbids.

- **At ≥ 1024px**: a flex row — `div.min-w-0.flex-1` holding the `main` blocks,
  then `<aside aria-label={asideLabel}>` with `sticky top-6 w-94 shrink-0`
  holding the `aside` blocks. Identical to what the two pages render today.
- **Below 1024px**: one `flex-col` with every block in array order, no
  `<aside>` wrapper and no `sticky`.
- `mainGap` exists because the two pages differ today — the user page's main
  column is `gap-6`, the stadium page's `gap-4` — and "byte-for-byte desktop"
  means keeping both.
- `asideMaxHeight?: boolean` adds the stadium page's
  `max-h-[calc(100dvh-3rem)] overflow-y-auto`, at `lg` only.
- jsdom has no `matchMedia`, so `useMediaQuery` answers `false` and existing
  tests get the desktop branch unless they call `stubMedia(COMPACT_NAV)`.

**Vitest test** (`DetailLayout.test.tsx`) — the one part of this work that
runs in `npm test`: desktop renders the `<aside>` with its blocks in column
order; `stubMedia(COMPACT_NAV)` renders a single column in array order with no
`complementary` landmark.

### 2. The two detail pages

- `UserPage` and `StadiumPage` drop their own flex row and pass `blocks`.
- Stadium order below 1024px, as decided in the conversation (rule 1 applied
  literally, not the order the request listed): **Maʼlumotlar** (gallery +
  info + map) → **Qaror** → Egasi → Ichki izohlar → Bron shartlari →
  **Tarix**. Qaror sits near the top because approving or rejecting is what
  the admin opened the page to do. Its desktop columns are unchanged:
  main = Maʼlumotlar, Bron shartlari, Tarix; aside = Qaror, Egasi, Ichki
  izohlar.
- Both loading skeletons get the same treatment: one column below 1024px.

### 3. The smaller fixes

| Where | Now | Change |
|---|---|---|
| `audit/AuditLogTable.tsx` `Detail` | `dt` is `w-44 shrink-0` (176px) — inside a 360px card it leaves ~120px for the value | stack label above value below `md`, side by side from `md` |
| `components/SidePanel.tsx` `PanelRow` | `dt` is `w-40 shrink-0` (160px) | same treatment |
| `pages/settings/SettingsPage.tsx` dirty bar | one unwrapped row: icon, text, two buttons, `px-6` | wrap below `md`, buttons full width in their row, `px-4 md:px-6` |
| `audit/StatusTimeline.tsx:33` | the text column is `flex flex-col` with no `min-w-0`, so a long `reason` pushes the row wider than the panel | add `min-w-0` and wrap |
| `shared/format/number.ts:7` | groups with U+0020, so `12 345 000 soʻm` can wrap mid-number | group with **U+00A0**, so money and counts never split, in the one shared helper CLAUDE.md asks for |

The last one is the only change outside `src/admin`, and it is deliberate: the
earlier pass patched this with `whitespace-nowrap` at a few call sites, and the
panels' three-column money grid (`panels.tsx:310`) has none. Fixing the helper
fixes both apps at once and stops the next money cell reintroducing it.
Whatever tests assert a plain space get updated with it.

**No sticky action bar.** The 2026-11-14 spec asked for one and it was never
built (`StickyActions.tsx` does not exist). With Qaror second in the phone
order, Bloklash / Tasdiqlash is reachable without scrolling, so a sticky bar
would duplicate it and eat vertical space on a 360×800 screen. That spec gets
a note saying this supersedes it.

### 4. The Playwright regression check

- `playwright` and `@playwright/test` as devDependencies, **Chromium only**
  (`npx playwright install chromium`, never bare `install`, which also pulls
  Firefox and WebKit).
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the `Dockerfile` before its
  `npm ci`, which has no `--omit=dev` and would otherwise download Chromium
  into every deploy image build.
- `playwright.config.ts`: headless, `webServer` runs the Vite dev server on
  5173 and waits for `/admin/`, one project per viewport.
- Kept out of the Vitest run: Vitest has no `include`, so it would otherwise
  pick up `e2e/responsive.spec.ts` by its `.spec.ts` name and run a Playwright
  spec under jsdom. Add `include: ['src/**/*.test.{ts,tsx}']`.
- Typechecked but out of the app build: a third referenced project
  `tsconfig.e2e.json`, since `tsconfig.app.json` includes only `src` and
  `tsconfig.node.json` only `vite.config.ts`, so `e2e/` currently falls
  outside `tsc -b` entirely.

**Fixtures** (`e2e/fixtures/`) fulfil all 31 endpoint/method pairs the panel
calls — 20 GET, 4 POST, 5 PUT, 2 DELETE:

```
GET    /api/users/me
GET    /api/admin/stats                      /api/admin/stats/bookings-daily
GET    /api/admin/stadiums                   /api/admin/stadiums/:id
GET    /api/admin/stadiums/:id/notes
GET    /api/admin/users                      /api/admin/users/:id
GET    /api/admin/users/:id/teams            /api/admin/users/:id/legal-details
GET    /api/admin/bookings                   /api/admin/bookings/:id
GET    /api/admin/games                      /api/admin/games/:id
GET    /api/admin/payments                   /api/admin/payments/:id
GET    /api/admin/payments/summary
GET    /api/admin/settings
GET    /api/admin/audit-log                  /api/admin/audit-log/actions
POST   /api/auth/admin/login                 /api/admin/stadiums/:id/notes
POST   /api/admin/payments/:id/retry-refund  /api/admin/payments/:id/mark-refunded
PUT    /api/admin/settings                   /api/admin/stadiums/:id/status
PUT    /api/admin/stadiums/:id/booking-terms /api/admin/users/:id
PUT    /api/admin/users/:id/legal-details
DELETE /api/admin/bookings/:id/remainder-mark
DELETE /api/admin/games/:id/remainder-mark
```

The mutations are fulfilled so that opening a confirm dialog and confirming it
cannot error; the check asserts layout, not mutation results.

The token goes into `localStorage` under `minipolya-admin-token` as an
`addInitScript`, with an `isAdmin` claim matching the stubbed
`/api/users/me`, so `RequireAdmin` lets the page through without the login
form. Theme is set the way the app sets it — `minipolya-admin-theme` in
`localStorage`, which `initAdminTheme()` reads before first render — not
Chromium's `prefers-color-scheme` alone, so the assertion exercises the real
path.

**The fixtures stress the layout on purpose:** long Uzbek and Russian names,
long stadium names and addresses, amounts like 12 345 000 soʻm, full pages of
rows, long block reasons, long audit entries — and an empty variant per list,
selected by a query flag, so empty states are measured too.

Also stubbed, so the run needs no internet and cannot flake: `/api/uploads/**`
returns a real 1×1 PNG (a broken image changes the gallery's measured box),
and OSM tile requests are aborted. The fixture stadium **has** coordinates, so
`StadiumMap` — one of the widest elements on the page — is actually measured.

**`e2e/responsive.spec.ts`** visits every route: `/admin/login`, `/admin/`,
`/admin/maydonlar`, `/admin/maydonlar/:id`, `/admin/foydalanuvchilar`,
`/admin/foydalanuvchilar/:id`, `/admin/bronlar`, `/admin/bronlar?bron=:id`,
`/admin/bronlar?tab=oyinlar`, `/admin/bronlar?oyin=:id`, `/admin/tolovlar`,
`/admin/tolovlar?tolov=:id`, `/admin/jurnal`, `/admin/sozlamalar` — at
360×800, 390×844 and 1024×800, light and dark.

Per page:

1. **Wait for real content** — a known heading or row for that page. A page
   that did not render is a failure, not a pass.
2. `document.documentElement.scrollWidth > window.innerWidth` → fail, with the
   measured width in the message.
3. No element overflows its parent: walk the rendered cards, compare each
   `getBoundingClientRect().right` against its parent's over a 1px tolerance
   for sub-pixel rounding, and name the offenders' selectors.

Then, per page, the states a load-only check would never reach — each followed
by assertions 2 and 3 again:

| Page | Interaction |
|---|---|
| user detail, stadium detail, Jurnal | expand one audit row (`AuditDetails`) |
| user detail | each tab: Bronlar, Jamoalar, Maydonlar |
| Sozlamalar | change one field, so the dirty bar renders |
| user detail | open the Bloklash reason modal |
| stadium detail | open the reject reason modal |

1024×800 is included because the icon rail plus a fixed 376px aside is the
tightest case this change creates, and nothing else would cover 1024–1279.

**Enforcement:** `npm run e2e` (and `npm run e2e:ui` for the inspector),
documented in CLAUDE.md's Commands section with a line saying to run it after
any admin layout change. It stays out of the four-command pre-commit gate so
the commit loop keeps its current speed; the `DetailLayout` Vitest test in §1
is the part that runs there.

### 5. Verification

Run the check, fix everything it reports, and re-run until clean. Then check
the fixed pages in Chrome at 360×800, 390×844, 768×1024 and 1280×800, light
and dark, and confirm 1280×800 is identical to before the change.

## Left to the builder

- The exact fixture values, as long as they meet the stress brief above.
- Whether the parent-overflow walk is a shared helper or inline in the spec.
- How the empty-variant query flag is spelled.
- Whether `Detail` / `PanelRow` stack with `flex-col md:flex-row` or a grid.
