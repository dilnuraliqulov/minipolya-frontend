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

### R8 — Failed refunds: a count for the sidebar and the overview

**What's needed**
The admin panel shows a red badge on "Toʻlovlar" and a to-do tile
"Muvaffaqiyatsiz qaytarishlar" (with "eng eskisi 3 soat oldin") when a refund
failed at the provider and needs an admin. Today the backend has **no failed
refund at all**: `PaymentService.refundInFull` calls
`paymentProvider.refund(...)` and writes the refund row straight as
`refunded`; a provider error throws and rolls the whole cancellation back.
This request needs the failure state from **R15** (refund rows that can end
`failed`), and adds two figures to the stats the sidebar already polls.

**Which screen needs it**
Admin panel — sidebar ("Toʻlovlar" badge) and overview ("Kutilayotgan ishlar").

**Proposed endpoint**
No new endpoint: two fields on `AdminPlatformStatsResponse`
(`GET /api/admin/stats`, admin).

| Field | Type | Notes |
|---|---|---|
| `failedRefunds` | number | refund payments (`paymentType = refund`) with `status = failed`, not yet retried successfully or marked as refunded by hand |
| `oldestFailedRefundAt` | string (UTC)? | `createdAt` of the oldest of those; omitted when there are none |

Error cases — none new.

**Priority**
High — failed refunds are money owed to players; nothing tells an admin today.

### R9 — Everything an admin needs to review a stadium, for any status

**What's needed**
To approve a stadium an admin must see what players will see: photos, the
location, opening hours, amenities, prices and booking terms. The admin
endpoints return only `AdminStadiumResponse` (name, address, owner, status,
format, surface, counts). The public `GET /api/stadiums/{id}` and
`GET /api/stadiums/{id}/pricing` have the rest, but answer **404 for any
stadium that is not approved and active** (`findByIdAndStatus(..., APPROVED)`),
i.e. exactly the ones waiting for review. The list also needs a thumbnail, the
district, the price and the owner's ATMOS contract (R11), and filters by
district and format. Stadiums have **no district** today, only a free-text
address.

**Which screen needs it**
Admin panel — Maydonlar list (thumbnail, Tuman, Narx, ATMOS columns; Tuman and
Format filters) and the stadium page (gallery, map, Maʼlumotlar, Narxlar,
Bron shartlari).

**Proposed endpoint**
`GET /api/admin/stadiums` — admin · paged — new query parameters and fields.

| Query | Type | Required | Validation |
|---|---|---|---|
| `district` | string | no | one of the district values below |
| `format` | string | no | `5x5` \| `7x7` \| `9x9` \| `11x11` |
| `status`, `search`, `page`, `size` | | | unchanged (`status` also takes `rejected`, R10) |

New fields on each `AdminStadiumResponse` row:

| Field | Type | Notes |
|---|---|---|
| `photoUrl` | string? | first photo by `position`; absent when there are none |
| `district` | string? | one of `Bektemir`, `Chilonzor`, `Mirobod`, `Mirzo Ulugʻbek`, `Olmazor`, `Sergeli`, `Shayxontohur`, `Uchtepa`, `Yakkasaroy`, `Yangihayot`, `Yashnobod`, `Yunusobod` — a new `stadiums.district` column the owner picks (nullable for old rows) |
| `pricePerHour` | number **(tiyin)** | the stadium's base price |
| `ownerContractStatus` | string | the owner's ATMOS contract, `none` \| `pending` \| `signed` (R11) |

`GET /api/admin/stadiums/{id}` — admin — everything above, plus the
`StadiumDetailResponse` fields, for **any status**:

| Field | Type | Notes |
|---|---|---|
| `photos` | `{ id: UUID, url: string, position: number }[]` | ordered by `position` |
| `latitude`, `longitude` | number? | |
| `phone`, `description` | string? | |
| `ownerPhone` | string? | |
| `openTime`, `closeTime` | string (`LocalTime`) | |
| `amenities` | `AmenitiesResponse` | the eight booleans |
| `minBookingAmount` | number? **(tiyin)** | absent ⇒ players pay in full |
| `cancellationHours` | number | |
| `pricingRules` | `PricingRuleResponse[]` | active rules, as `GET /api/stadiums/{id}/pricing` returns them |

Error cases — 400 `"Invalid district"` / `"Invalid format"` for an unknown
filter value; 404 `"Stadium not found"`.

**Priority**
High — without it an admin approves a stadium without seeing its photos,
location or prices.

### R10 — A `rejected` stadium status

**What's needed**
The panel has separate "Rad etilgan" (rejected) and "Bloklangan" (blocked)
tabs. The backend has no rejected status: rejecting a pending stadium sets it
to `blocked`, and only the audit action (`STADIUM_REJECTED` vs
`STADIUM_BLOCKED`) tells the two apart. So the list cannot filter rejected
stadiums, the Bloklangan tab mixes both, and the stadium page has to read the
audit log to know which it is.

**Which screen needs it**
Admin panel — Maydonlar tabs and the stadium page's status badge.

**Proposed endpoint**
No new endpoint. Add `rejected` to `stadium.status` (DB CHECK constraint, §1.9),
accept it in `PUT /api/admin/stadiums/{id}/status`
(`@Pattern(approved|blocked|pending|rejected)`), and in
`GET /api/admin/stadiums?status=rejected`.

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | yes | `approved` \| `blocked` \| `pending` \| `rejected`; `rejected` only from `pending` |
| `reason` | string | for `rejected` and `blocked` | max 500 |

Response — `AdminStadiumResponse` with `status: "rejected"`; notify the owner as
today. A rejected stadium stays invisible to players, like a blocked one.

Error cases — 400 `"Only a pending stadium can be rejected"`; 400
`"reason is required"`.

**Frontend change when shipped** — `setStadiumStatus` sends `rejected` for
"Rad etish" instead of `blocked` (`src/admin/api/stadiums.ts`).

**Priority**
Medium — rejections work today; they are just filed under "Bloklangan".

### R11 — Owner legal details and the ATMOS contract

**What's needed**
Card payments are paid out to owners through ATMOS, which needs a signed
contract and a recipient id per owner. The admin records each owner's legal
form, STIR (tax id) and contract state, and **must not approve a stadium whose
owner has no signed contract**. Nothing in the backend stores any of this.

**Which screen needs it**
Admin panel — the stadium page's owner card ("Huquqiy maʼlumotlar", the
"Egasi maʼlumotlari" modal) and decision panel (Tasdiqlash disabled until
signed); the Maydonlar list's ATMOS column (R9).

**Proposed endpoint**
`GET /api/admin/users/{id}/legal-details` — admin

Response — `OwnerLegalDetailsResponse`, or `data: null` when nothing has been
entered yet:

| Field | Type | Notes |
|---|---|---|
| `legalType` | string | `yatt` (YaTT) \| `mchj` (MChJ) \| `self_employed` (oʻzini oʻzi band qilgan) |
| `tin` | string | STIR, 9 digits |
| `atmosContractStatus` | string | `none` \| `pending` \| `signed` |
| `atmosRecipientId` | string? | present when `signed` |
| `updatedAt` | string (UTC) | |
| `updatedByName` | string? | the admin who last changed it |

`PUT /api/admin/users/{id}/legal-details` — admin

| Field | Type | Required | Validation |
|---|---|---|---|
| `legalType` | string | yes | `yatt` \| `mchj` \| `self_employed` |
| `tin` | string | yes | exactly 9 digits — `"tin must be 9 digits"` |
| `atmosContractStatus` | string | yes | `none` \| `pending` \| `signed` |
| `atmosRecipientId` | string | when `signed` | 1–50 chars — `"atmosRecipientId is required when the contract is signed"`; ignored otherwise |

Response — the saved `OwnerLegalDetailsResponse`, `message: "Legal details updated"`.
Write an audit entry (`OWNER_LEGAL_DETAILS_CHANGED`, entity `user`) with the
changed fields — never store anything secret in it.

Also: `PUT /api/admin/stadiums/{id}/status` with `approved` should refuse a
stadium whose owner's contract is not `signed` —
400 `"The owner's ATMOS contract is not signed"` — so the rule holds even if a
client skips the check.

Error cases — 400 validation as above; 404 `"User not found"`.

**Priority**
High — approval depends on it, and payouts cannot work without the recipient id.

### R12 — Internal notes on a stadium

**What's needed**
Admins keep short notes while reviewing a stadium ("28.10 qoʻngʻiroq
qilindi, juma kuni shartnoma imzolanadi") that only admins see. Nothing stores
them.

**Which screen needs it**
Admin panel — stadium page, "Ichki izohlar" card.

**Proposed endpoint**
`GET /api/admin/stadiums/{id}/notes` — admin — `StadiumNoteResponse[]`, newest
first (not paged; a stadium has a handful).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `text` | string | |
| `authorId` | UUID | the admin |
| `authorName` | string | their name at the time |
| `createdAt` | string (UTC) | |

`POST /api/admin/stadiums/{id}/notes` — admin

| Field | Type | Required | Validation |
|---|---|---|---|
| `text` | string | yes | `@NotBlank`, max 1000 — `"text is required"`, `"text must be at most 1000 characters"` |

Response — the created `StadiumNoteResponse`, `message: "Note added"`. Notes are
never shown to owners or players. (Editing and deleting are not needed.)

Error cases — 400 validation; 404 `"Stadium not found"`.

**Priority**
Low — admins can keep notes elsewhere meanwhile.

---

## Done

### R7 — Remove `POST /api/admin/me/password` _(shipped in `40bdbd2`)_

The endpoint, `ChangePasswordRequest` and `AdminAuthService.changePassword`
are gone. `password_changed_at` and the `TOKEN_REVOKED` check remain, so a
reset in the database still ends every session.

### R2 — Telegram Login Widget login for the admin panel _(withdrawn)_

Asked for `POST /api/auth/telegram-widget` so admins could sign in with the
Telegram Login Widget. Superseded by username + password sign-in,
`POST /api/auth/admin/login` (backend `265ffbf`); the panel uses that and the
widget code is gone.
