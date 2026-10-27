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
│   ├── main.tsx      #   entry: theme, API client (localStorage token), Query
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
  (`status`, `message`, `code?` — `code` is never sent today, Q1; status `0` =
  network failure). Each app calls `configureApiClient` once in `main.tsx` with
  its token store plus optional `onUnauthorized` / `onAccountBlocked` hooks.
  Exact backend message strings live only in `shared/api/messages.ts`.
- **Queries:** `createQueryClient()` — no retries on 4xx, at most 2 on
  5xx/network, mutations never retried.
- **Money:** `formatSom(tiyin)` from `shared/format`. **Dates:** `formatDate`,
  `formatTime`, `formatDateTime`, `formatTimeRange`, `toTashkentParts`
  (`dayOfWeek` 0 = Monday) from `shared/format`.
- **Endpoint types** go next to the feature that uses them, not in `shared/api`.

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
  items there (no admin login endpoint; no CORS config, which matters only in
  production) block whole features.

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
  Note there is **no `code` field** — see below.
- **Errors carry no machine-readable code.** `message` is human-readable
  English prose. Branch on the **HTTP status** first; only match on the exact
  `message` string where a flow genuinely needs to tell two same-status
  failures apart, and keep every such string in one place so it is obvious
  what breaks when the backend rewords it. (A real `code` field is request Q1
  in the reference.)
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

**Admin panel.** Intended to log in with the **Telegram Login Widget**. The
backend does not yet expose an endpoint for the widget's payload — only the
Mini App `initData` flow above exists, and the widget sends a different shape
with a different hash derivation. This is logged as **Q2** in
`docs/api-reference.md`; admin login cannot be finished until the backend adds
it, so it belongs in `docs/backend-requests.md` as soon as admin work starts.

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

  Type scale `text-2xs` 11 · `xs` 12 · `sm` 13 · `base` 14 · `md` 15 · `lg` 17
  · `xl` 22 · `2xl` 30 px; `tracking-caps` / `tracking-display`. Radii
  `rounded-sm` 6 · `md` 8 · `lg` 10 · `xl` 12 · `2xl` 14 · `full`. Shadows
  `shadow-sm/lg/xl`. Spacing is Tailwind's default 4px step, which covers
  every gap and padding in the design.
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
npm run build         # tsc -b && vite build → dist/index.html + dist/admin.html
npm run preview       # serve the production build
npm run test          # Vitest, single run
npm run test:watch    # Vitest, watch mode
npm run lint          # eslint .
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run typecheck     # tsc -b (project references, no emit)
```

Before committing: `typecheck`, `lint`, `test` and `build` must pass.
