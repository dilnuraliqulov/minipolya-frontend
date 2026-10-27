# Backend Requests

Things the frontend needs from `../minipolyaBackend` that do not exist yet.

The backend is the source of truth and is read-only for frontend work, so when
a screen needs an endpoint, a field or a status value that the API does not
provide, **it gets written down here instead of being worked around in the
client.** No inventing endpoints, no guessing field names, no recomputing a
business rule client-side to paper over a missing value.

**How to use this file**

1. Before adding an entry, check `docs/api-reference.md` — including its
   **"Questions about the backend"** section, which already lists known gaps
   and inconsistencies found while reading the backend. If what you need is
   already a question there, turn it into a request here with the concrete
   shape the frontend wants.
2. Copy the template below, fill in every field, and add it under
   **Open requests**.
3. Keep the proposed shape consistent with what the backend already does: the
   `{ success, data, message }` envelope, `{ content, page, size, totalElements, totalPages }`
   for lists, UUID string ids, **tiyin** for money, **UTC** timestamps,
   lowercase enum values, `dayOfWeek` 0 = Monday.
4. When the backend ships it, update `docs/api-reference.md` from the new
   commit and move the entry to **Done**.

---

## Template

```markdown
### R<n> — <short title>

**What's needed**
What the frontend cannot do today, and why the existing API does not cover it.

**Which screen needs it**
The screen or flow that is blocked, and which frontend (Mini App player /
Mini App owner mode / admin panel).

**Proposed endpoint**
`<METHOD> /api/<path>` — access level (public / logged-in user / owner / admin)

Request — path and query parameters, and body fields with types, required or
optional, and validation rules:

| Field | Type | Required | Validation |
|---|---|---|---|
| | | | |

Response — `data` payload with field types (mark money **tiyin** and
timestamps **UTC**):

| Field | Type | Notes |
|---|---|---|
| | | |

Error cases — HTTP status and message for each failure the frontend must
handle.

**Priority**
Blocker / High / Medium / Low — plus one line on what it blocks or degrades.
```

---

## Open requests

### R1 — CORS for production

> **Only needed if the API is served from a different domain than the
> frontend; decide at deployment.** If the Mini App, the admin panel and the
> API end up on one origin (for example the API under `/api` behind the same
> host), nothing is needed.

**What's needed**
The backend has no CORS configuration at all — no `CorsConfig`, no
`@CrossOrigin`, no `cors(...)` in `SecurityConfig` (api-reference Q4). A
browser page on another origin cannot call the API: the preflight
`OPTIONS` request gets no `Access-Control-Allow-*` headers and the browser
blocks the call. In development this is avoided by the Vite dev-server proxy
(`/api` → `http://localhost:8080`), so this is a production-only concern.

**Which screen needs it**
Every API call from both frontends — Mini App (players and owner mode) and
admin panel — when they are hosted on a different origin from the API.

**Proposed endpoint**
No new endpoint. A CORS configuration in `SecurityConfig` (`http.cors(...)`
with a `CorsConfigurationSource`) covering `/api/**`:

| Setting | Value |
|---|---|
| Allowed origins | the deployed frontend origin(s), from configuration (e.g. `app.cors.allowed-origins`), **not** `*` |
| Allowed methods | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` |
| Allowed headers | `Authorization`, `Content-Type` |
| Allow credentials | not needed — the JWT goes in the `Authorization` header, no cookies |
| Max age | e.g. `3600` s, to cache preflights |

`/webhooks/**` is called server-to-server and needs no CORS.

Response — unchanged; error cases — unchanged (preflights must succeed
without a JWT, before the security filter rejects them as 401).

**Priority**
Blocker at deployment, **only if** the frontend and API are on different
origins; otherwise not needed.

### R2 — Telegram Login Widget login for the admin panel

**What's needed**
The admin panel logs in with the Telegram Login Widget, but the only login
endpoint, `POST /api/auth/telegram`, verifies Mini App `initData`
(api-reference Q2). The widget sends a different payload and is signed
differently, so there is no way to log in to the admin panel outside
development. The frontend is already built against the shape below
(`WIDGET_LOGIN_PATH` in `src/admin/api/auth.ts`); today it answers 404 and
the login page says the backend does not support it yet.

**Which screen needs it**
Admin panel — the login page ("Kirish").

**Proposed endpoint**
`POST /api/auth/telegram-widget` — public

Request body — exactly the object the widget passes to `data-onauth`:

| Field | Type | Required | Validation |
|---|---|---|---|
| `id` | number (long) | yes | Telegram user id |
| `first_name` | string | yes | |
| `last_name` | string | no | |
| `username` | string | no | |
| `photo_url` | string | no | |
| `auth_date` | number | yes | Unix seconds; reject if older than e.g. 1 day |
| `hash` | string | yes | hex |

Verification, per Telegram's Login Widget spec (differs from Mini App
`initData`):

```
secret_key       = SHA256(bot_token)                  // not HMAC("WebAppData", …)
data_check_string = every field except hash, sorted by key, "key=value", joined with \n
hash             = hex(HMAC-SHA256(key = secret_key, data = data_check_string))
```

Find the user by `telegram_id = id`. Suggested: do **not** create a new user
here — the admin panel is only for existing admins — and answer 401 for an
unknown id. (A known non-admin still gets a token; the frontend shows the
"no access" page.)

Response — `AuthResponse`, the same as `POST /api/auth/telegram`:

| Field | Type | Notes |
|---|---|---|
| `token` | string | JWT, same claims and 24 h expiry |
| `user` | `UserResponse` | |

Error cases:

| Status | `message` |
|---|---|
| 400 | bean validation, e.g. `"hash: must not be blank"` |
| 401 | `"Invalid Telegram signature"` |
| 401 | `"Telegram login data is too old"` (`auth_date` check) |
| 401 | `"Unknown Telegram user"` |
| 403 | `"Account is blocked"` |

**Priority**
Blocker — admins cannot log in to the admin panel in production without it.

### R3 — Previous-period figures for the overview KPIs

**What's needed**
Each KPI card on the admin overview compares with the previous period
("+12% oʻtgan haftaga nisbatan"). `GET /api/admin/stats` only returns the
current figures, so the comparison cannot be shown. The frontend shows
**sample** comparisons with a visible "Namuna" tag
(`src/admin/api/sample.ts`) until this exists.

**Which screen needs it**
Admin panel — overview ("Bosh sahifa"), the four KPI cards.

**Proposed endpoint**
No new endpoint: add fields to `AdminPlatformStatsResponse`
(`GET /api/admin/stats`, admin), all numbers, all present:

| Field | Type | Notes |
|---|---|---|
| `todayBookingsLastWeek` | number | bookings starting on the same weekday last week, same counted statuses as `todayBookings` |
| `previousMonthRevenueToDate` | number **(tiyin)** | last month from the 1st up to the same day of the month, same definition as `monthRevenue` |
| `newUsersPrevious7Days` | number | users created 7–14 days ago (pairs with R5) |
| `approvedStadiumsWeekAgo` | number | approved stadiums 7 days ago, or the change since then |

If the backend prefers, it can return the change itself (e.g.
`todayBookingsChangePercent`) instead — then the frontend only displays it.

**Priority**
Low — the cards show real current values; only the comparison line is sample.

### R4 — Daily booking counts for the overview chart

**What's needed**
The overview chart is "Bronlar soni, oxirgi 30 kun" (bookings per day). The
closest data is `GET /api/admin/stats/revenue`, whose `dailyRevenue[].bookingCount`
is used today — but `AdminService.getPlatformRevenue` counts **payments**, not
bookings (`findPositiveCompletedSince`): a booking paid as deposit + remainder
counts twice, each player's share in a game counts separately, and unpaid
bookings do not count. Worse, it only counts payments with status
`completed`, which `PaymentService` says is "only for the legacy Payme/Click
game rows" — card payments end as `paid`/`captured` and are not counted at
all (see R6). Days with no payments are omitted (the frontend shows them as 0).

**Which screen needs it**
Admin panel — overview ("Bosh sahifa"), the 30-day chart.

**Proposed endpoint**
Either fix the field's meaning or add a separate series. Suggested: add to
`OwnerRevenueResponse` for the admin endpoint, or a new
`GET /api/admin/stats/bookings-daily` — admin:

| Field | Type | Notes |
|---|---|---|
| `date` | string (`LocalDate`) | Tashkent date, the last 30 days ending today, **every day present** |
| `bookingCount` | number | bookings **starting** that day, with the same counted statuses as `todayBookings` |

**Priority**
Medium — the chart works, but its numbers are payments, not bookings.

### R5 — New users over the last 7 days

**What's needed**
The design's KPI is "Yangi foydalanuvchilar (7 kun)". The stats only have
`newUsersThisWeek`, which counts from Monday 00:00 Tashkent — on a Monday
morning it is close to 0. The frontend shows the real `newUsersThisWeek` and
labels the card "(shu hafta)" instead.

**Which screen needs it**
Admin panel — overview, third KPI card.

**Proposed endpoint**
Add `newUsersLast7Days` (number) to `AdminPlatformStatsResponse`: users
created in the last 7 × 24 hours.

**Priority**
Low.

### R6 — Admin revenue figures ignore card payments

**What's needed**
`AdminService.getPlatformStats` computes `totalRevenue`, `todayRevenue`,
`weekRevenue` and `monthRevenue` with `paymentRepository.sumRevenueAfter(COMPLETED, …)`,
and `getPlatformRevenue` (`GET /api/admin/stats/revenue`) uses
`findPositiveCompletedSince(COMPLETED, …)`. But `PaymentService` documents
`COMPLETED` as "only for the legacy Payme/Click game rows": card payments are
saved as `PAID` (direct charge) or `HELD` → `CAPTURED` (holds), and cash as
`PAID`. Its own "money actually arrived" set is
`PAID, CAPTURED, COMPLETED` (`REFUNDABLE_STATUSES` / `KEPT_STATUSES`).

So the admin's revenue figures and the daily series miss nearly every real
payment. Against the fake provider, the overview's "Shu oy ilova orqali
toʻlovlar" card and the 30-day chart stay at or near 0 however many bookings
are paid. This is not a frontend gap — the frontend shows what the API
returns and must not recompute it.

**Which screen needs it**
Admin panel — overview ("Bosh sahifa"): the month-revenue KPI and the chart.

**Proposed endpoint**
No new endpoint. Count the statuses that mean money arrived and was kept
(`PAID`, `CAPTURED`, `COMPLETED`, minus refunds as the owner stats do) in
`sumRevenueAfter` / `sumTotalRevenue` / `findPositiveCompletedSince` for the
admin stats. The response shapes stay the same.

Also worth deciding: "ilova orqali toʻlovlar" (paid through the app) suggests
cash (`method = cash`) should be excluded from that figure.

**Priority**
High — the overview's revenue numbers are wrong (near 0) today.

---

## Done

_None yet._
