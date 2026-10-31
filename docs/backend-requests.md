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

`src/admin/api/missing.ts` lists the endpoints of open entries that a screen
waits on; the panel shows "Tez orada" for those until they ship. R18 is a
correction to fields that already exist, so nothing waits on it there.

### R18 — Booking amounts that add up in the owner's and admin's views, for every booking

**What's needed**
Since the one-player-price change (`057ac44`), a booking's `price` in the owner and
admin views is the player price D, but on bookings that keep the old accounting —
those made before changeset 040 and **every game booking** (`GameService` and
`TeamGameService` create them with `pricing_model = net`) — `paidAmount` and
`remainingAmount` are still the stored **net** amounts. So `paidAmount +
remainingAmount ≠ price`, the owner's "Naqd olinadi" is a different figure from
the remainder the player sees, and `pricingModel` is in no response, so the client
cannot tell which case it has (api-reference Q19). The client must not convert
between them itself.

**Which screen needs it**
Admin panel, Bronlar: the "Toʻlangan" column ("55 000 / 155 000") and the side
panel's Qolgan summa. Mini App owner mode: the owner's bookings ("Naqd olinadi").

**Proposed endpoint**
No new endpoint. On `BookingResponse` (owner and admin views) and
`AdminBookingResponse`, either:

| Field | Type | Notes |
|---|---|---|
| `paidAmount`, `remainingAmount` | number (tiyin) | in the same terms as `price` for **every** booking, so `paidAmount + remainingAmount = price` |

or, if old bookings must keep their net figures, add:

| Field | Type | Notes |
|---|---|---|
| `pricingModel` | `"player_price"` \| `"net"` | so the panel can label the figures, e.g. show `ownerPrice` against net amounts |

Error cases — none.

**Priority**
Medium — game bookings and old bookings show paid and remaining amounts that
don't match their price; new ordinary bookings are right.

---

## Done

In the order they were asked for, by priority. Each entry keeps its original contract; **Shipped as** notes
where the backend differs from it — the backend is what counts, and
`docs/api-reference.md` documents it.

### R15 — Bookings and games for the admin panel _(shipped in `642a274`)_

**Shipped as** — Shipped as asked, in the card-fee model: `price` is the card price, with `netPrice`, `cardFee`, `remainderByCard` and `remainderInCash` alongside; `paidAmount` and `remainingAmount` are net; `paidInApp` is gross (card fee included). The games `userId` filter also matches team leaders; `participants` and `serviceFeePerPerson` also come on open games; a team's `players` leave out cancelled ones. Unknown `status` values are not rejected (an empty page) — api-reference Q16.

**What's needed**
The admin "Bronlar" page lists every booking and every game, with filters, and
opens one in a side panel with its payment summary and status history. The
user page lists one user's bookings. The backend has only the player's own
lists (`/api/bookings`, `/api/games/my`) and the owner's per-stadium list —
nothing an admin can call.

**Which screen needs it**
Admin panel — Bronlar (both tabs and the side panel); the user page's Bronlar
tab.

**Proposed endpoint**
`GET /api/admin/bookings` — admin · paged — newest `startsAt` first.

| Query | Type | Required | Validation |
|---|---|---|---|
| `search` | string | no | client name or phone: the booking user's name/phone, or a walk-in's `clientName`/`clientPhone` (case-insensitive, spaces ignored in phones) |
| `stadiumId` | UUID | no | |
| `status` | string | no | a `booking.status` value (§1.9) |
| `from`, `to` | `LocalDate` | no | Tashkent days on `startsAt`, both inclusive; `to` ≥ `from` |
| `userId` | UUID | no | bookings this user made |
| `page`, `size` | number | no | |

Response — `AdminBookingResponse`: every `BookingResponse` field (§5) plus:

| Field | Type | Notes |
|---|---|---|
| `userName`, `userPhone` | string? | the booking user (absent on a walk-in) |
| `paidInApp` | number **(tiyin)** | card payments kept on this booking (`PAID`/`CAPTURED`, minus refunds) |
| `cashReceived` | number? **(tiyin)** | cash the owner marked as received; absent when none |
| `cashReceivedAt` | string? (UTC) | when the owner marked it |

`GET /api/admin/bookings/{id}` — admin — one `AdminBookingResponse`.
The status timeline comes from the audit log (`GET /api/admin/audit-log?entityType=booking&entityId=…`),
which already records every step.

`GET /api/admin/games` — admin · paged — newest `startsAt` first. Same
`search` (creator or either team's name), `stadiumId`, `status` (a
`game.status` value), `from`, `to`, `userId` (games the user created or played
in), `page`, `size`.

Response — `AdminGameResponse`: `id`, `type`, `status`, `stadiumId`,
`stadiumName`, `startsAt`, `endsAt` (UTC), `totalPrice` **(tiyin)**,
`creatorId`, `creatorName`, `teamAName`?, `teamBName`? (absent while waiting
for an opponent), `currentPlayers`?, `maxPlayers`?, `bookingId`?,
`cancelledAt`?, `cancellationReason`?, `createdAt`.

`GET /api/admin/games/{id}` — admin — `AdminGameResponse` plus:

| Field | Type | Notes |
|---|---|---|
| `teams` | `GameTeamResponse[]`? | `team_vs_team` only — the §9 shape (`feeAmount`, `advanceAmount`, `remainderAmount`, `remainderStatus`, `paidInApp`…) plus `players: { userId, userName, status }[]` |
| `participants` | `{ userId, userName, status }[]`? | casual and open games |
| `serviceFeePerPerson` | number? **(tiyin)** | casual games |

No chat and no actions: these are read-only views.

Error cases — 400 `"to must be on or after from"`, `"Invalid id"`; 404
`"Booking not found"` / `"Game not found"`.

**Priority**
High — the Bronlar page has no data without it.

### R16 — Payments for the admin panel: list, detail and a period summary _(shipped in `58274e1`)_

**Shipped as** — Shipped with R6. The summary adds `cardFees` (`ownerPayouts + platformRevenue + cardFees = appRevenue`); rows add `cardFee` and `providerCommission`; `commissionPercent` may be absent and `refundedManually` is present only when true; `linkedPayments` are oldest first; 400 `"Invalid type"` / `"Invalid status"` / `"Invalid method"`.

**What's needed**
The admin "Toʻlovlar" page shows every payment and refund with how it was
split between the owner and the platform, opens one with its history and
linked payments, and sums a period (today / this week / this month / a range).
Everything needed is in `payments` (`amount`, `owner_amount`,
`platform_amount`, `commission_percent`, `method`, `provider`,
`provider_txn_id`, `status`, `refund_of_payment_id`) but no admin endpoint
reads it. The summary must be the backend's own figures — the frontend must
not add up payments itself.

**Which screen needs it**
Admin panel — Toʻlovlar: summary cards, tabs Barchasi / Qaytarishlar /
Ushlab turilgan, filters, the table and the side panel.

**Proposed endpoint**
`GET /api/admin/payments` — admin · paged — newest first; with
`type=refund`, **failed refunds first**, then newest.

| Query | Type | Required | Validation |
|---|---|---|---|
| `search` | string | no | payer name or phone, or `providerTxnId` (case-insensitive, spaces ignored in phones) |
| `type` | string | no | a `payment.paymentType` value (§1.9) |
| `status` | string | no | a `payment.status` value |
| `method` | string | no | `card` \| `cash` |
| `stadiumId` | UUID | no | the booking's or game's stadium |
| `from`, `to` | `LocalDate` | no | Tashkent days on `createdAt`, both inclusive |
| `page`, `size` | number | no | |

Response — `AdminPaymentResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `createdAt` | string (UTC) | |
| `userId`, `userName`, `userPhone` | UUID? / string? | the payer |
| `paymentType` | string | |
| `stadiumId`, `stadiumName` | UUID? / string? | |
| `bookingId`, `gameId` | UUID? | what it paid for |
| `amount`, `ownerAmount`, `platformAmount` | number **(tiyin)** | negative on a refund |
| `commissionPercent` | number | in force when it was taken |
| `method`, `provider` | string | |
| `providerTxnId` | string? | absent for cash |
| `status` | string | |
| `refundReason` | string? | |
| `refundOfPaymentId` | UUID? | on a refund: the payment it gives back |
| `failureReason` | string? | R17 |
| `refundedManually`, `manualRefundReason` | boolean? / string? | R17 |

`GET /api/admin/payments/{id}` — admin — `AdminPaymentResponse` plus
`linkedPayments: { id, paymentType, amount, status, method, providerTxnId?, createdAt }[]`
— a refund's original, or an original's refunds. The status history comes
from the audit log (`entityType=payment`), which already records
`PAYMENT_COMPLETED`, `PAYMENT_RELEASED` and `REFUND_CREATED`.

`GET /api/admin/payments/summary?from=&to=` — admin — Tashkent days, both
required, `to` ≥ `from`. All **tiyin**, all present:

| Field | Type | Notes |
|---|---|---|
| `appRevenue` | number | card payments kept (`paid`, `captured`, `completed`) in the period, minus card refunds in the period. **Cash excluded.** |
| `platformRevenue` | number | the `platformAmount` part of the same |
| `ownerPayouts` | number | the `ownerAmount` part of the same |
| `refunded` | number | refunds completed in the period, as a positive amount |
| `held` | number | everything currently `held` (not limited to the period) |

Error cases — 400 `"to must be on or after from"`, `"from and to are required"`,
`"Invalid id"`; 404 `"Payment not found"`.

**Priority**
High — the Toʻlovlar page has no data without it; R6 (revenue misses card
payments) should be fixed in the same pass so the overview agrees with it.

### R17 — Failed refunds: record them, retry them, or mark them refunded by hand _(shipped in `4725675`)_

**Shipped as** — Shipped with R8. Extra messages `"reason is required"`, `"reason must be at most 500 characters"`; a declined retry is also audited `REFUND_RETRIED`; `REFUND_FAILED` is logged on the original payment.

**What's needed**
Today a refund cannot fail: `PaymentService.refundInFull` calls
`paymentProvider.refund(...)` and saves the refund row as `refunded`; if ATMOS
throws, the whole cancellation rolls back. Money owed to a player then has no
record at all. The panel needs a refund that the provider declined to be saved
as **failed** with the provider's error, shown to admins (R8 counts them), and
two ways out.

**Which screen needs it**
Admin panel — Toʻlovlar, the side panel of a failed refund: the ATMOS error,
"Qayta urinish" and "Qoʻlda qaytarildi". Also the overview tile and the
sidebar badge (R8).

**Proposed change**
- A refund whose provider call fails is saved with `status = failed` and
  `failure_reason` (the provider's message, e.g.
  `"Transaction declined by issuer (code 57)"`); the cancellation itself goes
  ahead. Audit `REFUND_FAILED` (SYSTEM) with the reason.
- New columns: `payments.failure_reason`, `refunded_manually` (boolean),
  `manual_refund_reason`, `manual_refund_by` (admin user id).

`POST /api/admin/payments/{id}/retry-refund` — admin — no body. Calls the
provider again for a `failed` refund.

Response — `AdminPaymentResponse`: `status: "refunded"` on success (the original
payment becomes `refunded`, audit `REFUND_RETRIED` by the admin), or still
`failed` with the new `failureReason` — a decline is a normal answer, not an
error. `message: "Refund retried"`.

`POST /api/admin/payments/{id}/mark-refunded` — admin — for money returned
outside the platform (cash, bank transfer).

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | string | yes | 10–500 characters — `"reason must be at least 10 characters"` |

Response — `AdminPaymentResponse` with `status: "refunded"`,
`refundedManually: true`, `manualRefundReason`; the original becomes
`refunded`; audit `REFUND_MARKED_MANUAL` by the admin with the reason.
`message: "Refund marked as refunded"`.

Error cases (both) — 400 `"Only a failed refund can be retried"` /
`"Only a failed refund can be marked as refunded"`; 404 `"Payment not found"`;
502 `"Payment provider unavailable"` when ATMOS cannot be reached at all (retry
only).

**Priority**
High — without it, a failed refund is invisible and the money is not returned.

### R8 — Failed refunds: a count for the sidebar and the overview _(shipped in `4725675`)_

**Shipped as** — Shipped as asked, with R17.

**What's needed**
The admin panel shows a red badge on "Toʻlovlar" and a to-do tile
"Muvaffaqiyatsiz qaytarishlar" (with "eng eskisi 3 soat oldin") when a refund
failed at the provider and needs an admin. Today the backend has **no failed
refund at all**: `PaymentService.refundInFull` calls
`paymentProvider.refund(...)` and writes the refund row straight as
`refunded`; a provider error throws and rolls the whole cancellation back.
This request needs the failure state from **R17** (refund rows that can end
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

### R6 — Admin revenue figures ignore card payments _(shipped in `58274e1`)_

**Shipped as** — Every revenue figure now comes from one `RevenueService`: card money kept, cash excluded, refunds taken off when they complete.

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

### R9 — Everything an admin needs to review a stadium, for any status _(shipped in `9f4040a`)_

**Shipped as** — Rows also carry `price` (by card) and `statusReason`; `pricePerHour` is net. The detail is in the owner's prices (`pricePerHour`, `minBookingAmount` and the pricing rules net, `price` by card), not the public card prices; `cancellationHours` comes both at the top level and in `cancellationPolicy`.

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

### R11 — Owner legal details and the ATMOS contract _(shipped in `14ed7ec`)_

**Shipped as** — `tin` is 9 digits, or the 14-digit PINFL (JShShIR) for `self_employed` — `"tin must be 9 digits (or 14 for self-employed)"`; `legalType` and `tin` may be absent on rows carried over by changeset 037; the PUT replaces the whole record. Approval needs the contract signed **and** a recipient id, and the check also applies when un-blocking.

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

### R1 — CORS for production _(shipped in `e2f5f67`)_

**Shipped as** — CORS for `/api/**` from `CORS_ALLOWED_ORIGINS`, off by default.

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

### R10 — A `rejected` stadium status _(shipped in `6916301`)_

**Shipped as** — `rejected` only from pending, as asked; `blocked` is accepted from any status (api-reference Q17). The pattern message is `"status must be approved, blocked, pending or rejected"`. The panel now sends `rejected` for "Rad etish".

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

### R13 — Role and status filters on the user list _(shipped in `3170f75`)_

**Shipped as** — Shipped as asked.

**What's needed**
`GET /api/admin/users` takes only `?search=` (name or phone). The users page
filters by role (player / owner / admin) and by status (active / blocked); with
1 000+ users that has to happen on the server.

**Which screen needs it**
Admin panel — Foydalanuvchilar list, "Rol" and "Holat" filters.

**Proposed endpoint**
`GET /api/admin/users` — admin · paged — two new optional query parameters,
combined with `search` by AND:

| Query | Type | Required | Validation |
|---|---|---|---|
| `role` | string | no | `player` (neither owner nor admin) \| `owner` (`is_owner`) \| `admin` (`is_admin`) |
| `status` | string | no | `active` (`is_blocked = false`) \| `blocked` |

Response — unchanged (`AdminUserResponse` page, newest first).

Error cases — 400 `"Invalid role"` / `"Invalid status"`.

**Priority**
Medium — search works; the filters are a convenience until the list grows.

### R4 — Daily booking counts for the overview chart _(shipped in `5da70c6`)_

**Shipped as** — Shipped as the separate `GET /api/admin/stats/bookings-daily`; `/stats/revenue` now also sends every day and its `bookingCount` uses the same numbers.

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

### R3 — Previous-period figures for the overview KPIs _(shipped in `fce0dc6`)_

**Shipped as** — Shipped as the four previous-period fields; the panel works out the percentage. `approvedStadiumsWeekAgo` is rebuilt from the audit log, so status changes from before changeset 029 are not counted.

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

### R5 — New users over the last 7 days _(shipped in `6c5029d`)_

**Shipped as** — Shipped as asked.

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

### R12 — Internal notes on a stadium _(shipped in `cd86fd4`)_

**Shipped as** — Shipped as asked; `authorName` falls back to `"Admin"` when the admin has no name.

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

### R14 — A user's teams, and an owner's stadiums _(shipped in `23f85e0`)_

**Shipped as** — Shipped as asked.

**What's needed**
The user page has a "Jamoalar" tab (only when the user is in a team) and, for
owners, a "Maydonlar" tab. `GET /api/teams/me` exists only for the caller, and
`GET /api/admin/stadiums` cannot filter by owner.

**Which screen needs it**
Admin panel — the user page, Jamoalar and Maydonlar tabs.

**Proposed endpoint**
`GET /api/admin/users/{id}/teams` — admin — not paged:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | the team |
| `name` | string | |
| `leaderName` | string? | |
| `memberCount` | number | |
| `role` | string | this user's role in it: `leader` \| `member` |

`GET /api/admin/stadiums?ownerId={uuid}` — admin · paged — one new optional
query parameter on the existing list; response unchanged.

Error cases — 400 `"Invalid id"`; 404 `"User not found"`.

**Priority**
Low — the user page works without them.

### R7 — Remove `POST /api/admin/me/password` _(shipped in `40bdbd2`)_

The endpoint, `ChangePasswordRequest` and `AdminAuthService.changePassword`
are gone. `password_changed_at` and the `TOKEN_REVOKED` check remain, so a
reset in the database still ends every session.

### R2 — Telegram Login Widget login for the admin panel _(withdrawn)_

Asked for `POST /api/auth/telegram-widget` so admins could sign in with the
Telegram Login Widget. Superseded by username + password sign-in,
`POST /api/auth/admin/login` (backend `265ffbf`); the panel uses that and the
widget code is gone.
