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

| Part | Status |
|---|---|
| Vite | **installed** (v8) |
| React + React DOM | **installed** (v19) |
| TypeScript | **installed** (v6) — strict mode comes with the foundation step |
| ESLint | **installed** (v10, flat config in `eslint.config.js`) |
| `@types/node` | **installed** |
| Tailwind CSS v4 | foundation step |
| react-router | foundation step |
| TanStack Query | foundation step |
| lucide-react | foundation step |
| Vitest + Testing Library | foundation step |
| Prettier | foundation step |

Nothing above is a suggestion to swap out — if a different library seems
necessary, raise it rather than quietly introducing it.

## Planned structure

```
index.html            → Mini App entry
admin.html            → admin panel entry
src/
├── miniapp/          # Mini App only (players + owner mode)
├── admin/            # admin panel only
└── shared/           # api client, types, utils, i18n primitives, shared UI
```

Two Vite entries, one build. **Admin code must never end up in the Mini App
bundle:** nothing in `src/miniapp` may import from `src/admin`, and nothing in
`src/shared` may import from either. Shared code flows one way —
`miniapp`/`admin` → `shared`, never back.

The current `src/App.tsx`, `src/main.tsx`, `src/App.css` and `src/assets/*`
are leftover Vite scaffolding and get replaced in the foundation step.

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
  items there (no CORS config, no admin login endpoint) block whole features.

## API rules

- **Base URL** from `VITE_API_URL` (e.g. `http://localhost:8080`). Never
  hard-code a host.
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

## Language

**Mini App:** every piece of user-facing text goes through the translation
layer **from the very first component** — no hard-coded strings, not even as a
placeholder. Three languages: **uz (default)**, **ru**, **en**. The user's
language comes from their backend profile (`user.language` on
`GET /api/users/me`), not from the browser or Telegram.

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

Currently in `package.json`:

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # serve the production build
```

To be added in the foundation step:

```bash
npm run test      # Vitest
npm run format    # Prettier
npm run typecheck # tsc --noEmit
```
