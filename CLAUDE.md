# MiniPolya Frontend

## What MiniPolya is

A football pitch booking platform for Tashkent, Uzbekistan. Players find a
pitch, book an hour (or several), pay by card, and organise games — including
team-vs-team matches where two teams split the cost. Stadium owners manage
their pitches, pricing, schedule and walk-in bookings.

**This one repository holds two separate frontends:**

| | Who uses it | Where |
|---|---|---|
| **Telegram Mini App** | **players and stadium owners** — owners switch into an *owner mode* inside the same app. There is **no separate owner web dashboard.** | `index.html` → `src/miniapp` |
| **Admin panel** | platform admins only, desktop web | `admin.html` → `src/admin` |

## Stack

All installed:

| Part | Version | Notes |
|---|---|---|
| Vite | v8 | multi-page build, `vite.config.ts` |
| React + React DOM | v19 | |
| TypeScript | v6 | `strict` + `noUncheckedIndexedAccess` |
| ESLint | v10 | flat config in `eslint.config.js`, with `eslint-config-prettier` |
| Prettier | v3 | `.prettierrc.json`; Markdown and `.agents/` are not formatted |
| Tailwind CSS | v4 | via `@tailwindcss/vite`; config lives in CSS, not a JS file |
| react-router | v8 | |
| TanStack Query | v5 | |
| lucide-react | v1 | icons |
| `@fontsource-variable/inter` | v5 | **admin panel only** — self-hosted Inter |
| i18next + react-i18next | v26 / v17 | **Mini App only** |
| Vitest + Testing Library | v5 / v16 | jsdom, `@testing-library/jest-dom` matchers |
| `@types/node` | v24 | |

Nothing above is a suggestion to swap out — if a different library seems
necessary, raise it rather than quietly introducing it.

## Structure

```
index.html            → Mini App entry (the only page that loads telegram-web-app.js)
admin.html            → admin panel entry
src/
├── miniapp/          # Mini App only (players + owner mode)
│   ├── main.tsx      #   entry: theme, API client (in-memory token), Query, i18n
│   ├── telegram.ts   #   typed access to window.Telegram.WebApp
│   ├── theme.ts      #   follows Telegram's colorScheme live
│   └── i18n/         #   i18next setup + locales/{uz,ru,en}.json
├── admin/            # admin panel only
│   ├── main.tsx      #   entry: theme, API client (localStorage token + 401/blocked → logout), Query, toasts
│   ├── App.tsx, routes.tsx  # router (basename /admin); one route per menu item
│   ├── api/          #   endpoint types + calls; missing.ts = endpoints not shipped yet;
│   │                 #   sample/ = clearly marked sample data (adapter.ts: development only)
│   ├── auth/         #   session store, login page, route guard, no-access page
│   ├── components/   #   shared admin UI from the design's component frames
│   ├── layout/       #   sidebar, layout, menu (MENU drives routes and the sidebar)
│   ├── pages/        #   overview ("Bosh sahifa"), "Tez orada" placeholder
│   ├── format.ts     #   Uzbek month names, relative time ("2 kun oldin")
│   ├── fonts.css     #   self-hosted Inter (admin only)
│   └── theme.ts      #   system setting on first visit, toggle, remembered
├── shared/           # used by both; imports from neither
│   ├── api/          #   client, ApiError, message strings, token stores, query client
│   ├── format/       #   formatSom, Tashkent date/time helpers
│   └── theme/        #   tokens.css, index.css (Tailwind mapping), applyTheme
└── test/setup.ts     # Vitest setup
```

Two Vite entries, one build. **Admin code must never end up in the Mini App
bundle:** nothing in `src/miniapp` may import from `src/admin`, and nothing in
`src/shared` may import from either. Shared code flows one way —
`miniapp`/`admin` → `shared`, never back. ESLint enforces this
(`no-restricted-imports` in `eslint.config.js`).

**Dev URLs** (`npm run dev`):

- Mini App — `http://localhost:5173/`
- Admin panel — `http://localhost:5173/admin/` (any `/admin/*` path serves
  `admin.html`; the admin router uses `basename: '/admin'`). Production hosting
  needs the same rewrite: `/admin/*` → `admin.html`, everything else →
  `index.html`.

Outside Telegram the Mini App has no `initData`, so login cannot work in a
plain browser; the page still renders and follows the computer's theme.

## Shared building blocks

- **API:** `import { api, ApiError } from '../shared/api'`. `api.get/post/put/
  patch/delete<T>(path, …)` returns the envelope's `data` or throws `ApiError`
  (`status`, `message`, `code?` — `code` only on a few errors, see `API_CODES`; status `0` =
  network failure). Each app calls `configureApiClient` once in `main.tsx` with
  its token store plus optional `onUnauthorized` / `onAccountBlocked` hooks.
  Exact backend message strings live only in `shared/api/messages.ts`.
- **Queries:** `createQueryClient()` — no retries on 4xx, at most 2 on
  5xx/network, mutations never retried.
- **Money:** `formatSom(tiyin)` from `shared/format`. **Dates:** `formatDate`,
  `formatTime`, `formatDateTime`, `formatTimeRange`, `toTashkentParts`
  (`dayOfWeek` 0 = Monday) from `shared/format`.
- **Endpoint types** go next to the feature that uses them, not in `shared/api`.
- **JWT claims:** `readJwtClaims` / `isJwtExpired` from `shared/api` — for
  client decisions only (skip an expired token, notice role changes); the
  signature is never checked client-side.

## Sample data

When a design needs a value the backend does not provide, it may be shown as
**sample data**, never silently:

- it lives in one place per app (`src/admin/api/sample/`), behind the API
  layer, never inline in a component
- it is rendered with the visible **"Namuna"** tag (`SampleTag`), whose
  tooltip names the request, placed on the sample value itself — never on a
  real value next to it (a whole section of sample data gets one tag on its
  heading)
- it is shown **in development only** (`SHOW_SAMPLE_DATA`); a production build
  leaves it out rather than show made-up numbers
- it has an entry in `docs/backend-requests.md`, and is deleted when the
  backend ships the real field

**Missing endpoints.** `src/admin/api/missing.ts` holds the **one list**
(`MISSING_ENDPOINTS`) of endpoints and fields the panel calls that the backend
has not shipped, each with its request number. The API functions in
`src/admin/api` are written against the requested contract and wrap the real
call in `viaSample(endpoint, real, sample)`:

- development: `api/sample/adapter.ts` answers, keeping its sample data in
  memory so actions (approve, block, retry…) change what the next request
  returns; success toasts say the action was a sample
- production: the adapter is not in the bundle (it is imported only behind
  `import.meta.env.DEV`); `availability(endpoint)` is `'soon'`, so the section
  shows "Tez orada" and its action buttons are disabled with the tooltip
  "Tez orada"
- when the backend ships one, delete its line from `MISSING_ENDPOINTS` — the
  real call takes over unchanged — then delete its adapter function

After a build, check that `dist/` contains no sample data (e.g. grep for a
sample name).

## Admin components

`src/admin/components/` holds the admin UI from the design's component
frames: `Button` (primary, secondary, danger, danger-outline, text),
`StatusBadge`, `KpiCard`, `DataTable`, `Pagination`, `FilterBar` /
`SearchField` / `FilterSelect`, `Tabs`, `Modal` / `ConfirmModal` /
`ReasonModal`, `ToastProvider` / `useToast`, `Skeleton`, `Avatar`,
`EmptyState` / `ErrorState`, `PageHeader`, `BarChart`. Use them; do not
restyle per page.

- `DataTable` sorting only reports clicks — the backend has **no sort
  parameter**, so a page either sorts what it has, or leaves columns
  unsortable.
- Admin pages: add the item to `MENU` in `layout/menu.ts` (route, sidebar and
  breadcrumbs follow), then replace its `ComingSoonPage` in `routes.tsx`.
- Admin text is Uzbek Latin with `ʻ` (U+02BB) in oʻ/gʻ and `ʼ` (U+02BC) for
  the tutuq belgisi (maʼlumot).

## The backend is the source of truth

`../minipolyaBackend` (Spring Boot, Java 21, PostgreSQL) is **read-only for
frontend work.** Read its code and its `CLAUDE.md` freely; read-only git
commands (`log`, `show`, `diff`) are fine. Never modify, build, run or commit
anything in it.

Rules that follow from that:

- **Use only endpoints and fields that actually exist in the backend.** Check
  `docs/api-reference.md` and, when in doubt, the DTO in
  `../minipolyaBackend/src/main/java/.../dto/` before using a field.
- **Never invent an endpoint, a field or a status value.** If a screen needs
  something the API does not provide, add an entry to
  `docs/backend-requests.md` and build around what exists.
- **When the backend changes, update `docs/api-reference.md`.** It records the
  backend branch and commit it was generated from — if that commit is behind
  `../minipolyaBackend` HEAD, treat the reference as stale and regenerate it.
- `docs/api-reference.md` has a **"Questions about the backend"** section with
  known gaps and inconsistencies. Read it before building a flow; several
  items there (e.g. no CORS config, which matters only in production) block
  whole features.

## API rules

- **Base URL.** Never hard-code a host in app code.
  - **Dev (`npm run dev`):** the apps call `/api/...` on their own origin
    (`http://localhost:5173`) and the Vite dev server proxies `/api` to the
    backend at `http://localhost:8080` (`server.proxy` in `vite.config.ts`).
    Same origin, so **no CORS is needed locally**. Start the backend yourself;
    with it down, `/api` calls answer 502.
  - **Production builds:** `VITE_API_URL` (e.g. `https://api.example.uz`).
    It is ignored in dev. A build without it fails on the first request.
    Whether production needs CORS depends on hosting — see R1 in
    `docs/backend-requests.md`.
- **Every response uses the same envelope:** `{ success, data, message }`.
  Unwrap it in one place in the API client; feature code should see `data`.
  Errors may add a `code` — see below.
- **Most errors carry no machine-readable code.** Only the admin-login errors
  and `TOKEN_REVOKED` send one (`code` in the envelope, api-reference §1.2);
  where a `code` exists, branch on it (`API_CODES` in
  `shared/api/messages.ts`). Elsewhere `message` is human-readable English
  prose: branch on the **HTTP status** first; only match on the exact
  `message` string where a flow genuinely needs to tell two same-status
  failures apart, and keep every such string in one place so it is obvious
  what breaks when the backend rewords it. (Codes everywhere is Q1 in the
  reference.)
- **JWT in the `Authorization` header:** `Authorization: Bearer <token>`.
  24-hour expiry, no refresh endpoint. A 401 means re-authenticate.
- **A 403 `"Account is blocked"` can arrive on any endpoint at any time** —
  the backend re-reads the block flag on every request. Handle it globally.
- **Role flags come from the JWT, not the live row.** A user just promoted to
  owner keeps getting 403 from `/api/owner/**` until they get a new token. If
  `/api/users/me` reports flags that disagree with the current token,
  re-authenticate.
- **All ids are UUID strings.** Never treat one as a number.
- **Money is always TIYIN** (1 so'm = 100 tiyin), everywhere, in both
  directions. Format for display as `"150 000 so'm"` — grouped with spaces,
  the `so'm` suffix. Never show a raw tiyin figure, never use floats for
  money, and keep the formatting in one shared helper.
- **Timestamps are always UTC** on the wire (ISO-8601, e.g.
  `"2026-11-02T15:00:00Z"`). Display in **Asia/Tashkent**. Convert in one
  shared helper, never ad hoc.
- **Most response fields are omitted when null** (`@JsonInclude(NON_NULL)`),
  so type them optional (`field?: T`) rather than `T | null`.
- **`dayOfWeek` is 0 = Monday … 6 = Sunday** — not JavaScript's
  `Date.getDay()`, where 0 is Sunday. Convert carefully.
- **Enum values arrive lowercase** (`"partially_paid"`), but the request-side
  `paymentOption` is **uppercase** (`"MINIMUM"` / `"FULL"`).
- **Paged endpoints** return `{ content, page, size, totalElements, totalPages }`
  and take `?page=` / `?size=`. There is no `sort` parameter; each endpoint's
  order is fixed server-side.

## Auth

**Mini App.** The client hands the raw Telegram `initData` string to the
backend, which verifies its HMAC-SHA256 signature against the bot token and
returns a JWT:

```
POST /api/auth/telegram   { "initData": "<raw initData string>" }
→ { success, data: { token, user }, message }
```

The client **never trusts `initData` on its own** — not for the user's
identity, their name, or anything else. Only this endpoint's `user` object is
trustworthy, and verification requires `BOT_TOKEN`, which exists only on the
server. There is no logout endpoint; dropping the token locally is the logout.

**Admin panel.** Logs in with a **username and password**:

```
POST /api/auth/admin/login   { "username", "password" }
→ { success, data: { token, user }, message }
```

**Admin accounts and passwords are managed only in the database** — created,
set and reset with the SQL in the backend's `CLAUDE.md`, "Admin accounts".
The panel has **no** register, forgot-password or change-password screen, and
must not get one (the backend removed its own-password endpoint, request R7).
The login form (`auth/LoginPage.tsx`) maps the
error `code`s to Uzbek messages in `auth/messages.ts`: `INVALID_CREDENTIALS`,
`ACCOUNT_LOCKED` (423, with `data.minutesRemaining`), `TOO_MANY_ATTEMPTS`
(429), `ACCOUNT_BLOCKED`, and network/server failures.

- The JWT is kept in localStorage (`minipolya-admin-token`) and checked with
  `GET /api/users/me` on startup. If the token's `isAdmin` claim disagrees
  with `/users/me`, the admin is logged out to get a fresh token.
- A password reset in the database (`password_changed_at = now()`) revokes
  every older token: the next request answers 401 `code: "TOKEN_REVOKED"` →
  logout → login page with "Sessiya tugadi, qayta kiring".
- Any other 401 → logout → login page ("Sessiya tugadi"). 403 `"Account is
  blocked"` → logout with its own notice. Logout drops the token and every
  cached query.
- Logged in but not an admin → the "Sizda kirish huquqi yoʻq" page.

**Local development:** start the backend and create an admin for yourself
with the backend's "Create an admin" SQL, then log in at
`http://localhost:5173/admin/` with that username and password. Nothing goes
in `.env.local` for it.

## Never re-implement business rules

The backend owns every rule about money, deadlines and eligibility. The client
**displays what the API returns** and does not recalculate it:

- refund amounts → `refundIfCancelledNow`, `refundAmount`
- cancellation deadlines → `cancellationDeadline`, `cancellationPolicy.cancellationHours`
- what is still owed → `remainingAmount`, `remainderAmount`, `remainderStatus`
- what a team pays to join → `amountToPayNow`, `feeAmount`, `advanceAmount`
- prices → `price` on a booking, `pricePerHour` per availability slot
  (promotions already applied)

Do not reproduce the cancellation bands, the team-game fee split, the 3-hour
opponent cutoff, the hold expiry, or per-hour price calculation in TypeScript.
If a value is needed and the API does not return it, that is a backend
request, not a client calculation.

For how the platform actually works — the three game flows, the team-vs-team
money model, the cancellation policy, booking statuses — read
`../minipolyaBackend/CLAUDE.md`. It is the authoritative description of the
domain.

## Design

Design files live in `design/`:

- `design/admin-panel.pen` — the admin panel
- the Mini App design will be added later

**Read `.pen` files only through the pencil MCP tools**, with the right file
open in pen.dev. Never read, grep or diff a `.pen` file as raw text — they are
encrypted and the content is meaningless as bytes.

- Light and dark mode, both required everywhere:
  - All colours are design tokens (CSS variables) with a light and a dark value, taken from the design files through the pencil MCP. Brand: accent #2563EB in both modes (white text on it); in dark mode, links and accent icons use the lighter #60A5FA so they stay readable on black. Status colours (success, warning, danger) also have light and dark values.
  - Components never use hard-coded colours (no hex values or fixed Tailwind colours like bg-white in components), only the tokens, so every screen switches automatically.
  - Mini App: follows the user's Telegram setting (light or dark), using OUR palette, not Telegram's colours, and switches live if the user changes it while the app is open.
  - Admin panel: a light/dark toggle in the sidebar; the first visit follows the computer's setting; the choice is remembered in the browser.
  - A screen or component is only finished when it has been checked in BOTH modes.

### How the theme works

- `src/shared/theme/tokens.css` holds the design variables from
  `admin-panel.pen`, **named exactly as in the design**: light values on
  `:root`, dark values on `:root[data-theme='dark']`. Switching the theme only
  sets `data-theme` (and `color-scheme`) on `<html>`.
- `src/shared/theme/index.css` maps them into Tailwind with `@theme inline`
  and **removes Tailwind's default colours, type scale, radii and shadows**, so
  `bg-white` or `text-blue-500` simply do not exist. Use:

  | Tailwind | Design variable | Use |
  |---|---|---|
  | `bg-page` | `page-bg` | page background |
  | `bg-background` | `bg` | cards, sidebar, modals |
  | `bg-surface` | `surface` | inputs, segmented controls |
  | `bg-hover`, `bg-skeleton`, `bg-overlay` | same | |
  | `border-border` | `border` | |
  | `text-primary`, `text-secondary` | `text`, `text-secondary` | **text colours** (not brand) |
  | `bg-accent`, `bg-accent-soft`, `text-on-accent` | `accent`, `accent-soft`, white | brand |
  | `text-link` | `link` | links and accent icons (#60A5FA in dark) |
  | `success`, `warning`, `danger` (+ `-soft`), `neutral-soft` | same | status |

  Type scale `text-2xs` 11 · `xs` 12 · `sm` 13 · `base` 14 · `md` 15 · `lg` 16
  · `xl` 17 · `2xl` 20 · `3xl` 22 · `4xl` 24 · `5xl` 30 · `6xl` 32 px;
  `tracking-caps` / `tracking-display`. Radii `rounded-xs` 4 · `sm` 6 · `md` 8
  · `lg` 10 · `xl` 12 · `2xl` 14 · `3xl` 16 · `full`. Shadows `shadow-sm`
  (segmented control) · `md` (tooltip) · `lg` (toast) · `xl` (modal) · `card`
  (login card). Spacing is Tailwind's default 4px step, which covers every gap
  and padding in the design.
- **Fonts differ per app:**
  - **Admin panel: Inter**, self-hosted from `@fontsource-variable/inter`
    (no Google Fonts request), declared in `src/admin/fonts.css` and imported
    only by the admin entry. Subsets: Latin (includes Uzbek `ʻ`/`ʼ`, U+02BB /
    U+02BC), Latin Extended, Cyrillic (Russian) and Cyrillic Extended (Uzbek
    Cyrillic `қ ғ ҳ ў`). `unicode-range` means a subset is downloaded only when
    a page uses it; anything Inter lacks falls back to the system font. All of
    these characters were checked to render in Inter itself.
  - **Mini App: the system font** (`--font-sans` default in
    `shared/theme/index.css`) — native look inside Telegram, nothing to
    download. Do not import `fonts.css` or `@fontsource*` from `src/miniapp`.
- Write Uzbek with the proper letters: `oʻ`/`gʻ` use U+02BB (`ʻ`), not an
  apostrophe or `‘`.
- Mini App: `src/miniapp/theme.ts` — Telegram's `colorScheme` +
  `themeChanged`; the computer's setting outside Telegram.
- Admin: `src/admin/theme.ts` — `initAdminTheme()`, `toggleAdminTheme()` for
  the sidebar, `useAdminTheme()`; stored under `minipolya-admin-theme`.

## Language

**Mini App:** every piece of user-facing text goes through the translation
layer **from the very first component** — no hard-coded strings, not even as a
placeholder. Three languages: **uz (default)**, **ru**, **en**. The user's
language comes from their backend profile (`user.language` on
`GET /api/users/me`), not from the browser or Telegram.

Translations live in `src/miniapp/i18n/locales/{uz,ru,en}.json`; keys are
typed from `uz.json`, and a test fails if the three files' keys differ. Call
`setLanguage(user.language)` once the profile is loaded.

**Admin panel:** Uzbek (Latin) only. No translation layer needed there.

Note that API error messages come back in **English prose** (with one
hard-coded Uzbek exception, Q7 in the reference), so anything shown to a user
needs mapping to a translated string rather than being displayed raw.

## Secrets

**Everything starting with `VITE_` is inlined into the public bundle.** Anyone
can read it. Never put a secret behind a `VITE_` name:

- ❌ bot token, JWT secret, payment/ATMOS keys, database credentials
- ✅ `VITE_API_URL`, and other values that are already public

Local values go in **`.env.local`**, which git ignores (`*.local` in
`.gitignore`). Never commit a real `.env*` file with values in it; a committed
`.env.example` with empty placeholders is fine.

## Git

**The user creates branches and pull requests.** Claude:

- commits **only on the current branch**, in small logical commits with clear
  messages
- **never** creates a branch, pushes, opens a pull request, or merges

## Commands

```bash
npm run dev           # Vite dev server — both apps (URLs under "Structure")
npm run build         # tsc -b && vite build → dist/
npm run preview       # serve the production build
npm run test          # Vitest, single run
npm run test:watch    # Vitest, watch mode
npm run lint          # eslint .
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run typecheck     # tsc -b (project references, no emit)
```

Before committing: `typecheck`, `lint`, `test` and `build` must pass.
