# MiniPolya Backend API Reference

Generated for the frontend from the backend source. **Do not hand-edit to add
endpoints or fields that are not in the backend** — regenerate from the source
when the backend changes.

| | |
|---|---|
| Backend repository | `../minipolyaBackend` |
| Branch | `fix/one-player-price` — **not on `main` yet** (`main` is `c855af6`, the merge of `feature/admin-login-impl`, the same tree as `00d3bb7`) |
| Commit | `9e9acb5` (_Payments: lock and re-check before any reverse, never reverse twice_, 2026-11-05; was `5cc6ef6` — R38 owner dashboard) |
| Generated | 2026-10-27; updated 2026-10-28 for `bba7504..12e3a91` (error codes, admin password login, token revocation) and `12e3a91..ed5dec6` (structured audit log, own-password endpoint removed, 404/405 for unknown paths); updated 2026-10-31 for `ed5dec6..00d3bb7` (card fee and card prices, ATMOS provider and reconciliation, new payment statuses, admin bookings/games/payments, failed refunds, stadium review detail + district + `rejected` status + notes, owner legal details, user filters and teams, overview stats, CORS); updated 2026-10-31 for `00d3bb7..d2c55a2` (one player price: owner's own price + playerPrice, breakdown fields removed from player views, booking commission removed, admin atmosFee/ownerReceives); updated 2026-11-01 for `d2c55a2..4d5faf0` (a booking is exactly one hour; R18 owner/admin booking amounts; R19 dev-only sign-in; R20 profile first/last name and phone; R21 blocked-account reason; R22 new users in Uzbek; R23 district filter, cover photo and `isFavorited` on the list, rating on the detail, slot `status`); updated 2026-11-01 for `4d5faf0..ed403c7` (Telegram bot steps 1–6: **no `/api` endpoint or DTO changed**, but the audit API now returns the new action code `PHONE_SHARED_VIA_BOT`; bot notes in §2, §3 and Webhooks); updated 2026-11-02 for `ed403c7..253f585` (R26: the dev-profile sign-in requires `X-Dev-Login-Key` = `DEV_LOGIN_KEY`, missing or wrong → 404 `"Not found"`, and the `dev` profile refuses to start without a 16+ character key; no other endpoint, DTO or audit code changed); updated 2026-11-05 for `253f585..5cc6ef6` (R42 `POST`/`GET /api/owner/stadiums` open to any signed-in user; R35 `GET /api/owner/stadiums/{id}`; R36 stadium photo upload/delete/reorder and public `GET /api/uploads/**`; R37 `POST /api/owner/bookings/{id}/cash`; R39 `GET /api/owner/legal-details`; R41 `clearMinBookingAmount`; R43 owner revenue `?days=7|30`, every day; R32 team invite links, changeset 043 `teams.invite_code`; R38 owner bookings `?unpaid=true` and nine paid-in-app/cash/outstanding stats fields; new global 409/413/415 answers); updated 2026-11-05 for `5cc6ef6..9e9acb5` (the fake payment provider answers like ATMOS; card binding errors with a `code` and `POST /api/cards/resend`; the card mask `8600 •••• •••• 1234` and `maskedPhone` `+998 ** *** ** 58`; 502 when the payment provider is unreachable; team join: leader only, the server picks the side, each step committed, 202 `PAYMENT_PENDING`; dev-only `GET /api/dev/fake-payments`) |
| Endpoints documented | **121** callable by the frontend, plus 3 webhooks and 3 dev-profile-only endpoints (§2, §7.1) |

---

## 1. Conventions

### 1.1 Base URL

The backend listens on port **8080** (`server.port` in `application.yaml`) and
every path below is absolute from the host root. The frontend takes the host
from `VITE_API_URL`, e.g. `VITE_API_URL=http://localhost:8080`.

**CORS** (since `e2f5f67`): off by default — no CORS headers, so only
same-origin pages (or the Vite dev proxy) can call the API. Setting
`CORS_ALLOWED_ORIGINS` (comma-separated exact origins, never `*`) enables it
for `/api/**`: methods `GET POST PUT PATCH DELETE OPTIONS`, headers
`Authorization`, `Content-Type`, no credentials, preflight cached 3600 s,
answered before authentication. `/webhooks/**` never has CORS.

### 1.2 The response envelope

Every endpoint — success or error — answers with the same wrapper
(`dto/response/ApiResponse.java`):

```json
{
  "success": true,
  "data": { },
  "message": null
}
```

```json
{
  "success": false,
  "data": null,
  "message": "Slot is already booked"
}
```

| Field | Type | Notes |
|---|---|---|
| `success` | `boolean` | `true` on a success, `false` on every error — **and on the one 2xx that is not a success**, 202 `PAYMENT_PENDING` (below) |
| `data` | `T \| null` | the payload; `null` on an error, and `null` on endpoints that return nothing |
| `message` | `string \| null` | human-readable; `null` on a plain success, always set on an error |
| `code` | `string`? | machine-readable; **present only on the few errors that carry one** (table below), absent everywhere else |

`success`, `data` and `message` are always present. `code` is
`@JsonInclude(NON_NULL)` and so far is sent only by these errors
(`exception/CodedApiException.java` and `config/JwtAuthFilter.java`):

| `code` | Status | `data` | Where |
|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | — | `POST /api/auth/admin/login` |
| `ACCOUNT_LOCKED` | 423 | `{ minutesRemaining }` | `POST /api/auth/admin/login` |
| `TOO_MANY_ATTEMPTS` | 429 | `{ minutesRemaining }` | `POST /api/auth/admin/login` |
| `ACCOUNT_BLOCKED` | 403 | `{ reason?, blockedAt? }` | **any** authenticated request (`JwtAuthFilter`), `POST /api/auth/telegram`, `POST /api/auth/admin/login` — `data` from the latest `USER_BLOCKED` audit entry: the reason as the admin typed it (absent when none) and when (UTC); either may be absent |
| `TOKEN_REVOKED` | 401 | — | **any** authenticated request (§1.5) |
| `PHONE_TAKEN` | 409 | — | `PATCH /api/users/me` — the phone belongs to another account |
| `CARD_NOT_SUPPORTED`, `CARD_EXPIRY_INVALID`, `CARD_EXPIRED`, `SMS_CODE_WRONG`, `SMS_CODE_EXPIRED`, `SMS_RESEND_TOO_EARLY`, `SMS_RESEND_UNAVAILABLE`, `BINDING_NOT_FOUND`, `CARD_BINDING_FAILED` | 400 | — | `POST /api/cards`, `/api/cards/resend`, `/api/cards/confirm` (`CardBindingException`, since `9e9acb5`) — §7.1 |
| `PAYMENT_PENDING` | **202**, `success: false` | — | `POST /api/games/{id}/join` (team game): paid, the other team's capture has no clear answer yet (`PaymentPendingException`) — §9 |

A 202 `PAYMENT_PENDING` is a **2xx with `success: false`**: a client that only
checks `response.ok` would read it as a success with `data: null`. Check
`success` (the Mini App's client throws an `ApiError` with status 202 and the code).

Everywhere else the frontend still branches on the **HTTP status** plus, where
it has to, the exact `message` string — see
[Questions about the backend](#11-questions-about-the-backend) — Q1.

### 1.3 Null fields are omitted

Most response DTOs carry `@JsonInclude(JsonInclude.Include.NON_NULL)`, so a
field whose value is null is **absent from the JSON** rather than present as
`null`. TypeScript types for these should mark such fields optional
(`field?: T`), not `T | null`.

DTOs **without** `NON_NULL` (every field always present): `ApiResponse`,
`PageResponse`, `AuthResponse`, `PhotoResponse`, `AmenitiesResponse`,
`CancellationPolicyResponse`, `SavedCardResponse`, `CardBindingResponse`,
`UnreadCountResponse`, `OwnerDashboardStatsResponse`, `OwnerRevenueResponse`,
`OwnerScheduleResponse`, `PlatformSettingsResponse`,
`AdminPlatformStatsResponse`.

### 1.4 The paginated list shape

Endpoints marked _paged_ put this in `data` (`dto/response/PageResponse.java`):

```json
{
  "content": [ ],
  "page": 0,
  "size": 20,
  "totalElements": 156,
  "totalPages": 8
}
```

| Field | Type |
|---|---|
| `content` | `T[]` |
| `page` | `number` (0-based) |
| `size` | `number` |
| `totalElements` | `number` (long) |
| `totalPages` | `number` |

Every paged endpoint takes `?page=` (default `0`) and `?size=` (default `20`).
`page < 0` or `size < 1` is **400** `"page must be 0 or greater"` /
`"size must be 1 or greater"` (`util/Pagination.java`). There is no `sort`
query parameter — each endpoint's order is fixed in its controller and is
listed per endpoint below.

### 1.5 How the JWT is sent

```
Authorization: Bearer <token>
```

`config/JwtAuthFilter.java` reads that header on every request. The token is
HS256, expires after **24 h** (`app.jwt.expiration-ms = 86400000`), and carries
`sub` = user id (UUID), `phone`, `isOwner`, `isAdmin`, and `iatMs` (issue
time in milliseconds, used for revocation below).

Two things the frontend must handle:

- The filter **reloads the user from the database on every authenticated
  request**. A user an admin has just blocked gets **403 `"Account is blocked"`**
  immediately, on any endpoint, even with a still-valid token.
- If the token names a user that no longer exists, the request proceeds as
  **unauthenticated** (so a protected endpoint answers 401, not 403).
- A token issued before the user's last password change
  (`users.password_changed_at`) is refused on **any** endpoint with
  **401, `code: "TOKEN_REVOKED"`**, message `"Session ended because the
  password was changed; sign in again"`. Only admins have passwords, so only
  admin tokens are ever revoked — in practice when a password is **reset in the
  database** (`password_changed_at = now()`, backend `CLAUDE.md`, "Admin
  accounts"). The admin panel answers it by going to the login page.

### 1.6 Access levels

`config/SecurityConfig.java`:

| Level | How it is enforced |
|---|---|
| **public** | `/api/auth/**`, `GET /api/stadiums/**`, `GET /api/reviews/stadium/**`, `GET /api/uploads/**` (uploaded stadium photos, R36), `/webhooks/**` |
| **user** | any other path — a valid JWT is required; also exactly `POST /api/owner/stadiums` and `GET /api/owner/stadiums` (no sub-paths, R42) |
| **owner** | the rest of `/api/owner/**` → requires `ROLE_OWNER` (the `isOwner` claim) |
| **admin** | `/api/admin/**` → requires `ROLE_ADMIN` (the `isAdmin` claim) |

Roles come from the **JWT claims**, not from the live database row — so a user
promoted to owner or admin keeps the old role until they obtain a new token
(the Mini App must re-run `POST /api/auth/telegram`). Beyond the path rule,
most endpoints re-check ownership against the database and answer
403 `"You do not own this stadium"` / `"This … does not belong to you"`.

### 1.7 Shared error cases

These apply to every endpoint and are not repeated below.

| Status | `message` | When |
|---|---|---|
| 400 | `"Malformed request body"` | body is absent or not valid JSON |
| 400 | `"Invalid id"` | a path or query id is not a valid UUID |
| 400 | `"<field>: <constraint message>"`, comma-joined | bean validation failed on `@Valid`; e.g. `"rating: must be less than or equal to 5"` |
| 401 | `"Authentication required"` | no/invalid token on a protected endpoint |
| 401 | `"Session ended because the password was changed; sign in again"`, `code: "TOKEN_REVOKED"` | token predates the user's last password change (§1.5) |
| 403 | `"Access denied"` | valid token, wrong role for `/api/owner/**` (except the two R42 paths, §1.6) or `/api/admin/**` |
| 403 | `"Account is blocked"`, `code: "ACCOUNT_BLOCKED"`, `data: { reason?, blockedAt? }` | the user is blocked (§1.2) |
| 404 | `"<Thing> not found"` | `ResourceNotFoundException` |
| 404 | `"Not found"` | no endpoint serves the path |
| 405 | `"Method not allowed"` | the path exists but not with this method |
| 409 | `"Data conflict"` | a database constraint other than the booking overlap |
| 409 | the endpoint's own message | `ConflictException` (since `5cc6ef6`: the owner's cash while a card payment is in flight, §5; joining a team already joined, §8) |
| 400 | `"file is required"` | a multipart request without its `file` part, or a broken multipart body (photo upload, §4) |
| 413 | `"File too large"` | an upload over 10 MB (`spring.servlet.multipart.max-file-size`, or the service's own check) |
| 415 | `"Unsupported media type"` | a body type the endpoint does not take (e.g. JSON to the photo upload) |
| 410 | `"Booking has expired"` | `BookingExpiredException` |
| 502 | `"To'lov tizimi vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring"` (Uzbek, like Q7) | since `9e9acb5`: the payment provider could not be reached (HTTP 5xx, or ATMOS `STPIMS-ERR-024/-026/-041/-094/-102`) while **creating** a charge or hold, or on any card-binding call. **Nothing was charged, held or bound** — the request may simply be sent again. Not a decline. Any card call: `POST /api/cards`, `/resend`, `/confirm`, `POST /api/bookings`, the two `pay-remainder`s, `POST /api/games` (team), `POST /api/games/{id}/join` (team) |
| 502 | `"Payment provider unavailable"` | admin refund retry only (§10.9) |
| 500 | `"Internal server error"` | anything unhandled |

Source: `exception/GlobalExceptionHandler.java`.

### 1.8 Types on the wire

| Backend type | JSON | Example |
|---|---|---|
| `UUID` | string | `"018f3a2c-...-9b21"` (UUID v7, so roughly time-ordered) |
| `OffsetDateTime` | ISO-8601 string, **UTC** | `"2026-11-02T15:00:00Z"` |
| `LocalDate` | string | `"2026-11-02"` |
| `LocalTime` | string | `"09:00:00"` |
| `Long` money | number, **tiyin** | `15000000` = 150 000 so'm |
| `BigDecimal` lat/lng | number | `41.311081` |
| enum | **lowercase** string | `PARTIALLY_PAID` → `"partially_paid"` |

- **Money is always tiyin** (1 so'm = 100 tiyin). Every money field below is
  marked _(tiyin)_. Never render a raw tiyin number.
- **Timestamps are always UTC** and marked _(UTC)_. Convert to
  `Asia/Tashkent` for display only.
- `dayOfWeek` is **0 = Monday … 6 = Sunday** everywhere (not JS's
  `Date.getDay()`, where 0 = Sunday).
- Enums with `@JsonValue` serialize lowercase, and parse case-insensitively on
  the way in. Fields typed as plain `String` in the entity (`booking.status`,
  `game.status`, `game.type`, `stadium.status`, `stadium.format`,
  `stadium.surfaceType`) are already lowercase snake_case strings.
- `boolean` fields prefixed `is…` are sent with the prefix via
  `@JsonProperty`: `isOwner`, `isAdmin`, `isActive`, `isBlocked`, `isWalkin`,
  `isPublic`, `isRead`, `isFavorited`, `sentViaTelegram`.

### 1.9 Status and enum values

| Enum | Values on the wire |
|---|---|
| `booking.status` | `pending`, `confirmed`, `completed`, `expired`, `cancelled_by_user`, `cancelled_by_owner`, `cancelled_opponent_left` |
| `booking.paymentStatus` | `unpaid`, `partially_paid`, `paid` |
| `booking.source` | `app`, `manual`, `game` |
| `stadium.status` | `pending`, `approved`, `rejected`, `blocked` — `rejected` = turned down at review (only from `pending`, changeset 038); `blocked` = taken off by an admin. Players only ever see `approved` |
| `stadium.district` | `Bektemir`, `Chilonzor`, `Mirobod`, `Mirzo Ulugʻbek` (U+02BB, not an apostrophe), `Olmazor`, `Sergeli`, `Shayxontohur`, `Uchtepa`, `Yakkasaroy`, `Yangihayot`, `Yashnobod`, `Yunusobod` — exact strings (`util/Districts`), optional |
| `stadium.format` | `5x5`, `7x7`, `9x9`, `11x11` |
| `stadium.surfaceType` | `natural`, `artificial`, `hybrid` |
| `game.type` | `casual`, `open`, `team_vs_team` |
| `game.status` | `open`, `confirmed`, `completed`, `cancelled_slot_taken`, `cancelled_by_creator`, `cancelled_not_filled` |
| `gameParticipant.side` | `a`, `b` |
| `gameParticipant.status` | `joined`, `paid`, `cancelled`, `refunded` |
| `gameTeam.remainderStatus` | `unpaid`, `paid` |
| `payment.paymentType` | `booking`, `remainder`, `team_game`, `game_share`, `service_fee`, `refund` |
| `payment.method` | `card`, `cash` |
| `payment.provider` | `atmos`, `payme`, `click`, `cash` |
| `payment.status` | `processing`, `return_pending`, `capture_pending`, `refund_failed`, `held`, `captured`, `released`, `paid`, `refunded`, `failed`, `pending`, `completed` — see below |
| `ownerApplication.status` | `pending`, `under_review`, `approved`, `rejected` |
| `ownerLegalDetails.legalType` | `yatt` (YaTT), `mchj` (MChJ), `self_employed` (oʻzini oʻzi band qilgan) |
| `ownerLegalDetails.atmosContractStatus` / `ownerContractStatus` | `none`, `pending`, `signed` |
| admin user filter `role` / `status` (query only) | `player` (neither owner nor admin), `owner`, `admin` / `active`, `blocked` — case-insensitive |
| `adminUserTeam.role` | `leader`, `member` (plain string) |
| `notification.type` | `booking_confirmed`, `booking_cancelled`, `booking_reminder`, `booking_expired`, `game_confirmed`, `game_cancelled`, `game_player_joined`, `game_player_left`, `game_payment_received`, `game_opponent_left`, `review_reply`, `stadium_approved`, `stadium_rejected`, `owner_application_status`, `promotion_new` |
| `notification.referenceType` | `booking`, `game`, `stadium`, `review`, `application` |
| `paymentOption` (request) | `MINIMUM`, `FULL` — **uppercase**, unlike the response enums |
| `teamMember.role` | `leader`, `member` (plain string) |

`game.status = open` means "waiting"; for a `team_vs_team` game it means one
team is waiting for an opponent and **the pitch is not booked yet**. The value
was deliberately not renamed because casual games share the column.

**Payment statuses** (`entity/Payment.java`; a status only moves forward):

| Status | Meaning |
|---|---|
| `processing` | the row is written and the provider called, but its answer is not in (or was lost); the reconcile job settles it within minutes. **Never assume it failed** |
| `paid` | a card charge (or cash) that went through |
| `held` → `captured` / `released` | a team game's hold, taken or let go |
| `capture_pending` | a hold being taken; the reconcile job finishes it |
| `return_pending` | being given back (a charge reversed or a hold released); the reconcile job finishes it |
| `refunded` | given back in full |
| `refund_failed` | on an **original** payment: ATMOS declined to give it back, the money is still owed; its refund row is `failed` until an admin retries it or marks it refunded by hand (§10.9) |
| `failed` | a declined charge, or a **refund row** ATMOS declined (`failureReason` on the admin view) |
| `pending`, `completed` | legacy Payme/Click hosted checkout only |

### 1.10 The player price (one price)

Since `00d3bb7..d2c55a2` (backend `CLAUDE.md`, "Payments → The player price"):
**the owner enters their own price; players see ONE price.** The owner's price
**N** (`pricePerHour`, pricing rules, `minBookingAmount`) is stored and edited
as typed. Players see and pay **D = playerAmount(N)** — N grossed up by the
ATMOS fee (`cardFeeBps`, default 150 = 1.5%) and rounded up to
`paymentRoundingStep` (§10.9 settings). Players never see the words or fields
"card fee", "commission", "net" or any breakdown. The backend computes every
figure; the client only displays them.

- **The platform takes nothing from ordinary bookings.** Every booking card
  payment — full, deposit or remainder — is all the owner's; ATMOS takes its
  fee from it. Example (step 5 000 so'm): owner price 150 000 → the player
  pays **155 000** → the owner receives **152 675**.
- **Booking:** `FULL` charges D (the slot's player price — a booking is
  exactly one hour); `MINIMUM` charges the deposit
  **d = min(playerAmount(minBookingAmount), D)**. The rest **r = D − d** is the
  **same amount** whether paid in the app or taken by the owner in cash.
  A manual (walk-in) booking is the owner's own price, not converted.
- **Team game, per team:** pays `playerAmount(advance + fee)` on joining; the
  platform's split nets exactly the fee (its only money in a team game), the
  rest is the owner's. A team's remainder is `playerAmount(remainder)`, the
  same in the app or in cash, all the owner's.
- **Friends game, per player:** `playerAmount(pitch share + service fee)`; all
  the owner's unless `casualGameServiceFee > 0`, which is split like the team fee.
- Cash goes to the owner in full. A full refund returns everything paid by card.
- **Old bookings keep `pricing_model = net`** (changeset 040; also every game
  booking): their stored amounts and the old net accounting stay. The field is
  not in any response, and need not be: every booking view converts their
  `paidAmount` / `remainingAmount` to player terms (R18), so `paidAmount +
  remainingAmount = price` for every booking.

**Fields per role** (all tiyin, optional):

| Role | Fields |
|---|---|
| **Player** — public stadium list/detail, availability slots, public pricing rules, the player's own bookings, games and payments | `pricePerHour` (a slot's `originalPrice` too) and a stadium's `minBookingAmount` are **player prices**. A booking's `price` is D, `paidAmount` what was paid of it, `remainingAmount` what is left. `refundIfCancelledNow` is everything paid by card. Games: `totalPrice` is what all players pay together, a friends game's `price` one share, a team's `price` its joining payment and `remainderAmount` its remainder; the challenge board's `amountToPayNow` / `remainderAmount` likewise. **No breakdown field exists** in these views. |
| **Owner** | `pricePerHour` / `minBookingAmount` are the **owner's own** (what they edit), with `playerPrice` / `playerMinBookingAmount` alongside. A booking shows `price` (what the player pays), `ownerPrice`, `paidInApp`, `remainingAmount` (the remainder to collect in cash) and `ownerReceives` (card splits after ATMOS, plus cash). |
| **Admin** | the owner's view, plus `ownerReceives` and `atmosFee` on stadiums, pricing rules and bookings; a team adds `platformFee`, `ownerAdvance`, `ownerRemainder`, `ownerReceives`, `atmosFee`; a payment shows `ownerAmount`, `platformAmount`, `atmosFee` and `providerCommission`. |

Removed everywhere: `cardFee`, `netPrice`, `remainderByCard`,
`remainderInCash`, `price` on stadium / pricing-rule / slot responses, a
team's `feeAmount` / `advanceAmount`, the public game detail's `serviceFeePerPerson`, the player `PaymentResponse` split (`ownerAmount` / `platformAmount` / `commissionPercent`), and the booking commission setting. The
public stadium search's `maxPrice` is a **player** price.

---

## 2. Auth

### `POST /api/auth/telegram` — public

The Mini App's login endpoint. The client posts the raw Telegram Mini App `initData`
string; the server verifies its HMAC-SHA256 signature against the bot token,
finds or creates the user by `telegram_id`, and returns a JWT.

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `initData` | string | yes | `@NotBlank` — `"initData is required"` |

**Response** — `AuthResponse`

| Field | Type |
|---|---|
| `token` | string (JWT) |
| `user` | `UserResponse` (§3) |

**Errors**

| Status | `message` |
|---|---|
| 400 | `"initData: initData is required"` |
| 401 | `"Empty Telegram initData"` |
| 401 | `"Telegram initData is missing hash"` |
| 401 | `"Invalid Telegram signature"` |
| 401 | `"Telegram initData is missing user"` |
| 401 | `"Telegram user has no id"` |
| 401 | `"Malformed Telegram user payload"` |
| 403 | `"Account is blocked"`, `code: "ACCOUNT_BLOCKED"`, `data: { reason?, blockedAt? }` (§1.2) |

**Notes**

- A first-time user is created with `name` from the Telegram first/last name,
  **no phone** (`initData` carries none, so `phone` is absent on the response),
  no `firstName` / `lastName` (only the user sets those, §3) and **`language:
  "uz"` always** — Telegram's `language_code` is ignored (R22). Existing users
  keep their saved language.
- The client must **never** trust `initData` itself — only this endpoint's
  answer. Verification needs `BOT_TOKEN`, which lives only on the server.
- There is **no refresh endpoint and no logout endpoint.** On a 401 the Mini
  App re-posts `initData`; the admin panel has to send the user back to login.
- The admin panel does **not** use this endpoint: admins sign in with a
  username and password (next endpoint).

### Dev-only sign-in — `dev` profile only (R19)

For testing the Mini App in a plain browser, without Telegram `initData`.
`DevAuthController` exists **only under `SPRING_PROFILES_ACTIVE=dev`**: in
every other profile both paths answer 404 `"Not found"`, and the backend
refuses to start with `dev` together with `prod` or `atmos`
(`DevProfileGuard`). Not counted in the endpoint total. The frontend uses
them in dev builds only (`src/miniapp/auth/dev/`).

**Dev login key (R26, since `253f585`).** Both paths require the header
**`X-Dev-Login-Key`**, equal to the backend's `DEV_LOGIN_KEY`
(`app.dev.login-key`); the Mini App's dev build sends it from
`VITE_DEV_LOGIN_KEY` (`.env.local`).

- `DevLoginKeyInterceptor` (dev profile only, on `/api/auth/dev/**`) checks it
  before the controller runs and before the body is read: SHA-256 of both
  values compared in constant time. A **missing, empty or wrong** key answers
  exactly like an unknown path — **404 `"Not found"`** (`NoHandlerFoundException`
  → `GlobalExceptionHandler`), nothing hinting that the endpoints exist. So a
  404 here can mean a wrong/missing key as well as "backend not in the `dev`
  profile"; the response does not tell them apart. `POST /login`'s own 404
  `"User not found"` is only reachable with the right key.
- With `dev` active, the backend **refuses to start** when `DEV_LOGIN_KEY` is
  unset, empty or shorter than **16 characters** (`DevProfileGuard`, and the
  interceptor's constructor does the same check). There is no "key unset →
  open" mode. Outside the `dev` profile the setting is ignored.

- `GET /api/auth/dev/users` — public. The 50 newest users, not paged:
  `{ id: UUID, name: string, isOwner: boolean, isAdmin: boolean, isBlocked: boolean }[]`.
- `POST /api/auth/dev/login` — public. Body `{ "userId": "<uuid>" }` →
  `AuthResponse` (`token`, `user`), the same as `POST /api/auth/telegram`.
  Errors: 400 `"Invalid id"`; 404 `"User not found"`; 403 `ACCOUNT_BLOCKED`
  as §1.2.

### `POST /api/auth/admin/login` — public

The admin panel's only sign-in. Admin accounts (username + BCrypt password
hash) are **created, and their passwords set and reset, only in the database**
(backend `CLAUDE.md`, "Admin accounts") — there is no endpoint to register an
admin or reset a password, and the panel offers neither. Only a user with
`is_admin = true` **and** a password can sign in here.

**Body** (`AdminLoginRequest`)

| Field | Type | Required | Validation |
|---|---|---|---|
| `username` | string | yes | `@NotBlank` `"username is required"`, `@Size(max=64)` `"username must be at most 64 characters"`; trimmed |
| `password` | string | yes | `@NotBlank` `"password is required"`, `@Size(max=200)` `"password must be at most 200 characters"` |

**Response** — `AuthResponse` (`token`, `user`), as for `/api/auth/telegram`;
`user.username` is set.

**Errors** — in the order the backend checks them:

| Status | `code` | `message` | When |
|---|---|---|---|
| 400 | — | validation, as §1.7 | |
| 429 | `TOO_MANY_ATTEMPTS` | `"Juda ko'p urinish. N daqiqadan so'ng qayta urinib ko'ring"`; `data.minutesRemaining` | more than 20 attempts (right or wrong) from one IP in 15 min |
| 401 | `INVALID_CREDENTIALS` | `"Login yoki parol noto'g'ri"` | unknown username, not an admin, no password, or wrong password — deliberately indistinguishable |
| 423 | `ACCOUNT_LOCKED` | `"Hisob vaqtincha bloklandi. N daqiqadan so'ng qayta urinib ko'ring"`; `data.minutesRemaining` | locked; also returned by the 5th wrong password in a row, which locks the account for 15 min |
| 403 | `ACCOUNT_BLOCKED` | `"Account is blocked"` | right password, but the user is blocked |

Messages are Uzbek with a plain apostrophe (`noto'g'ri`), not `ʻ`. Limits are
the defaults in `AppProperties.AdminLogin`.

---

## 3. Users and profile

`UserResponse` (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `phone` | string? | absent for a Telegram-created user who never set one |
| `name` | string | Telegram's name until the user sets `firstName`/`lastName`, then `"<firstName> <lastName>"` |
| `firstName` | string? | **only ever set by the user** (`PATCH /api/users/me`), never from Telegram; absent until then |
| `lastName` | string? | same rule as `firstName` |
| `telegramId` | number? | Telegram's own id, a `long`, **not** a UUID |
| `language` | string | `uz` \| `ru` \| `en` |
| `isOwner` | boolean | |
| `isAdmin` | boolean | |
| `username` | string? | admins who sign in with a password only |
| `createdAt` | timestamp (UTC) | |

### `GET /api/users/me` — user

Returns `UserResponse` for the caller. The source of truth for the live role
flags and for the user's language (which drives the Mini App translation
layer).

**Errors** — 401; 404 `"User not found"`.

### `PATCH /api/users/me` — user

**Body** — every field optional; only non-null values are applied.

| Field | Type | Validation |
|---|---|---|
| `name` | string? | `@Size(min=1, max=120)` — `"name must be between 1 and 120 characters"` |
| `language` | string? | `@Pattern(uz\|ru\|en)` — `"language must be one of: uz, ru, en"` |
| `firstName` | string? | trimmed, 1–60 — 400 `"firstName must be between 1 and 60 characters"` |
| `lastName` | string? | trimmed, 1–60 — 400 `"lastName must be between 1 and 60 characters"` |
| `phone` | string? | `^\+998\d{9}$` — 400 `"phone must be in the format +998XXXXXXXXX"`; unique across accounts |

Setting `firstName` or `lastName` rewrites `name` as `"<firstName> <lastName>"`.
Audited `PROFILE_UPDATED` (the phone itself is never logged, only
`phoneChanged`).

Since `ed403c7` the bot can also set `phone`: a user who shares their contact
with it is audited `PHONE_SHARED_VIA_BOT`. So `GET /api/users/me` may already
carry a phone the user never typed in the Mini App.

**Response** — the updated `UserResponse`.

**Errors** — 400 (validation, messages above); 409 `"Phone is already used by
another account"`, `code: "PHONE_TAKEN"`; 401; 404 `"User not found"`.

---

## 4. Stadiums and availability

`StadiumResponse` — listing summary (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name`, `address` | string | |
| `district` | string? | one of the twelve districts (§1.9); absent on stadiums added before it existed |
| `latitude`, `longitude` | number? | |
| `format`, `surfaceType`, `status` | string | §1.9 |
| `statusReason` | string? | the admin's reason for a `rejected` or `blocked` status — on the owner's endpoints; absent otherwise |
| `pricePerHour` | number **(tiyin)** | public: the **player** price — the one price players pay; owner endpoints: the **owner's own** price, as they set it (§1.10) |
| `playerPrice` | number? **(tiyin)** | **owner/admin responses only**: what players see and pay for that hour |
| `ownerReceives`, `atmosFee` | number? **(tiyin)** | declared "admin responses only", but no endpoint that returns `StadiumResponse` fills them — always absent (the admin list uses `AdminStadiumResponse`, §10.9) |
| `ownerName` | string? | |
| `isActive` | boolean | |
| `averageRating` | number? | absent when the stadium has no reviews |
| `reviewCount` | number? | |
| `coverPhotoUrl` | string? | the stadium's first photo (lowest `position`); absent when it has none |
| `isFavorited` | boolean? | **player lists** (`GET /api/stadiums`, `GET /api/favorites`), for a signed-in caller only |

No photo gallery and no `amenities` — fetch the detail endpoint for those.
Rating, cover photo and favourite flag are loaded for the whole page at once.

`StadiumDetailResponse` (`NON_NULL`) — everything above except
`coverPhotoUrl`, plus:

| Field | Type | Notes |
|---|---|---|
| `ownerId` | UUID | |
| `ownerName`, `ownerPhone` | string? | |
| `phone`, `description` | string? | |
| `openTime`, `closeTime` | time | `"09:00:00"` |
| `minBookingAmount` | number? **(tiyin)** | absent ⇒ the player must pay in full. Public: the deposit as players pay it; owner/admin: the owner's own minimum |
| `playerMinBookingAmount` | number? **(tiyin)** | **owner/admin responses only**: the deposit as players see and pay it |
| `ownerReceives`, `atmosFee` | number? **(tiyin)** | **admin detail only** (§10.9): what the owner receives of one hour at `playerPrice` paid by card, after ATMOS, and what ATMOS takes of it |
| `isFavorited` | boolean? | only present for an authenticated caller |
| `averageRating` | number? | as on the list; absent with no reviews |
| `reviewCount` | number? | `0` when none |
| `cancellationPolicy` | `{ cancellationHours: number }` | |
| `photos` | `{ id: UUID, url: string, position: number }[]` | ordered by `position`; the lowest is the cover. An uploaded photo's `url` is a **relative path** `/api/uploads/stadiums/<stadiumId>/<file>` (R36) — prefix the API base URL (§1.1); photos sent as URLs on create/update keep the URL as sent |
| `amenities` | `AmenitiesResponse` | `parking`, `lighting`, `showers`, `lockerRoom`, `wifi`, `cafe`, `equipmentRental`, `tribune` — all boolean |
| `createdAt`, `updatedAt` | timestamp (UTC) | |

### `GET /api/stadiums` — public · paged

Approved, active stadiums only.

| Query | Type | Required | Notes |
|---|---|---|---|
| `q` | string | no | free text search |
| `format` | string | no | `5x5` \| `7x7` \| `9x9` \| `11x11` |
| `maxPrice` | number (tiyin) | no | upper bound on the **player** `pricePerHour` players see (converted to the largest fitting owner price) |
| `district` | string | no | one of the twelve districts exactly as in §1.9; blank = none |
| `page`, `size` | number | no | `0` / `20` |

**Response** — paged `StadiumResponse`, with `coverPhotoUrl` and, when a JWT
is sent, `isFavorited`.

**Errors** — 400 `"Invalid district"`.

### `GET /api/stadiums/{id}` — public

**Response** — `StadiumDetailResponse`. `isFavorited` is only filled in when a
JWT is sent (the endpoint is public, so the field is simply absent otherwise).

**Errors** — 400 `"Invalid id"`; 404 `"Stadium not found"`.

### `GET /api/stadiums/{stadiumId}/availability` — public

The hourly grid for one day: **every** opening hour with its status, what a
free hour costs, and whether a team is waiting on it.

| Query | Type | Required | Notes |
|---|---|---|---|
| `date` | `LocalDate` (`2026-11-02`) | no | defaults to today (Tashkent) |

**Response** — `AvailabilityResponse`

| Field | Type |
|---|---|
| `stadiumId` | UUID |
| `stadiumName` | string |
| `date` | date |
| `slots` | `TimeSlot[]` |

`TimeSlot` (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `startTime`, `endTime` | time | one-hour slot, Tashkent local time |
| `available` | boolean | true exactly when `status` is `free` |
| `status` | string | `free`; `booked` (a pending or confirmed booking holds it); `closed` (a stadium closure); `past` (today, the hour has started). When several apply: `past`, then `booked`, then `closed` |
| `pricePerHour` | number? **(tiyin)** | the one price the player pays for this hour (§1.10); absent when not available |
| `originalPrice` | number? **(tiyin)** | the player price before the promotion; absent when there is none |
| `discountPercent` | number? | absent when there is no promotion |
| `promotionName` | string? | |
| `hasWaitingGame` | boolean | **`team_vs_team` only** — a team looking for an opponent. Casual games are private and never marked |
| `waitingGameId` | UUID? | |
| `waitingGameType` | string? | |
| `playersJoined`, `playersNeeded` | number? | |

**Errors**

| Status | `message` |
|---|---|
| 400 | `"date cannot be in the past"` |
| 400 | `"date is beyond the 4-week booking window"` |
| 404 | `"Stadium not found"` |

**Notes** — a slot that is free but has `hasWaitingGame: true` can still be
booked outright; doing so cancels that game and refunds the waiting team.

### `GET /api/stadiums/{stadiumId}/pricing` — public

**Response** — `PricingRuleResponse[]` (active rules only; see §10 for the
shape).

### `GET /api/stadiums/{stadiumId}/promotions` — public

**Response** — `PromotionResponse[]` (currently active promotions only; shape
in §10).

### `POST /api/owner/stadiums` — user (any signed-in user, R42)

**Body** — `CreateStadiumRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | yes | `@NotBlank @Size(max=150)` |
| `address` | string | yes | `@NotBlank @Size(max=300)` |
| `district` | string | no | `@Size(max=30)`; one of the twelve districts exactly as in §1.9, else 400 `"Invalid district"`; blank = none |
| `latitude` | number | no | −90 … 90 |
| `longitude` | number | no | −180 … 180 |
| `phone` | string | no | max 20 |
| `description` | string | no | |
| `format` | string | yes | `5x5\|7x7\|9x9\|11x11` |
| `surfaceType` | string | yes | `natural\|artificial\|hybrid` |
| `openTime` | time | yes | `"09:00:00"` |
| `closeTime` | time | yes | treated as a **same-day** bound — `closeTime <= openTime` makes the stadium unbookable |
| `pricePerHour` | number **(tiyin)** | yes | `@PositiveOrZero` |
| `minBookingAmount` | number **(tiyin)** | no | `@PositiveOrZero`, and **≥ 50 000** when set; null ⇒ full payment required |
| `cancellationHours` | number | no | `@PositiveOrZero`; defaults to **24** |
| `photos` | string[] | no | each non-blank, max 500 chars (URLs). To add image files, upload them afterwards with `POST /api/owner/stadiums/{id}/photos` (R36) |
| `amenities` | object | no | the eight booleans |

**Response** — `StadiumDetailResponse` in the owner's own prices (with
`playerPrice`/`playerMinBookingAmount`, §1.10), `message: "Stadium submitted for review"`.
The stadium is created with `status: "pending"` and is invisible to players
until an admin approves it (which needs the owner's signed ATMOS contract,
§10.9).

**Errors** — 400 validation; 400 `"Invalid district"`; 400 `"minBookingAmount must be at least 50000 tiyin (500 so'm)"`; 401.

**Note** — since R42 (`025b302`) this exact path needs only a token, **not**
`ROLE_OWNER`: a player adds their first stadium here and follows its review
with `GET /api/owner/stadiums`. Approval sets `is_owner`, and the user then
needs a **new token** (the flag is a JWT claim, §1.6) for the rest of
`/api/owner/**`, which stays owner-only — including `GET`/`PUT
/api/owner/stadiums/{id}` and the photo endpoints for the stadium just added.

### `PUT /api/owner/stadiums/{id}` — owner

**Body** — `UpdateStadiumRequest`: every field of the create body optional
(only non-null values applied), plus `isActive` (boolean) and
`clearMinBookingAmount` (boolean, R41). `status` is deliberately absent — only
an admin changes it.

An absent `district` leaves it unchanged. A null `minBookingAmount` also leaves
it unchanged; `"clearMinBookingAmount": true` removes it (players then pay in
full; audited like any field). Absent or `false` does nothing.

**Response** — `StadiumDetailResponse` (owner's own prices + `playerPrice`/`playerMinBookingAmount`).

**Errors** — 400 validation / `"Invalid district"` / `"minBookingAmount must be at least 50000 tiyin (500 so'm)"` / `"Send either minBookingAmount or clearMinBookingAmount"` (`clearMinBookingAmount: true` together with a non-null `minBookingAmount`); 403 `"You do not own this stadium"`; 404 `"Stadium not found"`.

### `GET /api/owner/stadiums` — user (any signed-in user, R42)

**Response** — `StadiumResponse[]` (not paged) for the caller, any
status, in the owner's own prices with `playerPrice` alongside; `statusReason` tells the owner why a stadium is
`rejected` or `blocked`. A caller with no stadiums gets `[]`. Like `POST`, this
exact path needs only a token, not `ROLE_OWNER` (R42).

### `GET /api/owner/stadiums/{id}` — owner

One of the caller's stadiums in **any** status (R35) — the same
`StadiumDetailResponse` that `PUT` returns, built by the same code: the owner's
own prices with `playerPrice` / `playerMinBookingAmount`, `status`,
`statusReason`, photos.

**Errors** — 403 `"You do not own this stadium"`; 404 `"Stadium not found"`.

### Stadium photos — owner (R36)

All three work in any stadium status. Each checks ownership (404
`"Stadium not found"`, then 403 `"You do not own this stadium"`), locks the
stadium row (so concurrent uploads cannot pass the limit) and is audited as
`STADIUM_UPDATED` with the `photos` URL list before → after. The photo with
the lowest `position` is the cover (`coverPhotoUrl`).

`PhotoResponse` — `{ id: UUID, url: string, position: number }`.

#### `POST /api/owner/stadiums/{id}/photos` — owner

**Body** — `multipart/form-data` with one part, **`file`**: a JPEG, PNG or
WebP image, at most **10 MB**. The type is told from the file's **magic
bytes**, never from its content type or name. Stored as
`stadiums/<stadiumId>/<random uuid>.<jpg|png|webp>`; the new photo goes
**last** (`max(position) + 1`).

**Response** — `PhotoResponse`, `message: "Photo uploaded"`. Its `url` is
`/api/uploads/stadiums/<stadiumId>/<file>` — relative, see below.

**Errors**

| Status | `message` |
|---|---|
| 400 | `"file is required"` — no `file` part |
| 400 | `"Unsupported image type"` — not JPEG, PNG or WebP |
| 400 | `"A stadium can have at most 10 photos"` |
| 403 | `"You do not own this stadium"` |
| 404 | `"Stadium not found"` |
| 413 | `"File too large"` — over 10 MB |
| 415 | `"Unsupported media type"` — not a multipart body |

#### `DELETE /api/owner/stadiums/{id}/photos/{photoId}` — owner

**Response** — `data: null`, `message: "Photo deleted"`. The remaining photos
are renumbered `0..n-1`; an uploaded file is removed from disk after the
deletion commits (a photo added as an external URL is never touched).

**Errors** — 403 `"You do not own this stadium"`; 404 `"Stadium not found"` / `"Photo not found"` (also when the photo belongs to another stadium).

#### `PUT /api/owner/stadiums/{id}/photos/order` — owner

**Body** — `ReorderPhotosRequest`: `{ "photoIds": UUID[] }` (`@NotNull`, no
null items) — **every** photo of the stadium exactly once, in the new order;
the first becomes the cover.

**Response** — `PhotoResponse[]` in the new order, `message: "Photos reordered"`.

**Errors** — 400 `"photoIds must list every photo of the stadium exactly once"`; 400 validation; 403 `"You do not own this stadium"`; 404 `"Stadium not found"`.

#### `GET /api/uploads/stadiums/{stadiumId}/{file}` — **public**

Serves an uploaded photo (the `url` above) — the raw image, **not** the JSON
envelope — with its `Content-Type`, `Cache-Control: max-age=31536000, public,
immutable` and `X-Content-Type-Options: nosniff`. Only a
`<uuid>.<jpg|png|webp>` name under a stadium id resolves; anything else (other
names, directories, `..`) answers 404 `"Not found"` (400 `"Invalid id"` for a
bad stadium id) — no listing, no traversal. Since the stored `url` is
relative, an `<img>` on another origin needs the API base URL in front of it
(§1.1).

---

## 5. Bookings

`BookingResponse` (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `id`, `stadiumId` | UUID | |
| `stadiumName` | string | |
| `userId` | UUID? | absent on a walk-in |
| `gameId` | UUID? | set when `source = "game"` |
| `seriesId` | UUID? | set when generated from a recurring series |
| `source` | string | `app` \| `manual` \| `game` |
| `status` | string | §1.9 |
| `startsAt`, `endsAt` | timestamp (UTC) | |
| `durationHours` | number | `1` — a booking is exactly one hour; rows stored before that rule may be longer |
| `price` | number **(tiyin)** | what the player pays for the booking — the player price **D**, the slot's player price; the owner's own price on a manual booking (§1.10). The same in every view |
| `paidAmount` | number **(tiyin)** | what has been paid of `price`, card and cash |
| `remainingAmount` | number **(tiyin)** | what is left — the **same amount** in the app or in cash. **`paidAmount + remainingAmount = price` for every booking, in the player, owner and admin views alike** (R18: `net` bookings — made before changeset 040, and every game booking — are converted the one way for every view) |
| `paymentStatus` | string | `unpaid` \| `partially_paid` \| `paid` |
| `ownerPrice` | number? **(tiyin)** | **owner and admin views only**: the owner's own price for the booking |
| `paidInApp` | number? **(tiyin)** | **owner and admin views only**: card money paid in the app and kept (`paid`/`captured`/`completed`, refunds excluded) |
| `ownerReceives` | number? **(tiyin)** | **owner and admin views only**: the owner's share of the card money kept, after ATMOS's fee, plus the cash taken |
| `atmosFee` | number? **(tiyin)** | **admin view only**: what ATMOS takes of the card money kept |
| `clientName`, `clientPhone` | string? | manual/walk-in bookings |
| `isWalkin` | boolean | |
| `expiresAt` | timestamp (UTC)? | the hold deadline while `pending` |
| `cancelledAt` | timestamp (UTC)? | |
| `cancellationReason` | string? | |
| `cancellationPolicy` | `{ cancellationHours }` | show before confirming |
| `cancellationDeadline` | timestamp (UTC)? | last moment a cancellation still refunds |
| `refundIfCancelledNow` | number **(tiyin)**? | **display this, never recompute it**; everything paid by card |
| `refundAmount` | number **(tiyin)**? | only on a cancellation response: what was actually refunded |
| `createdAt` | timestamp (UTC) | |

### `POST /api/bookings` — user

Creates the booking **and charges the chosen saved card in the same call.**

**Body** — `CreateBookingRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `stadiumId` | UUID | yes | `@NotNull` |
| `startsAt` | timestamp (UTC) | yes | `@NotNull @Future`; must be **on the hour in Asia/Tashkent** |
| `durationHours` | number | no | a booking is **exactly one hour**: absent or `1`; anything else is 400 `"A booking is exactly one hour"` |
| `cardId` | UUID | yes | `@NotNull`; must be an **active card of the caller** |
| `paymentOption` | `"MINIMUM"` \| `"FULL"` | yes | `@NotNull`, uppercase |

**Response** — `BookingResponse`, with `message` reporting the payment outcome:

| `paymentStatus` | `message` |
|---|---|
| `paid` | `"Booking confirmed and paid in full"` |
| `partially_paid` | `"Booking confirmed; the remainder is still due"` |
| `unpaid` | `"Payment failed — the booking is held until it expires; try paying again"` |

> **A declined card is still HTTP 200.** The booking survives as `pending` with
> `paymentStatus: "unpaid"` until the 10-minute hold expires. The frontend must
> read `paymentStatus`, not just the status code.

**Errors**

| Status | `message` |
|---|---|
| 400 | `"startsAt: must be a future date"`, … |
| 400 | `"A booking is exactly one hour"` (`durationHours` other than 1) |
| 400 | `"Booking must start on the hour"` |
| 400 | `"Stadium has no bookable hours"` (`closeTime <= openTime`) |
| 400 | `"Booking must start at or after <openTime>"` |
| 400 | `"Booking must end by <closeTime>"` |
| 400 | `"Stadium is closed on <date>"` (a `stadium_closure` overlaps) |
| 400 | `"Cannot book more than 4 weeks ahead"` |
| 400 | `"This stadium requires full payment; it has no minimum booking amount"` (`MINIMUM` on a stadium with no minimum) |
| 403 | `"You cannot book your own stadium; add a manual booking instead"` |
| 404 | `"Stadium not available"` (missing, not approved, or inactive) |
| 404 | `"Card not found"` (unknown, not the caller's, or deactivated) |
| 404 | `"User not found"` |
| 409 | `"Slot is already booked"` |

**Notes**

- Price = the slot's price from the pricing rules, with the best active
  promotion for that hour applied — identical to what availability showed.
  **Never compute it in the client**; `price` on the response is authoritative.
- What is charged (§1.10): `FULL` charges `price` (D); `MINIMUM` the deposit
  `min(minBookingAmount as players see it, D)` — the figure public stadium
  responses already show, capped at the booking's price. `MINIMUM` is no
  longer refused when the minimum is not below the price (that 400 is gone);
  the deposit then simply covers the whole booking.
- Creating a booking cancels any waiting game on those hours and refunds that
  game's team(s).

### `POST /api/bookings/{id}/pay-remainder` — user

Pays off the whole remainder of a `partially_paid` booking from a saved card —
before **or after** the game. Paying after the game leaves the booking
`completed`; it is never dragged back to `confirmed`.

**Body** — `{ "cardId": UUID }` (`@NotNull`).

**Response** — `BookingResponse`, `message` is `"Booking paid in full"` or
`"Payment failed — the remainder is still due"` (again, a decline is **200**).

**Errors**

| Status | `message` |
|---|---|
| 400 | `"Already paid"` — the owner took it in cash first (`POST /api/owner/bookings/{id}/cash`; both lock the booking row, so whichever lands first wins) |
| 400 | `"This booking has no part payment to complete"` |
| 400 | `"Only a live booking can be paid off"` (status is not `confirmed`/`completed`) |
| 403 | `"This booking does not belong to you"` |
| 404 | `"Booking not found"` / `"Card not found"` |

### `GET /api/bookings` — user · paged

The caller's own bookings.

| Query | `page`, `size` |
|---|---|

**Response** — paged `BookingResponse`.

### `GET /api/bookings/{id}` — user

**Response** — `BookingResponse`.

**Errors** — 403 `"This booking does not belong to you"`; 404 `"Booking not found"`.

### `POST /api/bookings/{id}/cancel` — user

| Query | Type | Required |
|---|---|---|
| `reason` | string | no |

**Response** — `BookingResponse` with `refundAmount` _(tiyin)_ set to what was
actually refunded, `message: "Booking cancelled"`.

**Errors**

| Status | `message` |
|---|---|
| 400 | `"Booking cannot be cancelled in status <status>"` |
| 403 | `"This booking does not belong to you"` |
| 404 | `"Booking not found"` |

**Notes** — refunds are **all or nothing**: inside
`startsAt − cancellationHours` every card payment comes back in full, past it
the booking is still cancelled but nothing is refunded. Show
`refundIfCancelledNow` from the booking beforehand; it is produced by the same
code that performs the cancellation. Cash is never refunded through the
platform.

### `POST /api/owner/stadiums/{stadiumId}/bookings` — owner

A walk-in / phone booking. Confirmed immediately, no hold. When
`paymentMethod` is `"cash"`, blank or omitted, a cash payment is recorded for
the full price.

**Body** — `CreateManualBookingRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `stadiumId` | UUID | — | **ignored**; the path wins |
| `clientName` | string | yes | `@NotBlank` |
| `clientPhone` | string | yes | `@NotBlank` |
| `startsAt` | timestamp (UTC) | yes | `@NotNull`; on the hour (Tashkent). **No `@Future`** — a past slot is accepted here |
| `duration` | number | no | absent or `1`; anything else is 400 `"A booking is exactly one hour"` (note the name is `duration`, not `durationHours`) |
| `notes` | string | no | |
| `paymentMethod` | string | no | `"cash"` or null |

**Response** — `BookingResponse` in the **owner's view** (`ownerPrice`, `paidInApp`, `ownerReceives`; a walk-in pays the owner's own price, so `price` = `ownerPrice`), `message: "Manual booking created"`.

**Errors** — the booking-window 400s above; 403 `"You do not own this stadium"`; 404 `"Stadium not found"`; 409 overlap.

### `GET /api/owner/stadiums/{stadiumId}/bookings` — owner · paged

| Query | Type | Required |
|---|---|---|
| `from`, `to` | `LocalDate` | no |
| `page`, `size` | number | no |

**Response** — paged `BookingResponse` in the **owner's view** (§1.10). **Errors** — 403 `"You do not own this stadium"`.

### `POST /api/owner/bookings/{bookingId}/cash` — owner

The owner marks the rest of a booking as received in cash (R37) — the
booking's `remainingAmount`, the same amount the player would pay with
`pay-remainder`, not the full price. **No body.** The player's app payment and
this lock the booking row and settle one at a time: whichever lands first
wins, the other answers 400 `"Already paid"`. Audited as `CASH_RECEIVED`.

Applies to a `confirmed` / `completed` booking that is `partially_paid`, or a
manual (walk-in) booking still `unpaid`. A team game's booking is not settled
here — its teams' remainders go through `POST /api/games/{id}/cash` (§9).

**Response** — `BookingResponse` in the **owner's view** (§1.10), `message: "Cash recorded"`.

**Errors**

| Status | `message` |
|---|---|
| 400 | `"Already paid"` — nothing left (e.g. the player paid in the app first) |
| 400 | `"This booking has no part payment to complete"` — pending, cancelled or expired, not part-paid, or a game booking |
| 403 | `"You do not own this stadium"` |
| 404 | `"Booking not found"` |
| 409 | `"A payment for this booking is being processed"` — a card payment of the booking is still `processing` / `capture_pending` (outcome unknown) |

### `DELETE /api/owner/bookings/{bookingId}` — owner

The owner cancels a booking. **Always a full refund** of every card payment,
whatever the time left.

| Query | Type | Required |
|---|---|---|
| `reason` | string | no |

**Response** — `BookingResponse` in the owner's view, `message: "Booking cancelled"`.

**Errors** — 400 `"Booking cannot be cancelled in status <status>"`; 403 `"You do not own this stadium"`; 404 `"Booking not found"`.

**Note** — if the booking belongs to a team game, both teams get everything
back and the game ends; the booking is released as `cancelled_opponent_left`.

---

## 6. Recurring bookings (booking series)

`BookingSeriesResponse` (`NON_NULL`)

| Field | Type |
|---|---|
| `id`, `userId`, `stadiumId` | UUID |
| `userName`, `stadiumName` | string |
| `dayOfWeek` | number (0 = Monday) |
| `startTime` | time |
| `duration` | number (hours) — `1` for new series; an older row may say more and still generates one-hour bookings |
| `isActive` | boolean |
| `createdAt` | timestamp (UTC) |
| `nextBookingDate` | date? — the next date this series will book |

### `POST /api/booking-series` — user

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `stadiumId` | UUID | yes | `@NotNull` |
| `dayOfWeek` | number | yes | `@Min(0) @Max(6)` — `"dayOfWeek must be 0 (Monday) to 6 (Sunday)"` |
| `startTime` | time | yes | `@NotNull` |
| `duration` | number | no | absent or `1`; anything else is 400 `"A booking is exactly one hour"` |

**Response** — `BookingSeriesResponse`, `message: "Recurring booking created"`.

**Errors** — 400 `"A booking is exactly one hour"`, `"Booking must start on the hour"`, `"Requested time is outside the stadium's operating hours"`; 404 `"Stadium not found"`.

### `GET /api/booking-series/my` — user

**Response** — `BookingSeriesResponse[]` (not paged).

### `DELETE /api/booking-series/{id}` — user

**Response** — `data: null`, `message: "Recurring booking cancelled"`.

**Errors** — 403 `"This series does not belong to you"`; 404 `"Booking series not found"`.

---

## 7. Saved cards and payments

### 7.1 Saved cards

Binding is **two calls**. The card number goes straight to the provider and is
never stored, logged or returned.

`SavedCardResponse` (all fields always present)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | the only handle the client ever uses |
| `maskedNumber` | string | `"8600 •••• •••• 1234"` (`provider/CardMask`, both providers, since `9e9acb5`); cards saved earlier keep `"8600 •••• 1234"` — the client must show both |
| `cardType` | string | `uzcard` (8600…) \| `humo` (9860…) \| `unknown` |
| `expiry` | string | `MM/YY` as the provider reports it |
| `isActive` | boolean | |
| `createdAt` | timestamp (UTC) | |

There is **no token field** — payment calls take `cardId`.

#### `POST /api/cards` — user

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `cardNumber` | string | yes | `@Pattern(\d{16})` — `"cardNumber must be 16 digits"` |
| `expiry` | string | yes | `@Pattern(\d{2}/\d{2})` — `"expiry must be MM/YY"` |

Only **Uzcard (`8600…`) and Humo (`9860…`)** are bound; the expiry must not have
passed. No Luhn check.

**Response** — `{ "bindingId": string, "maskedPhone": string }` (where the
SMS went: `"+998 ** *** ** 58"` from the fake provider, `"********9999"` from
ATMOS), `message: "SMS code sent"`. Nothing is persisted yet; an abandoned
binding expires at the provider.

**Errors** — 400 validation; 400 with a `code` (below); 404 `"User not found"`;
502 provider unreachable (§1.7).

**Card binding errors** (`CardBindingException`, 400, all three card calls).
The `message` is Uzbek Latin with `'` for ʻ/ʼ; branch on `code`:

| `code` | When | `message` |
|---|---|---|
| `CARD_NOT_SUPPORTED` | not Uzcard / Humo (ATMOS `STPIMS-ERR-117`, `-050`) | `"Faqat Uzcard va Humo kartalari qabul qilinadi"` |
| `CARD_EXPIRY_INVALID` | the expiry does not match the card (`-090`, `-004`) | `"Karta raqami yoki amal qilish muddati noto'g'ri"` |
| `CARD_EXPIRED` | the card has expired (`-067`) | `"Kartaning amal qilish muddati tugagan"` |
| `SMS_CODE_WRONG` | wrong SMS code (`-098`); the binding stays open | `"SMS kod noto'g'ri"` |
| `SMS_CODE_EXPIRED` | the code is no longer valid (fake: after 180 s) — resend it | `"SMS kodning muddati tugagan. Kodni qayta yuboring"` |
| `SMS_RESEND_TOO_EARLY` | `/resend` within 60 s of the last code | `"Kodni qayta yuborish uchun biroz kuting"` |
| `SMS_RESEND_UNAVAILABLE` | the provider cannot resend — **always, with real ATMOS** (no binding resend is documented): enter the card again | `"Kodni qayta olish uchun karta ma'lumotlarini qaytadan kiriting"` |
| `BINDING_NOT_FOUND` | unknown or already confirmed binding — start again | `"Karta qo'shish jarayoni topilmadi. Qaytadan boshlang"` |
| `CARD_BINDING_FAILED` | any other refusal | `"Kartani qo'shib bo'lmadi. Boshqa karta bilan urinib ko'ring"` |

#### `POST /api/cards/resend` — user

_Since `9e9acb5`._ The SMS code again, for the same binding.

**Body** — `{ "bindingId": string }` (`@NotBlank`).

**Response** — `{ "bindingId": string, "maskedPhone": string }` (the same
shape as `POST /api/cards`), `message: "SMS code sent"`.

**Errors** — 400 validation; 400 `SMS_RESEND_TOO_EARLY` (before the 60 s
cooldown), `SMS_RESEND_UNAVAILABLE`, `BINDING_NOT_FOUND`; 404
`"User not found"`; 502 (§1.7).

#### `POST /api/cards/confirm` — user

**Body** — `{ "bindingId": string, "smsCode": string }` (both `@NotBlank`).

**Response** — `SavedCardResponse`, `message: "Card saved"`.

**Errors** — 400 validation; 400 `SMS_CODE_WRONG`, `SMS_CODE_EXPIRED`,
`BINDING_NOT_FOUND`, `CARD_BINDING_FAILED` (above); 404 `"User not found"`;
502 (§1.7).

**Fake provider (dev and tests, since `9e9acb5`).** It answers like ATMOS and
keeps its state across restarts. Any 16 digits starting `8600`/`9860` with an
expiry not passed bind (`13/29` → `CARD_EXPIRY_INVALID`, last month →
`CARD_EXPIRED`, `4111…` → `CARD_NOT_SUPPORTED`); **any 6-digit code** confirms,
`000000` → `SMS_CODE_WRONG`, `999999` → `SMS_CODE_EXPIRED`. Card endings pick a
payment scenario: `0002` declined, `0051` insufficient funds, `0054` expired at
payment, `0091`/`0092` lost answer (did / did not charge), `0099` provider down
(502), `0098` refunds refused, `0097` (team game creator) capture refused.
The table is "To simulate X in dev" in the backend `CLAUDE.md`.

**Dev-only: `GET /api/dev/fake-payments?limit=`** — `dev` profile with the fake
provider only, `X-Dev-Login-Key` like §2, **no JWT**; 404 `"Not found"`
otherwise. Not counted in the endpoint total. `limit` 1–100 per list (default
20). `DevFakePaymentsResponse`: `cards` (`cardId`, `maskedPan`, `cardType`,
`expiry`, `cardHolder`, `maskedPhone`, `balance` tiyin, `scenario`,
`isActive`, `createdAt`, `removedAt`), `charges` and `holds` (`id`,
`account` = our payment id, `cardId`, `maskedPan`, `status` PENDING / SUCCESS /
FAILED / REVERSED / HELD / CAPTURED / RELEASED, `errorCode`, `amount`,
`commission`, `holdTill`, `succeededAt`, `createdAt`, `updatedAt`, `splits`
[`transactionId`, `recipient` owner / platform, `recipientId`, `amount`,
`commission`, `recipientReceives`, `successTransId`, `reversedAt`]) and
`reverses` (`id`, `operationId`, `transactionId`, `amount`, `outcome`
REVERSED / REFUSED, `errorCode`, `reason`, `createdAt`). Newest first; no token
anywhere. The Mini App does not call it.

#### `GET /api/cards` — user

**Response** — `SavedCardResponse[]`, **active cards only**.

#### `DELETE /api/cards/{id}` — user

Soft delete (`isActive = false`) so past payments stay explainable.

**Response** — `data: null`, `message: "Card deleted"`.

**Errors** — 403 `"This card does not belong to you"`; 404 `"Card not found"`.

### 7.2 Payments

`PaymentResponse` (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `bookingId`, `gameId`, `userId` | UUID? | |
| `amount` | number **(tiyin)** | what the player paid; negative on a refund row. The split (`ownerAmount`, `platformAmount`, `commissionPercent`) is no longer here — only in `AdminPaymentResponse` (§10.9) |
| `method` | string | `card` \| `cash` |
| `paymentType` | string | §1.9 |
| `provider` | string | `atmos` \| `payme` \| `click` \| `cash` |
| `providerTxnId` | string? | unique — makes webhooks idempotent |
| `status` | string | §1.9 |
| `refundReason` | string? | |
| `createdAt` | timestamp (UTC) | |

A `failed` row does **not** say why (insufficient funds, expired card, blocked):
`failure_reason` is kept only for the admin (`AdminPaymentResponse`). Requested
as R44.

#### `POST /api/payments/initiate` — user

**Legacy hosted checkout (Payme/Click).** Kept for the casual game flow; do
not use it for a new flow — ordinary bookings charge a saved card in
`POST /api/bookings`.

**Body** — `{ "bookingId": UUID, "provider": "payme" | "click" }`
(`@NotNull`, `@NotBlank`).

**Response** — `PaymentInitResponse`: `{ paymentId: UUID, checkoutUrl: string, provider: string }`.

**Errors** — 400 `"Unknown payment provider: <name>"`, `"Booking is not awaiting payment"`, `"Cash is recorded by the owner, not initiated as a checkout"`; 403 `"This booking does not belong to you"`; 404 `"Booking not found"`.

#### `GET /api/payments/my` — user · paged

Newest first (`createdAt` desc). **Response** — paged `PaymentResponse`.

#### `GET /api/payments/{id}` — user

**Response** — `PaymentResponse`.

**Errors** — 403 `"This payment does not belong to you"`; 404 `"Payment not found"`.

---

## 8. Teams

| DTO | Fields |
|---|---|
| `TeamResponse` | `id` UUID, `name` string, `leaderName` string?, `memberCount` number? |
| `TeamDetailResponse` | `id` UUID, `name` string, `leaderId` UUID, `leaderName` string?, `members` `TeamMemberResponse[]` |
| `TeamMemberResponse` | `userId` UUID, `userName` string?, `role` string (`leader` \| `member`) |
| `TeamInviteResponse` | `code` string — the invite code (R32) |
| `TeamInvitePreviewResponse` | `team` `TeamResponse`, `isMember` boolean |

The invite code (changeset 043, `teams.invite_code`, unique, null until the
leader first asks for it) is 128 random bits, base64url without padding — **22
characters**, safe in a link. It never appears in a team response; only the
leader gets it from the invite endpoints. Team changes are not audited.

### `POST /api/teams` — user

**Body** — `{ "name": string }` — `@NotBlank @Size(max=100)` (`"name must be at most 100 characters"`). The creator becomes the leader.

**Response** — `TeamDetailResponse`, `message: "Team created"`.

### `GET /api/teams/me` — user

**Response** — `TeamResponse[]` — teams the caller leads or belongs to.

### `GET /api/teams/{id}` — user

**Response** — `TeamDetailResponse`. Any logged-in user may read any team (no
membership check).

**Errors** — 404 `"Team not found"`.

### `POST /api/teams/{id}/members` — user (leader only)

**Body** — `{ "userId": UUID }` (`@NotNull`).

**Response** — `TeamDetailResponse`, `message: "Member added"`.

**Errors** — 400 `"User is already a member of this team"`; 403 `"Only the team leader can perform this action"`; 404 `"Team not found"` / `"User not found"`.

### `GET /api/teams/{id}/invite` — user (leader only)

**Response** — `TeamInviteResponse` `{ code }`. The code is **created on the
first request** and returned unchanged after that; the client builds the
invite link from it.

**Errors** — 403 `"Only the team leader can perform this action"`; 404 `"Team not found"`.

### `POST /api/teams/{id}/invite` — user (leader only)

A new invite code; links with the old one **stop working**. No body.

**Response** — `TeamInviteResponse` `{ code }`, `message: "Invite link renewed"`.

**Errors** — 403 `"Only the team leader can perform this action"`; 404 `"Team not found"`.

### `GET /api/teams/invite/{code}` — user

What an invite link leads to — any signed-in user.

**Response** — `TeamInvitePreviewResponse` `{ team: TeamResponse, isMember }`;
`isMember` says whether the caller is already in the team.

**Errors** — 404 `"Invite not found"` (unknown or renewed-away code, blank, or over 32 characters).

### `POST /api/teams/join` — user

Joins the team an invite code belongs to, as a `member` — the same membership
add-member gives.

**Body** — `JoinTeamRequest`: `{ "code": string }` (`@NotBlank`; trimmed).

**Response** — `TeamDetailResponse`, `message: "Joined team"`.

**Errors** — 400 `"code: must not be blank"`; 404 `"Invite not found"`; **409** `"User is already a member of this team"` (add-member keeps its 400 for the same case; only the join answers 409).

### `DELETE /api/teams/{id}/members/{userId}` — user (leader only)

**Response** — `data: null`, `message: "Member removed"`.

**Errors** — 400 `"The leader cannot be removed; delete the team instead"`; 403 `"Only the team leader can perform this action"`; 404.

### `DELETE /api/teams/{id}` — user (leader only)

**Response** — `data: null`, `message: "Team deleted"`.

**Errors** — 403 `"Only the team leader can perform this action"`; 404 `"Team not found"`.

---

## 9. Games and chat

Three flows share these endpoints: `casual` (private, friends via invite link),
`open` (public, find players) and `team_vs_team` (team against team, all its
money logic in `TeamGameService`). The behaviour differs sharply per type —
read `../minipolyaBackend/CLAUDE.md` for the rules and **never re-implement
them in the client.**

`GameResponse` — listing summary (`NON_NULL`)

| Field | Type |
|---|---|
| `id` | UUID |
| `type`, `status` | string |
| `title`, `stadiumName`, `creatorName` | string? |
| `maxPlayers`, `currentPlayers` | number? |
| `startsAt`, `endsAt` | timestamp (UTC) |
| `totalPrice` | number **(tiyin)** — what all the players pay together (§1.10): every share of a casual/open game, both teams' joining prices and remainders of a team game |
| `isPublic` | boolean |

`GameDetailResponse` (`NON_NULL`) — the above plus `description`, `stadiumId`,
`creatorId`, `minPlayers`, `teamAId`, `teamAName`, `teamBId`, `teamBName`,
`bookingId`, `inviteLink` (Telegram deep link `t.me/{bot}?start=game_{id}`),
`createdAt`, and `price` _(tiyin)_? — **casual/open games only**: what one
player pays for their share (§1.10). No `serviceFeePerPerson` and no
`cardFee` any more (the admin game detail still has `serviceFeePerPerson`,
§10.9) — plus:

`teams` — **`team_vs_team` only**, `GameTeamResponse[]`:

| Field | Type | Notes |
|---|---|---|
| `side` | `"a"` \| `"b"` | |
| `teamId`, `leaderId` | UUID | |
| `teamName`, `leaderName` | string? | |
| `price` | number **(tiyin)** | what this team pays in the app on joining (§1.10) |
| `remainderAmount` | number **(tiyin)** | what this team owes after joining (or owed, once `remainderStatus` is `paid`) — the **same amount** in the app or in cash |
| `remainderStatus` | `"unpaid"` \| `"paid"` | |
| `paidInApp` | number **(tiyin)** | everything this team has paid through the app so far (holds and charges not given back) |
| `platformFee`, `ownerAdvance`, `ownerRemainder`, `ownerReceives`, `atmosFee` | number? **(tiyin)** | **admin game detail only** (§10.9) |
| `cancellationDeadline` | timestamp (UTC) | |
| `refundIfCancelledNow` | number **(tiyin)** | 0 when nothing would come back — **display, never recompute** |

`participants` — `GameParticipantResponse[]`: `id`, `gameId`, `userId` UUID,
`userName` string?, `side` (`a`/`b`)?, `status` (`joined`/`paid`/`cancelled`/
`refunded`), `paymentStatus` (a `payment.status` value)?, `joinedAt` (UTC).

### `POST /api/games` — user

**Body** — `CreateGameRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `stadiumId` | UUID | yes | `@NotNull` |
| `type` | string | yes | `casual\|open\|team_vs_team` |
| `title` | string | no | `@Size(max=200)` |
| `maxPlayers` | number | yes | `@NotNull @Positive` |
| `startsAt` | timestamp (UTC) | yes | `@NotNull @Future` |
| `duration` | number | no | a game is exactly one hour: absent or `1`; anything else is 400 `"A booking is exactly one hour"` |
| `teamAId` | UUID | **required for `team_vs_team`** | caller must be that team's leader |
| `cardId` | UUID | **required for `team_vs_team`** | ignored for other types |

**Response** — `GameDetailResponse`, `message: "Game created"`.

For `team_vs_team` the creating leader's card is put **on hold** for the
team's joining `price` (`playerAmount(advance + fee)`, §1.10); no slot is booked and `status` stays `open` (= waiting).

**Errors**

| Status | `message` |
|---|---|
| 400 | validation; `"teamAId is required for a team_vs_team game"`; `"cardId is required to create a team game"` |
| 400 | `"Card payment was declined; the game was not created"` |
| 400 | `"A team game can be created at most <N> days before it is played"` — the hold would outlast `app.payments.hold-max-minutes` (default 43 200 min; with the 120-minute slack the message reads **29** days) |
| 403 | `"Only the team leader can create a team game"` |
| 404 | `"Stadium not found"` / `"Team not found"` / `"Card not found"` |
| 409 | `"That time slot is already booked"` |

### `GET /api/games/{id}` — user

**Response** — `GameDetailResponse`. **Errors** — 404 `"Game not found"`.

### `GET /api/games/open` — user · paged

Public `open` games, soonest first (`startsAt` asc).

| Query | Type | Required |
|---|---|---|
| `stadiumId` | UUID | no |
| `page`, `size` | number | no |

**Response** — paged `GameResponse`.

### `GET /api/games/challenges` — user · paged

Waiting `team_vs_team` games an opponent could still join (before their
3-hour point), **excluding** ones the caller's own team is waiting on. Soonest
first.

| Query | Type | Required |
|---|---|---|
| `date` | `LocalDate` | no |
| `format` | string | no |
| `stadiumId` | UUID | no |
| `page`, `size` | number | no |

**Response** — paged `GameChallengeResponse` (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `gameId` | UUID | |
| `title` | string? | |
| `waitingTeamId` | UUID, `waitingTeamName` string? | |
| `stadiumId` UUID, `stadiumName`, `stadiumAddress`, `format` | string | `stadiumAddress` stands in for a district — the board has no `district` field, although stadiums now have one ([Q15](#11-questions-about-the-backend)) |
| `startsAt`, `endsAt` | timestamp (UTC) | |
| `durationHours` | number | |
| `totalPrice` | number **(tiyin)** | what both teams pay for the game altogether (each side's joining price and remainder) |
| `amountToPayNow` | number **(tiyin)** | what the joining team pays in the app on joining |
| `remainderAmount` | number **(tiyin)** | what the joining team still owes afterwards — the same in the app or in cash |

### `GET /api/games/my` — user · paged

Games the caller is in, latest `startsAt` first. **Response** — paged `GameResponse`.

### `POST /api/games/{id}/join` — user

**Body** — `JoinGameRequest`, and the **body as a whole is optional** (an
invited casual player can POST with no body at all).

**Team games (since `eabfd85`/`2816c90`).** Only the joining team's **leader**
joins, with `teamId` + `cardId`, and always pays; an invited **member cannot**
join through this endpoint (403). **The server picks the side** — the free one
(A when the team left behind is on B). `side` is optional; `"b"` is still
accepted from older clients, any other side that is not the free one → 400. The
join runs in committed steps (the team as `joining`, the slot, the joiner's
charge, then the capture of the waiting team's hold), so a crash or an unclear
answer leaves a record the reconcile job finishes:

- the joiner's card declined → 400, the game keeps waiting;
- the capture refused → the game is cancelled (`cancelled_slot_taken`), the
  joiner's charge reversed and the hold released → 400 (below);
- the capture without a clear answer → **202 `PAYMENT_PENDING`**, `success:
  false`, `data: null`, message `"To'lov tasdiqlanmoqda. O'yin tasdiqlangani yoki
  bekor qilingani haqida xabar beramiz"`. The joiner **has paid**; the reconcile
  job (every ~5 min) confirms or undoes the game and notifies both teams. Never
  pay again. Meanwhile the game stays `open` and is **still listed** on
  `GET /api/games/challenges` (R45).

| Field | Type | Required | Validation |
|---|---|---|---|
| `gameId` | UUID | see note | `@NotNull` **but the path value is what is used** |
| `side` | `"a"` \| `"b"` | no | `@Pattern(a\|b)`; team games: optional, the server picks the free side; `"b"` or the free side accepted |
| `teamId` | UUID | required when a leader joins a `team_vs_team` game | caller must lead it |
| `cardId` | UUID | required when a leader joins a `team_vs_team` game | |

> **Trap:** the controller reads the game id from the **path** and never uses
> `gameId`, yet the DTO still declares it `@NotNull`. So sending a body
> *without* `gameId` fails validation with 400 `"gameId: must not be null"`,
> while sending no body at all succeeds. Either omit the body entirely or set
> `gameId` to the path id. See [Q3](#11-questions-about-the-backend).

**Response** — `GameParticipantResponse`, `message: "Joined game"`.

**Errors**

| Status | `message` |
|---|---|
| 400 | `"Game is not open for joining"`, `"You have already joined this game"`, `"Game is already full"` |
| 400 | `"cardId is required to join a team game"`, `"The opposing team joins as side <a\|b>"` (a side that is neither `b` nor the free one) |
| 400 | `"Card payment was declined; the game is still looking for an opponent"` |
| 400 | `"The card payment could not be confirmed; the game is still looking for an opponent. If the money was taken it will be returned in full"`, `"The other team's payment is still being confirmed; try again in a few minutes"`, `"The other team's payment could not be taken, so the game is cancelled; your payment is being returned in full"` |
| 400 | `"A team cannot play against itself"`, `"This game already has an opponent"` |
| 400 | `"O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi"` — past the 3-hour point (Uzbek; see [Q7](#11-questions-about-the-backend)) |
| 403 | `"Only the joining team's leader can join a team game, with their team and a card"` — a team game joined by anyone but the leader of `teamId`, or without `teamId` (an invited member) |
| 202 | `code: "PAYMENT_PENDING"` — see above |
| 502 | the payment provider is unreachable (§1.7); the join is dropped, nothing charged |
| 404 | `"Game not found"` / `"Team not found"` / `"Card not found"` |
| 409 | `"That time slot is already booked"` |

### `POST /api/games/{id}/pay` — user

A casual player's share. Refuses a team game. With `cardId` the share is
charged now to that saved card through ATMOS (the detail's `price`, §1.10); without it,
the **legacy** hosted checkout of `provider`.

| Query | Type | Required |
|---|---|---|
| `cardId` | UUID | no — when set, `provider` is ignored |
| `provider` | string (`payme` \| `click`) | when there is no `cardId` |

**Response** — `PaymentInitResponse`; for a card payment it carries `status`:
`paid`, or `processing` while the provider has not answered (§1.9).

**Errors** — 400 `"Unknown payment provider: <name>"`, `"A team game is paid when creating or joining it"`, `"Join the game before paying"`, `"Already paid"`, `"Card payment was declined"`; 404 `"Game not found"` / `"Card not found"`.

### `POST /api/games/{id}/pay-remainder` — user (team leader)

A leader settles **their own team's** remainder from a saved card, before or
after the game.

**Body** — `{ "cardId": UUID }` (`@NotNull`).

**Response** — the refreshed `GameDetailResponse`, `message: "Remainder paid"`.

**Errors** — 400 `"Already paid"`, `"Card payment was declined; the remainder is still owed"`; 404 `"Game not found"` / `"Card not found"`; 502 (§1.7).

### `POST /api/games/{id}/cash` — owner (the stadium's owner)

The owner marks one team's remainder as received in cash — the team's
`remainderAmount`, the same amount it would pay in the app. Whichever of cash
and card lands first wins; the other then answers 400 `"Already paid"`.

**Body** — `{ "side": "a" | "b" }` (`@NotNull @Pattern(a|b)`).

**Response** — the refreshed `GameDetailResponse`, `message: "Cash recorded"`.

**Errors** — 400 `"side must be 'a' or 'b'"`, `"Already paid"`; 403 `"You do not own this stadium"`; 404 `"Game not found"`, `"No team is on side <a|b>"`.

> Note the path is `/api/games/**`, **not** `/api/owner/**`, so `ROLE_OWNER` is
> not required by the security config — ownership of this particular stadium is
> checked in the service instead.

### `POST /api/games/{id}/leave` — user

**Response** — `data: null`, `message: "Left game"`.

**Errors** — 400 `"You can only leave a game that is still open"`, `"The creator should cancel the game instead of leaving"`; 404 `"Game not found"`.

### `DELETE /api/games/{id}` — user (creator, or either team leader)

**Response** — `data: null`, `message: "Game cancelled"`.

**Errors** — 400 `"Only an open game can be cancelled"`, `"The game has already started and cannot be cancelled"`; 403 `"Only the creator can cancel this game"`; 404 `"Game not found"`.

**Notes** — what comes back depends on which band the cancellation falls in
(before the cancellation deadline / after it but before the 3-hour point /
past the 3-hour point). Show `refundIfCancelledNow` from the game's `teams`
entry; do not compute the bands in the client.

### `POST /api/games/{gameId}/messages` — user

**Body** — `{ "message": string }` — `@NotBlank @Size(max=1000)`
(`"message must be at most 1000 characters"`).

**Response** — `GameMessageResponse`: `id`, `gameId`, `userId` UUID,
`userName` string?, `message` string, `createdAt` (UTC). `message: "Message sent"`.

**Errors** — 400 `"Chat is only available for team games"`, `"Chat is closed for this game"`; 403 `"You are no longer a participant of this game"`; 404 `"Game not found"`.

### `GET /api/games/{gameId}/messages` — user · paged

Newest first (`createdAt` desc).

**Response** — paged `GameMessageResponse`.

**Notes** — chat is open exactly while the game is `confirmed`. A leader who
joined partway through sees only messages sent after they joined; a team that
left loses the chat entirely.

---

## 10. Reviews, favourites, notifications, owner, admin

### 10.1 Reviews

`ReviewResponse` (`NON_NULL`): `id`, `stadiumId`, `userId` UUID,
`stadiumName`, `userName` string?, `bookingId` UUID?, `rating` number (1–5),
`comment` string?, `ownerReply` string?, `ownerReplyAt` (UTC)?, `createdAt` (UTC).

#### `POST /api/reviews` — user

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `stadiumId` | UUID | yes | `@NotNull` |
| `bookingId` | UUID | no | |
| `rating` | number | yes | `@NotNull @Min(1) @Max(5)` |
| `comment` | string | no | `@Size(max=2000)` |

**Response** — `ReviewResponse`, `message: "Review posted"`.

**Errors** — 400 `"You have already reviewed this stadium"`, `"You can only review a stadium you have played at"`; 404 `"Stadium not found"`.

#### `GET /api/reviews/stadium/{stadiumId}` — **public** · paged

Newest first. **Response** — paged `ReviewResponse`.

#### `GET /api/reviews/my` — user · paged

Newest first. **Response** — paged `ReviewResponse`.

#### `POST /api/reviews/{id}/reply` — user (the stadium's owner)

**Body** — `{ "reply": string }` — `@NotBlank @Size(max=2000)`.

**Response** — `ReviewResponse`, `message: "Reply posted"`.

**Errors** — 403 `"Only the stadium owner can reply to this review"`; 404 `"Review not found"`.

#### `DELETE /api/reviews/{id}` — user (author)

**Response** — `data: null`, `message: "Review deleted"`.

**Errors** — 403 `"This review does not belong to you"`; 404 `"Review not found"`.

### 10.2 Favourites

#### `POST /api/favorites/{stadiumId}/toggle` — user

**Response** — `{ "favorited": boolean }`, `message: "Added to favorites"` or
`"Removed from favorites"`.

**Errors** — 404 `"Stadium not found"`.

#### `GET /api/favorites` — user · paged

Most recently favourited first. **Response** — paged **`StadiumResponse`**
(not a favourite wrapper), the same card as the player list: player prices,
rating, `coverPhotoUrl`, `isFavorited: true`.

### 10.3 Notifications

`NotificationResponse` (`NON_NULL`): `id`, `userId` UUID, `type`
(§1.9), `title`, `message` string, `referenceType` (§1.9)?, `referenceId`
UUID?, `isRead` boolean, `sentViaTelegram` boolean, `createdAt` (UTC).

| Endpoint | Access | Notes |
|---|---|---|
| `GET /api/notifications` | user · paged | newest first |
| `GET /api/notifications/unread-count` | user | `{ "count": number }` |
| `PUT /api/notifications/{id}/read` | user | `data: null`, `message: "Marked as read"` |
| `PUT /api/notifications/read-all` | user | `data: null`, `message: "All marked as read"` |

**Errors** — 403 `"This notification does not belong to you"`; 404 `"Notification not found"`.

> These are **polled**; there is no WebSocket, SSE or push endpoint.

### 10.4 Owner — pricing

`PricingRuleResponse` (`NON_NULL`): `id`, `stadiumId` UUID, `dayOfWeek` number
(0 = Monday), `startTime`, `endTime` time, `pricePerHour` number **(tiyin)**,
`playerPrice` number? **(tiyin)** (owner/admin only), `ownerReceives`,
`atmosFee` number? **(tiyin)** (admin only), `isActive` boolean, `createdAt`
(UTC). On the **public** `GET /api/stadiums/{id}/pricing` `pricePerHour` is
the **player** price and nothing else is added; on the owner (and admin)
responses `pricePerHour` is the **owner's own** price, with `playerPrice`
alongside (§1.10). The request bodies are the owner's own price.

| Endpoint | Access |
|---|---|
| `GET /api/owner/stadiums/{stadiumId}/pricing` | owner — `PricingRuleResponse[]` |
| `POST /api/owner/stadiums/{stadiumId}/pricing` | owner |
| `PUT /api/owner/stadiums/{stadiumId}/pricing/{id}` | owner |
| `DELETE /api/owner/stadiums/{stadiumId}/pricing/{id}` | owner — soft delete, `message: "Pricing rule removed"` |

**Create body** — `dayOfWeek` (`@NotNull @Min(0) @Max(6)`), `startTime`,
`endTime` (`@NotNull`), `pricePerHour` (`@NotNull @Positive`, tiyin).
**Update body** — the same four, all optional.

**Errors** — 400 `"startTime must be before endTime"`, `"Pricing rule overlaps an existing rule for that day"`; 403 `"You do not own this stadium"`; 404 `"Pricing rule not found"`.

### 10.5 Owner — promotions

`PromotionResponse` (`NON_NULL`): `id`, `stadiumId` UUID, `stadiumName`,
`name`, `description` string?, `discountPercent` number, `startsAt`, `endsAt`
(UTC), `dayOfWeek` number?, `startTime`, `endTime` time?, `isActive` boolean,
`createdAt` (UTC).

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/owner/stadiums/{stadiumId}/promotions` | owner | `message: "Promotion created"` |
| `GET /api/owner/stadiums/{stadiumId}/promotions` | owner · paged | newest first |
| `PUT /api/owner/promotions/{id}/deactivate` | owner | `data: null`, `message: "Promotion deactivated"` |
| `GET /api/stadiums/{stadiumId}/promotions` | **public** | active only, `PromotionResponse[]` |

**Create body** — `stadiumId` (ignored, path wins), `name` (`@NotBlank`),
`description` (optional), `discountPercent` (`@NotNull @Min(1) @Max(100)`),
`startsAt`, `endsAt` (`@NotNull`, UTC), `dayOfWeek` (`@Min(0) @Max(6)`, null =
all days), `startTime`/`endTime` (null = all hours).

**Errors** — 400 `"endsAt must be after startsAt"`; 403 `"You do not own this stadium"`; 404 `"Promotion not found"`.

### 10.6 Owner — closures

`StadiumClosureResponse` (`NON_NULL`): `id`, `stadiumId` UUID, `startDate`,
`endDate` date, `startTime`, `endTime` time?, `reason` string?, `createdAt` (UTC).

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/owner/stadiums/{stadiumId}/closures` | owner | `message: "Closure created"` |
| `GET /api/owner/stadiums/{stadiumId}/closures` | owner | `StadiumClosureResponse[]` |
| `DELETE /api/owner/closures/{id}` | owner | `data: null`, `message: "Closure removed"` |

**Create body** — `stadiumId` (ignored, path wins), `startDate`, `endDate`
(`@NotNull`), `startTime`/`endTime` (both set or both omitted; omitted = a
full-day closure), `reason` (optional).

**Errors** — 400 `"endDate must be on or after startDate"`, `"startTime and endTime must both be set, or both be omitted"`, `"startTime must be before endTime"`; 403 `"You do not own this stadium"`; 404 `"Stadium closure not found"`.

### 10.7 Owner — dashboard

All under `/api/owner/dashboard`, all owner-only, all 403
`"You do not own this stadium"` when the stadium is not theirs.

| Endpoint | Response |
|---|---|
| `GET /api/owner/dashboard/stadiums` | `StadiumResponse[]` (owner's own prices + `playerPrice`) |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/stats` | `OwnerDashboardStatsResponse` |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/revenue` | `OwnerRevenueResponse` — query `days`: `7` or `30` (default `30`, R43) |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/schedule` | `OwnerScheduleResponse[]` |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/reviews` | paged `ReviewResponse`, newest first |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/bookings` | paged `BookingResponse` (owner's view, §5) — query `from`, `to` (`LocalDate`, optional), `unpaid` (boolean, default `false`, R38), `page`, `size` |

`OwnerDashboardStatsResponse` (all fields present): `stadiumId` UUID,
`stadiumName` string, `todayBookings`/`weekBookings`/`monthBookings`/
`totalBookings` number, `todayRevenue`/`weekRevenue`/`monthRevenue`/
`totalRevenue` number **(tiyin)**, `averageRating` number, `reviewCount`
number, `occupancyPercent` number, and (R38, all **tiyin**):

| Field | What |
|---|---|
| `todayPaidInApp`, `weekPaidInApp`, `monthPaidInApp` | money that **arrived** for the stadium's bookings by card (payment status `paid`, `captured` or `completed`), as players paid it, counted by the payment's `createdAt` in the period |
| `todayPaidInCash`, `weekPaidInCash`, `monthPaidInCash` | the same for `cash` payments |
| `todayOutstanding`, `weekOutstanding`, `monthOutstanding` | the sum of `remainingAmount` (exactly as the booking responses show it) of **live** bookings (`pending`, `confirmed`, `completed`) **starting** in the period |

Periods are Tashkent: today, this Monday–Sunday week, this calendar month.

`OwnerRevenueResponse`: `stadiumId` UUID, `dailyRevenue`
`{ date: LocalDate, revenue: number (tiyin), bookingCount: number }[]` —
since R43 **every** Tashkent day of the window is present, oldest first,
ending today (`0` / `0` on a day without payments): 7 entries for `days=7`,
30 for `days=30` (the default). Any other `days` is 400
`"days must be 7 or 30"`. The revenue definition itself is unchanged
(completed `booking` payments, by `createdAt`).

`…/bookings?unpaid=true` (R38) returns only **live** bookings (`pending`,
`confirmed`, `completed` — not cancelled or expired) with
`remainingAmount > 0`, **soonest `startsAt` first**; `from` / `to` still
apply (by `startsAt`, Tashkent days). Filtered in the query, so pages and
`totalElements` are exact. Without `unpaid` the list is as before. The
similar `GET /api/owner/stadiums/{stadiumId}/bookings` (§5) has **no**
`unpaid` parameter.

`OwnerScheduleResponse` (one per day; `from`/`to` are optional `LocalDate`
query parameters): `date`, `bookings` `BookingResponse[]` (owner's view), `waitingGames`
`{ gameId: UUID, teamName: string, startsAt, endsAt }[]`, `totalSlots`,
`bookedSlots` number, `revenue` number **(tiyin)**.

> `waitingGames` are `team_vs_team` games looking for an opponent — the pitch
> is still free and the owner may take a walk-in for it.

> **Two revenue definitions.** `…/stats` sums only `payment_type = booking`
> rows; `…/schedule` sums booking prices. They disagree for game bookings —
> see [Q8](#11-questions-about-the-backend).

#### `GET /api/owner/legal-details` — owner

The caller's own legal form and ATMOS contract status (R39), read-only — the
details themselves are kept by admins (§10.9).

**Response** — `OwnerContractStatusResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `legalType` | string? | `yatt` \| `mchj` \| `self_employed` (§1.9); absent when nothing has been entered |
| `atmosContractStatus` | string | `none` \| `pending` \| `signed` |
| `ownerContractStatus` | string | the **same value** as `atmosContractStatus`, under the admin stadium list's name |

Never the `tin`, the `atmosRecipientId` or who changed them. With no legal
details yet it answers both statuses `none` and no `legalType` (the admin's
`GET /api/admin/users/{id}/legal-details` still answers `data: null` then).

### 10.8 Owner applications

`OwnerApplicationResponse` (`NON_NULL`): `id`, `userId` UUID, `userName`,
`userPhone` string?, `businessName`, `businessAddress`, `phone` string,
`description` string?, `stadiumCount` number, `status` (§1.9), `reviewedBy`
UUID?, `reviewerName`, `reviewNote` string?, `reviewedAt` (UTC)?, `createdAt` (UTC).

#### `POST /api/owner-applications` — user

Note the path has **no** `/owner` prefix, so it does not need `ROLE_OWNER` —
this is how a plain user asks to become one.

**Body** — `businessName`, `businessAddress`, `phone` (`@NotBlank`),
`description` (optional), `stadiumCount` (`@NotNull @Min(1)`).

**Response** — `OwnerApplicationResponse`, `message: "Application submitted"`.

**Errors** — 400 `"You are already a stadium owner"`, `"You already have a pending application"`.

#### `GET /api/owner-applications/my` — user

**Response** — `OwnerApplicationResponse[]`.

### 10.9 Admin

Everything under `/api/admin/**` requires `ROLE_ADMIN`; a non-admin token gets
403 `"Access denied"` (no token → 401).

There is no endpoint for an admin's own account: passwords are set and reset
only in the database (`POST /api/admin/me/password` was removed in `40bdbd2`,
request R7).

**Conventions every admin list follows** (backend `CLAUDE.md`, "Admin panel API"):

- Every filter is optional; filters combine with **AND**.
- `from` / `to` are **Tashkent calendar days, both inclusive** (`LocalDate`,
  `2026-11-02`); `to` before `from` → 400 `"to must be on or after from"`.
- `search` matches names case-insensitively and phones ignoring spaces and `+`
  on both sides (`"+998 90 123"` finds `"998901234567"`); `%` and `_` are
  literal, not wildcards.
- Paged lists take `page` / `size` (defaults `0` / `20`); the order is fixed.
- A bad UUID in a path or query → 400 `"Invalid id"` (§1.7).
- Every admin write is audited with old → new values (see "Audit log" below).

#### Users

| Endpoint | Notes |
|---|---|
| `GET /api/admin/users` · paged | newest first. Query `search` (name or phone), `role` (`player` = neither owner nor admin \| `owner` \| `admin`), `status` (`active` \| `blocked`) — `role`/`status` case-insensitive |
| `GET /api/admin/users/{id}` | `AdminUserResponse` |
| `PUT /api/admin/users/{id}` | body `{ isOwner?, isAdmin?, isBlocked?, reason? }` — optional booleans, nulls left unchanged; `reason` string ≤ 500 (`"reason must be at most 500 characters"`), **stored only in the audit log** (on `USER_BLOCKED`/`USER_UNBLOCKED`/`USER_ROLE_CHANGED`); `message: "User updated"` |
| `GET /api/admin/users/{id}/teams` | `AdminUserTeamResponse[]`, **not paged** — the teams the user leads or belongs to |
| `GET /api/admin/users/{id}/legal-details` | `OwnerLegalDetailsResponse`, or **`data: null`** when nothing has been entered yet |
| `PUT /api/admin/users/{id}/legal-details` | body below; `message: "Legal details updated"` |

`AdminUserResponse` (`NON_NULL`): `id` UUID, `name`, `phone` string?,
`telegramId` number?, `language` string, `isOwner`, `isAdmin`, `isBlocked`
boolean, `bookingCount`, `stadiumCount` number (0 for a non-owner),
`createdAt` (UTC), `lastActiveAt` (UTC)?.

`AdminUserTeamResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | the team |
| `name` | string | |
| `leaderName` | string? | |
| `memberCount` | number | |
| `role` | string | this user's part in it: `leader` \| `member` |

**Owner legal details** — one row per user (`owner_legal_details`). This is the
only place the owner's ATMOS recipient id is stored; card payouts read it, and
**a stadium cannot be approved until its owner's contract is `signed`**.

`OwnerLegalDetailsResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `legalType` | string? | `yatt` \| `mchj` \| `self_employed` (§1.9); absent only on a row carried over by changeset 037 until an admin fills it in |
| `tin` | string? | STIR: 9 digits; the 14-digit PINFL for `self_employed`; absent like `legalType` |
| `atmosContractStatus` | string | `none` \| `pending` \| `signed` |
| `atmosRecipientId` | string? | present only when `signed` |
| `updatedAt` | timestamp (UTC) | |
| `updatedByName` | string? | the admin who last changed it |

`PUT …/legal-details` body (`UpdateOwnerLegalDetailsRequest`) — a **full
replace**, checked in the service in this order, so the messages read exactly:

| Field | Type | Required | Validation |
|---|---|---|---|
| `legalType` | string | yes | `yatt` \| `mchj` \| `self_employed` (case-insensitive) — `"legalType must be one of yatt, mchj, self_employed"` |
| `tin` | string | yes | trimmed; 9 digits, or 14 for `self_employed` — `"tin must be 9 digits (or 14 for self-employed)"` |
| `atmosContractStatus` | string | yes | `none` \| `pending` \| `signed` — `"atmosContractStatus must be one of none, pending, signed"` |
| `atmosRecipientId` | string | when `signed` | trimmed, 1–50 chars — `"atmosRecipientId is required when the contract is signed"`, `"atmosRecipientId must be at most 50 characters"`; **ignored (cleared) otherwise** |

A missing body is treated as empty (→ the `legalType` message). An update
that changes nothing writes nothing (no audit entry, `updatedAt` unchanged).
Changes are audited as `OWNER_LEGAL_DETAILS_CHANGED` (entity `user`). The
user need not be an owner yet.

**Errors** — 400 `"You cannot remove your own admin access"`, `"You cannot block yourself"`, `"Invalid role"`, `"Invalid status"`, the legal-details messages above; 404 `"User not found"`.

#### Stadiums

| Endpoint | Notes |
|---|---|
| `GET /api/admin/stadiums` · paged | **every status**, newest first. Query `status` (`pending` \| `approved` \| `rejected` \| `blocked`), `search` (name or address), `district` (§1.9), `format` (`5x5` \| `7x7` \| `9x9` \| `11x11`), `ownerId` (UUID — an owner's stadiums) |
| `GET /api/admin/stadiums/{id}` | `AdminStadiumDetailResponse`, **any status** |
| `PUT /api/admin/stadiums/{id}/status` | body below; response `AdminStadiumResponse`, `message: "Stadium status updated"` |
| `GET /api/admin/stadiums/{id}/notes` | `StadiumNoteResponse[]`, newest first, not paged |
| `POST /api/admin/stadiums/{id}/notes` | body `{ text }`; response `StadiumNoteResponse`, `message: "Note added"` |

`AdminStadiumResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name`, `address` | string | |
| `district` | string? | absent on stadiums added before it existed |
| `photoUrl` | string? | the first photo by position; absent when there are none |
| `pricePerHour` | number **(tiyin)** | the base hourly price — the **owner's own**, as they set it |
| `playerPrice` | number? **(tiyin)** | what players see and pay for that hour (§1.10) |
| `ownerReceives` | number? **(tiyin)** | what the owner receives of that hour paid by card, after ATMOS |
| `atmosFee` | number? **(tiyin)** | what ATMOS takes of that hour paid by card (`playerPrice − ownerReceives`) |
| `ownerContractStatus` | string | the owner's ATMOS contract: `none` \| `pending` \| `signed` (`none` when no legal details) |
| `ownerName` | string | |
| `ownerId` | UUID | |
| `status` | string | §1.9 |
| `statusReason` | string? | why it is `rejected` or `blocked`; absent otherwise |
| `format`, `surfaceType` | string | |
| `averageRating` | number | `0` when no reviews |
| `reviewCount` | number | |
| `totalBookings` | number | `confirmed` + `completed` bookings |
| `totalRevenue` | number **(tiyin)** | card money kept on the stadium's bookings and games, all time — the same `appRevenue` as the payments summary, **cash excluded** |
| `createdAt` | timestamp (UTC) | |

`AdminStadiumDetailResponse` (`NON_NULL`) — every `StadiumDetailResponse`
field (§4) at the top level, in the **owner's prices** (`pricePerHour` and
`minBookingAmount` the owner's own, with `playerPrice`,
`playerMinBookingAmount`, and `ownerReceives`/`atmosFee` for one hour), including
`district`, `statusReason`, `photos`, `amenities`, `cancellationPolicy`,
`ownerPhone`, `openTime`/`closeTime` (no `isFavorited`), plus:

| Field | Type | Notes |
|---|---|---|
| `photoUrl` | string? | first photo |
| `ownerContractStatus` | string | as on the row |
| `cancellationHours` | number | the same value as `cancellationPolicy.cancellationHours` |
| `averageRating` | number? | |
| `reviewCount`, `totalBookings` | number? | as on the row |
| `totalRevenue` | number? **(tiyin)** | as on the row |
| `pricingRules` | `PricingRuleResponse[]` | active rules, each with `pricePerHour` (the owner's own), `playerPrice`, `ownerReceives`, `atmosFee` (§10.4) |

**Status body** (`AdminUpdateStadiumStatusRequest`)

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | yes | `@NotBlank`; `@Pattern(approved\|blocked\|pending\|rejected)` — `"status: status must be approved, blocked, pending or rejected"` |
| `reason` | string | for `rejected` and `blocked` | trimmed, ≤ 500 — `"reason is required"`, `"reason must be at most 500 characters"` |

What each status does:

| `status` | Rules | Effect |
|---|---|---|
| `approved` | needs the owner's **signed** ATMOS contract with a recipient id, else 400 `"The owner's ATMOS contract is not signed"` — also when un-blocking | clears `statusReason`; sets the owner's `is_owner = true` (they need a **new token** before `/api/owner/**` admits them); notifies the owner. Audit `STADIUM_APPROVED`, or `STADIUM_UNBLOCKED` from `blocked` |
| `rejected` | **only from `pending`**, else 400 `"Only a pending stadium can be rejected"`; reason required | stores `statusReason`; notifies the owner. Audit `STADIUM_REJECTED` |
| `blocked` | reason required | stores `statusReason`; **cancels every future `pending`/`confirmed` booking with a full refund**; notifies the owner. Audit `STADIUM_BLOCKED` |
| `pending` | — | clears `statusReason`. Audit `STADIUM_STATUS_CHANGED` |

`rejected` and `blocked` stadiums are both invisible to players.

**Notes** — admins' internal notes, **never shown to owners or players**.
`StadiumNoteResponse` (all present): `id` UUID, `text` string, `authorId`
UUID, `authorName` string (the admin's name when they wrote it), `createdAt`
(UTC). `POST` body `{ "text": string }` — trimmed, 1–1000 chars, checked in
the service: `"text is required"`, `"text must be at most 1000 characters"`
(a missing body counts as empty). No edit or delete. Audit
`STADIUM_NOTE_ADDED` records the note's id, never its text.

**Errors** — 400 `"Invalid district"`, `"Invalid format"` (list filters), the status and note messages above; 404 `"Stadium not found"`.

#### Bookings and games

Read-only; no chat and no actions. A booking's or game's status history comes
from the audit log (`?entityType=booking&entityId=…`, `game`).

| Endpoint | Notes |
|---|---|
| `GET /api/admin/bookings` · paged | every booking, **newest `startsAt` first** |
| `GET /api/admin/bookings/{id}` | `AdminBookingResponse` |
| `GET /api/admin/games` · paged | every game, **newest `startsAt` first** |
| `GET /api/admin/games/{id}` | `AdminGameDetailResponse` |

Query parameters (both lists):

| Param | Type | Bookings | Games |
|---|---|---|---|
| `search` | string | the booking user's name/phone, or a walk-in's `clientName`/`clientPhone` | the creator's name, or the name of any team that has been in the game |
| `stadiumId` | UUID | | |
| `status` | string | a `booking.status` value (§1.9) | a `game.status` value |
| `from`, `to` | `LocalDate` | Tashkent days on `startsAt` | same |
| `userId` | UUID | bookings this user made | games this user created, played in, or led a team in |

`AdminBookingResponse` (`NON_NULL`) — every `BookingResponse` field (§5) at
the top level **in the admin view** (§1.10): `price` (what the player pays),
`ownerPrice`, `paidAmount`/`remainingAmount`, `paidInApp` (card money kept,
from payments in `paid`/`captured`/`completed`, given-back ones excluded —
now a `BookingResponse` field), `ownerReceives`, `atmosFee`, cancellation
figures — plus:

| Field | Type | Notes |
|---|---|---|
| `userName`, `userPhone` | string? | the booking user; absent on a walk-in (whose name is `clientName`) |
| `cashReceived` | number? **(tiyin)** | cash the owner marked as received; absent when none |
| `cashReceivedAt` | timestamp (UTC)? | when the owner last marked cash |

`AdminGameResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `type`, `status` | string | §1.9 |
| `stadiumId` | UUID | |
| `stadiumName` | string | |
| `startsAt`, `endsAt` | timestamp (UTC) | |
| `totalPrice` | number **(tiyin)** | the pitch's price in the **owner's** terms (the stored game total) — unlike the player-facing `GameResponse.totalPrice` (§9), which is what all players pay |
| `creatorId` | UUID | |
| `creatorName` | string | |
| `teamAName`, `teamBName` | string? | team games: the teams currently in it; absent while a side waits for an opponent |
| `currentPlayers`, `maxPlayers` | number? | casual and open games only |
| `bookingId` | UUID? | once the slot is booked |
| `cancelledAt` | timestamp (UTC)? | a cancelled game: from the audit entry that cancelled it (`GAME_CANCELLED` / `GAME_AUTO_CANCELLED`) |
| `cancellationReason` | string? | same source |
| `createdAt` | timestamp (UTC) | |

`AdminGameDetailResponse` (`NON_NULL`) — every `AdminGameResponse` field, plus:

| Field | Type | Notes |
|---|---|---|
| `teams` | `AdminGameTeamResponse[]`? | **`team_vs_team` only**: each is a `GameTeamResponse` (§9 — `side`, `price`, `remainderAmount`, `remainderStatus`, `paidInApp`, `cancellationDeadline`, `refundIfCancelledNow`, …) at the top level, **plus the admin-only** `platformFee` (the platform's fixed fee in the team's payment — what it nets), `ownerAdvance` and `ownerRemainder` (the owner's terms), `ownerReceives` (what the owner receives of the team's payments, after ATMOS; cash in full) and `atmosFee` (what ATMOS takes of its card payments), plus `players` |
| `participants` | `AdminGamePlayerResponse[]`? | casual and open games: every participant |
| `serviceFeePerPerson` | number? **(tiyin)** | casual and open games: the platform's fee per player |

`AdminGamePlayerResponse`: `userId` UUID, `userName` string (may be `null`),
`status` (`joined` \| `paid` \| `cancelled` \| `refunded`). A team's `players`
leave out the ones marked `cancelled` (a team that left took its players).

**Errors** — 400 `"to must be on or after from"`; 404 `"Booking not found"` / `"Game not found"`.

#### Payments

| Endpoint | Notes |
|---|---|
| `GET /api/admin/payments` · paged | every payment and refund, newest first; with `type=refund`, **`failed` refunds first**, then newest |
| `GET /api/admin/payments/{id}` | `AdminPaymentResponse` with `linkedPayments` |
| `GET /api/admin/payments/summary` | `AdminPaymentSummaryResponse`; `from` and `to` **both required** |
| `POST /api/admin/payments/{id}/retry-refund` | no body; `message: "Refund retried"` |
| `POST /api/admin/payments/{id}/mark-refunded` | body `{ reason }`; `message: "Refund marked as refunded"` |

List query parameters:

| Param | Type | Notes |
|---|---|---|
| `search` | string | payer name or phone, or `providerTxnId` |
| `type` | string | a `payment.paymentType` value (§1.9), case-insensitive — else 400 `"Invalid type"` |
| `status` | string | a `payment.status` value, case-insensitive — else 400 `"Invalid status"` |
| `method` | string | `card` \| `cash` — else 400 `"Invalid method"` |
| `stadiumId` | UUID | the booking's or the game's stadium |
| `from`, `to` | `LocalDate` | Tashkent days on `createdAt` |

`AdminPaymentResponse` (`NON_NULL`) — money in tiyin, **negative on a refund**;
`amount = ownerAmount + platformAmount`:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `createdAt` | timestamp (UTC) | |
| `userId` | UUID | the payer |
| `userName` | string | |
| `userPhone` | string? | |
| `paymentType` | string | §1.9 |
| `stadiumId`, `stadiumName` | UUID? / string? | the booking's, or for a game payment the game's |
| `bookingId`, `gameId` | UUID? | what it paid for |
| `amount`, `ownerAmount`, `platformAmount` | number **(tiyin)** | `amount` is the gross charged (or the cash taken) |
| `atmosFee` | number? **(tiyin)** | what ATMOS was expected to take, its rate on each split (`card_fee_expected`; 0 for cash). Was `cardFee`; on rows from before the one-player-price rule it is what the card fee and rounding added |
| `providerCommission` | number? **(tiyin)** | what ATMOS reports having taken; absent until it does |
| `commissionPercent` | number? | the booking commission stored on the row when it was taken; **0 on every new payment** (there is no booking commission any more) |
| `method` | string | `card` \| `cash` |
| `provider` | string | `atmos` \| `payme` \| `click` \| `cash` |
| `providerTxnId` | string? | the charge's transaction ids (comma-separated, one per split) or the hold id |
| `status` | string | §1.9 |
| `refundReason` | string? | |
| `refundOfPaymentId` | UUID? | on a refund: the payment it gives back |
| `failureReason` | string? | a refund the provider declined: its error, for the admin |
| `refundedManually` | boolean? | **only present when `true`** |
| `manualRefundReason` | string? | |
| `linkedPayments` | `LinkedPayment[]`? | **detail only**: a refund's original, or an original's refunds (oldest first) |

`LinkedPayment` (`NON_NULL`): `id` UUID, `paymentType` string, `amount`
number **(tiyin)**, `status` string, `method` string, `providerTxnId`
string?, `createdAt` (UTC).

`AdminPaymentSummaryResponse` — card money over the period, all **tiyin**, all
present (see "Revenue" below):

| Field | Notes |
|---|---|
| `appRevenue` | card money kept: the gross of every card payment whose money arrived in the period, less every card refund completed in the period. **Cash excluded** |
| `cardFees` | what ATMOS took of that money (`providerCommission`, estimated at the current `cardFeeBps` when none was reported; 0 on legacy Payme/Click rows) |
| `ownerPayouts` | what owners actually receive: their split less their share of the fee |
| `platformRevenue` | what the platform actually receives: its split less its share of the fee |
| `refunded` | card refunds completed in the period, **positive** (already taken off `appRevenue`) |
| `held` | everything on hold on players' cards **right now**, whatever the period |

`ownerPayouts + platformRevenue + cardFees = appRevenue`, always.

**Failed refunds.** A refund ATMOS declines never undoes the cancellation: the
refund row is saved `failed` with `failureReason`, its original becomes
`refund_failed` (the money is still owed), audit `REFUND_FAILED` (SYSTEM). The
reconcile job leaves both alone; an admin settles them with one of:

- **`retry-refund`** — reverses the same transactions again on the same row.
  Success: both rows `refunded`, audit `REFUND_RETRIED`. A decline is a normal
  **200**: still `failed`, with the new `failureReason` (also audited
  `REFUND_RETRIED`). ATMOS unreachable → **502** `"Payment provider unavailable"`
  and nothing changes. Retrying is idempotent — the money goes back once.
- **`mark-refunded`** — money returned outside the platform (cash, a bank
  transfer). Body `{ "reason": string }`, trimmed, 10–500 chars, checked in
  the service: `"reason is required"` (also for a missing body),
  `"reason must be at least 10 characters"`, `"reason must be at most 500 characters"`.
  Both rows `refunded`, `refundedManually: true`, `manualRefundReason`; audit
  `REFUND_MARKED_MANUAL` with the reason.

Both take the **refund row's** id and answer the refreshed
`AdminPaymentResponse` (with `linkedPayments`). Only a `failed` refund
qualifies: 400 `"Only a failed refund can be retried"` /
`"Only a failed refund can be marked as refunded"`.

**Errors** — 400 `"Invalid type"`, `"Invalid status"`, `"Invalid method"`, `"to must be on or after from"`, `"from and to are required"` (summary), the refund messages above; 404 `"Payment not found"`; 502 `"Payment provider unavailable"` (retry only).

#### Owner applications

| Endpoint | Notes |
|---|---|
| `GET /api/admin/owner-applications` · paged | newest first |
| `GET /api/admin/owner-applications/pending` · paged | **oldest first** |
| `GET /api/admin/owner-applications/{id}` | |
| `PUT /api/admin/owner-applications/{id}/review` | body `{ status, reviewNote? }`, `status` `@NotBlank @Pattern(approved\|rejected)`; `message: "Application reviewed"` |

**Errors** — 400 `"This application has already been reviewed"`; 403 `"Admin access required"` (re-checked against the live row); 404 `"Owner application not found"`.

#### Platform settings

| Endpoint | Notes |
|---|---|
| `GET /api/admin/settings` | `PlatformSettingsResponse` |
| `PUT /api/admin/settings` | all four fields optional, only non-null values applied; `message: "Settings updated"` |

`PlatformSettingsResponse` (all present):

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID | | |
| `teamGamePlatformFee` | number **(tiyin)** | 2 500 000 | per team on a team game — the platform's only money in one |
| `casualGameServiceFee` | number **(tiyin)** | 0 | per player on a casual game |
| `cardFeeBps` | number | 150 | the ATMOS fee in **basis points** (150 = 1.5%); player prices are grossed up by it (§1.10) |
| `paymentRoundingStep` | number **(tiyin)** | 10 000 | player prices are rounded **up** to a multiple of it (10 000 = 100 so'm) |
| `updatedAt` | timestamp (UTC) | | |

There is **no booking commission**: the platform takes nothing from ordinary
bookings. `bookingCommissionPercent` is gone from the response and the body
(changeset 040 dropped the column); a body that still sends it is silently
ignored (Jackson's default). Old `SETTINGS_CHANGED` audit entries can still
carry a `bookingCommissionPercent` change.

**Body** — the same four value fields, validated in the service (not bean
validation), all before the first write, so a rejected value writes
**nothing**:

| Field | Range | Message |
|---|---|---|
| `teamGamePlatformFee` | ≥ 0 | `"teamGamePlatformFee must not be negative"` |
| `casualGameServiceFee` | ≥ 0 | `"casualGameServiceFee must not be negative"` |
| `cardFeeBps` | 0–1000 | `"cardFeeBps must be between 0 and 1000"` |
| `paymentRoundingStep` | 1–1 000 000 | `"paymentRoundingStep must be between 1 and 1000000"` |

An update that changes nothing writes no audit entry; otherwise one
`SETTINGS_CHANGED` lists each changed field.

#### Stats

| Endpoint | Response |
|---|---|
| `GET /api/admin/stats` | `AdminPlatformStatsResponse` |
| `GET /api/admin/stats/revenue` | `OwnerRevenueResponse` — the last **30 Tashkent days**, today included, oldest first, **every day present** |
| `GET /api/admin/stats/bookings-daily` | `DailyBookingCountResponse[]` — the same 30 days, every day present |

`AdminPlatformStatsResponse` — all numbers, all present except
`oldestFailedRefundAt`. Day/week/month boundaries are Tashkent time; weeks start
Monday 00:00.

| Field | Notes |
|---|---|
| `totalUsers`, `totalOwners` | |
| `newUsersToday`, `newUsersThisWeek`, `newUsersThisMonth` | `ThisWeek` = since Monday 00:00 |
| `newUsersLast7Days` | the last 7 × 24 hours, whatever the weekday |
| `totalStadiums`, `approvedStadiums`, `pendingStadiums`, `blockedStadiums`, `rejectedStadiums` | by `status` |
| `pendingStadiumApprovals` | = `pendingStadiums` |
| `totalBookings`, `todayBookings`, `weekBookings`, `monthBookings` | `confirmed` + `completed` bookings, by `startsAt` |
| `totalRevenue`, `todayRevenue`, `weekRevenue`, `monthRevenue` **(tiyin)** | `appRevenue` — card money kept, **cash excluded**, the same calculation as the payments summary |
| `totalGames`, `activeGames` | `activeGames` = `status = open` |
| `pendingOwnerApplications` | |
| `todayBookingsLastWeek` | bookings starting on the same weekday last week, counted like `todayBookings` |
| `previousMonthRevenueToDate` **(tiyin)** | last month from the 1st to the same day of the month (its last day if shorter), counted like `monthRevenue` |
| `newUsersPrevious7Days` | users created 7 to 14 days ago — the period before `newUsersLast7Days` |
| `approvedStadiumsWeekAgo` | how many stadiums were approved 7 days ago (rebuilt from the audit log's status changes) |
| `failedRefunds` | refund rows in `failed` still waiting for an admin (retry or mark refunded) — the sidebar badge |
| `oldestFailedRefundAt` | timestamp (UTC)? — `createdAt` of the oldest of those; **omitted when there are none** |

The previous-period fields are raw values: the panel works out the %.

`GET /api/admin/stats/revenue` — `OwnerRevenueResponse`: `stadiumId` is sent
as **`null`** (the DTO is not `NON_NULL`), `dailyRevenue`
`{ date: LocalDate, revenue: number (tiyin), bookingCount: number }[]` —
`revenue` is that day's `appRevenue`; `bookingCount` is the same figure as
`/stats/bookings-daily` (bookings starting that day), no longer a payment count.

`DailyBookingCountResponse` (all present): `date` (`LocalDate`, Tashkent),
`bookingCount` number — bookings **starting** that day that are `confirmed`
or `completed` (as `todayBookings` counts).

**Revenue** — one calculation (`RevenueService`) behind the payments summary,
the overview's `…Revenue` figures, the 30-day chart and a stadium's
`totalRevenue`, so they always agree. `appRevenue` counts card payments whose
money arrived (`paid`, `captured`, `completed`, or since `refunded` /
`refund_failed`) when they were taken, less card refunds when they completed.
Cash is excluded from all of them ("ilova orqali"). The owner dashboard's
revenue (§10.7) is still its own definition.

#### Audit log

Read-only; there is no endpoint that changes or deletes an entry.

| Endpoint | Response |
|---|---|
| `GET /api/admin/audit-log` · paged | `AuditLogResponse`, **newest first** |
| `GET /api/admin/audit-log/actions` | `string[]` — every action code, for a filter dropdown |

Query parameters of `GET /api/admin/audit-log`, all optional, combined with AND:

| Param | Type | Notes |
|---|---|---|
| `actor` | string | case-insensitive match on the actor's current name, username and phone, and the name saved on the entry |
| `actorType` | string | `ADMIN`, `OWNER`, `PLAYER`, `SYSTEM` (case-insensitive) |
| `action` | string, repeatable | `?action=A&action=B` or `?action=A,B` — any of these codes |
| `entityType` | string | e.g. `stadium`, `user` — see the entity types below |
| `entityId` | UUID | one thing's history (with `entityType`) |
| `from`, `to` | `LocalDate` | **Tashkent** calendar days, both inclusive; `to` before `from` → 400 `"to must be on or after from"` |

`AuditLogResponse` (`NON_NULL`):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `time` | string (UTC) | |
| `actor` | object? | `{ id?, name?, type? }` — `id`/`name` absent for SYSTEM; `name` is the name **as it was then**; `type` absent only on old rows; the whole object is absent on an old system row |
| `action` | string | a code from `AuditAction` (below); old rows may carry other codes, e.g. `PLATFORM_SETTINGS_UPDATED` |
| `entity` | object | `{ type?, id?, label? }` — `label` is saved at the time, e.g. `"Chilonzor Arena, 2026-11-02 20:00 (2h)"` |
| `changes` | `{ field, oldValue, newValue }[]` | **always present** (empty when nothing changed or on an old row). `oldValue` absent/null on a creation, `newValue` on a deletion. Values: numbers (money **tiyin**), booleans, strings (times UTC ISO-8601, dates, UUIDs, lowercase enum values, decimals), or lists of those |
| `reason` | string? | reject / block / cancel / review note; the provider's error on `REFUND_FAILED` |
| `ip` | string? | ADMIN entries and admin logins |
| `details` | string? | legacy free-form JSON, only on rows written before changeset 029 |

**Actor types:** `ADMIN`, `OWNER`, `PLAYER`, `SYSTEM` — the role the action
was done in, not the user's flags.

**Entity types:** `user`, `stadium`, `owner_application`, `platform_settings`,
`pricing_rule`, `stadium_closure`, `promotion`, `booking`,
`booking_series`, `game`, `payment`.

**Action codes** (`audit/AuditAction.java`):

| Area | Codes |
|---|---|
| Admin | `ADMIN_LOGIN_SUCCEEDED`, `ADMIN_LOGIN_FAILED`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `STADIUM_APPROVED`, `STADIUM_REJECTED` (pending → rejected; before changeset 038, pending → blocked), `STADIUM_BLOCKED`, `STADIUM_UNBLOCKED` (blocked → approved), `STADIUM_STATUS_CHANGED` (back to pending) — each with `status` and `statusReason` changes, `STADIUM_NOTE_ADDED` (entity `stadium`; records the note's id as `noteId`, never its text), `USER_BLOCKED`, `USER_UNBLOCKED`, `USER_ROLE_CHANGED`, `OWNER_LEGAL_DETAILS_CHANGED` (entity `user`), `REFUND_RETRIED`, `REFUND_MARKED_MANUAL` (entity `payment`, the refund row), `SETTINGS_CHANGED` |
| Owner | `STADIUM_CREATED`, `STADIUM_UPDATED`, `PRICING_RULE_CREATED` / `_UPDATED` / `_DELETED`, `CLOSURE_CREATED` / `_DELETED`, `PROMOTION_CREATED` / `_DEACTIVATED`, `MANUAL_BOOKING_CREATED`, `CASH_RECEIVED`, `BOOKING_CANCELLED_BY_OWNER` |
| Player | `BOOKING_CREATED`, `BOOKING_CANCELLED_BY_USER`, `BOOKING_REMAINDER_PAID`, `BOOKING_SERIES_CREATED` / `_CANCELLED`, `GAME_CREATED`, `GAME_JOINED`, `GAME_LEFT`, `GAME_CANCELLED`, `GAME_OPPONENT_LEFT`, `GAME_REMAINDER_PAID`, `PROFILE_UPDATED` (entity `user`; `PATCH /api/users/me`, the phone itself never logged, only `phoneChanged`), `PHONE_SHARED_VIA_BOT` (the player shared their phone through the Telegram bot) |
| System | `BOOKING_CONFIRMED`, `BOOKING_EXPIRED`, `BOOKING_COMPLETED`, `BOOKING_CANCELLED_BY_OWNER` (by a stadium block), `GAME_CONFIRMED`, `GAME_AUTO_CANCELLED`, `PAYMENT_COMPLETED`, `PAYMENT_RELEASED`, `REFUND_CREATED`, `REFUND_FAILED` (ATMOS declined a refund; entity `payment` = the original; `reason` = its error), `PROMOTION_EXPIRED` |

New since `ed5dec6`: `STADIUM_NOTE_ADDED`, `OWNER_LEGAL_DETAILS_CHANGED`,
`REFUND_RETRIED`, `REFUND_MARKED_MANUAL`, `REFUND_FAILED`.

**Change fields written** (`grep '.change(|.created(' ` in the services):
`status`, `statusReason`, `paymentStatus`, `paidAmount`, `price`,
`totalPrice`, `amount`, `refundAmount`, `releasedAmount`, `refundPaymentId`,
`bookingId`, `method`, `provider`, `paymentOption`, `startsAt`, `endsAt`,
`durationHours`, `dayOfWeek`, `startTime`, `endTime`, `startDate`, `endDate`,
`pricePerHour`, `discountPercent`, `name`, `clientName`, `type`,
`maxPlayers`, `team`, `teamA`, `side`, `players`, `isActive`, `isOwner`,
`isAdmin`, `isBlocked`, `failedLoginAttempts`, `lockedUntil`, `lastLoginAt`,
`teamGamePlatformFee`, `casualGameServiceFee`,
`cardFeeBps`, `paymentRoundingStep`, `noteId`, `failureReason`,
`originalStatus`, `refundedManually`; on `PROFILE_UPDATED`: `firstName`,
`lastName`, `name`, `language`, and `phoneChanged` (`false` → `true`, also
the only change on `PHONE_SHARED_VIA_BOT`); the legal-details snapshot: `legalType`,
`tin`, `atmosContractStatus`, `atmosRecipientId`; plus the stadium snapshot
(`StadiumService.auditSnapshot`): `address`, `district`, `latitude`,
`longitude`, `phone`, `description`, `format`, `surfaceType`, `openTime`,
`closeTime`, `minBookingAmount`, `cancellationHours`, `photos`,
`amenities.parking` / `.lighting` / `.showers` / `.lockerRoom` / `.wifi` /
`.cafe` / `.equipmentRental`. `bookingCommissionPercent` is no longer
written (since `057ac44`), but older `SETTINGS_CHANGED` entries still carry
it — keep a label for it. Secret-looking fields (password, hash, token,
card number, cvv, secret, jwt) are never recorded.

**Stadium status changes** — since changeset 038 a rejection is
`pending → rejected` (`STADIUM_REJECTED`). Changeset 038 converted old
rejections: a `blocked` stadium whose latest status action was
`STADIUM_REJECTED` became `rejected`, and every blocked or rejected stadium
took its `statusReason` from that latest action. Older audit rows still show
`STADIUM_REJECTED` with `status: pending → blocked`.

---

## Webhooks — called by Telegram / payment providers, **not by the frontend**

Listed for completeness only. All three are public (no JWT) and must never be
called from the client.

| Endpoint | Caller | Notes |
|---|---|---|
| `POST /webhooks/payme` | Payme | mock — accepts any body, extracts `txnId`/`transactionId`/`providerTxnId`/`id` and `status`. **`TODO: Verify Payme request signature`** |
| `POST /webhooks/click` | Click | mock — same shape. **`TODO: Verify Click request signature`** |
| `POST /webhooks/telegram` | Telegram | the bot's update handler; since `ed403c7` it is secret-checked. The bot opens the Mini App as `MINIAPP_URL?startapp=<payload>`, because Telegram passes no `start_param` to `web_app` buttons — the Mini App reads the payload from the URL |

---

## 11. Questions about the backend

Things that look unfinished, inconsistent or unclear. **Nothing here has been
changed** — this is a list for the backend author.

**Resolved in `ed5dec6..00d3bb7`:** Q4 (CORS, R1, `e2f5f67`). Also the
admin-side gaps tracked in `docs/backend-requests.md`: admin revenue ignored
card payments (R6, `58274e1` — one `RevenueService` calculation, card money
kept, cash excluded), and R3, R4, R5, R8–R17. The **owner** dashboard revenue
(Q8) is still its own definition and not resolved. Q9 and Q12 are partly
answered.

**`00d3bb7..d2c55a2` (one player price):** resolves nothing listed here;
Q19 and Q20 are new.

**`d2c55a2..4d5faf0`:** resolves Q19 (R18 — `paidAmount + remainingAmount =
price` in every view). Also shipped: R19–R23 from `docs/backend-requests.md`
(dev sign-in, profile fields, blocked reason, Uzbek by default, the player
stadium list fields and slot `status`); a booking is now exactly one hour.

**`ed403c7..253f585`:** resolves nothing listed here; ships R26 (the dev
sign-in requires `X-Dev-Login-Key`, §2).

**`253f585..5cc6ef6`:** resolves Q5 (R36, `29739b6` — photo upload) and Q6
(R37, `f2af228` — the owner's cash on an ordinary booking, at
`/api/owner/bookings/{id}/cash`). Also ships R32 (team invite links), R35,
R38, R39, R41, R42 and R43 from `docs/backend-requests.md`. Q11 still stands:
R42 only lets a not-yet-owner add and list stadiums; the rest of
`/api/owner/**` still needs a fresh token after approval.

**`5cc6ef6..9e9acb5`:** resolves nothing listed here. Q1 is answered a little
further (card binding and `PAYMENT_PENDING` carry a `code`; payment declines
still do not — R44). Q3 stands. New: a game being joined stays on the
challenge board (R45); with real ATMOS `/api/cards/resend` always answers
`SMS_RESEND_UNAVAILABLE` (no binding resend documented by ATMOS).

**Q1 — Most errors still have no `code`.** _Partly answered:_ the envelope
now has an optional `code` (§1.2), but only the admin-login errors and
`TOKEN_REVOKED` set it; everything else is prose only. Clients that want to react
to a specific failure (for example telling "already booked" apart from
"outside opening hours", both of which can arrive as a 400/409 with prose)
have to match on the English `message` string, which is brittle and cannot be
translated. A stable machine-readable `code` would fix both. Until then the
frontend branches on HTTP status and, where it must, on the exact string.

**Q2 — There is no Telegram Login Widget endpoint.** _(Resolved — not needed.)_
`AuthController` exposes only `POST /api/auth/telegram`, which takes Mini App
`initData`. The backend `CLAUDE.md` describes a second flow ("Telegram Login
Widget (web dashboard) — same flow, different payload format"), but no
endpoint accepts the widget's payload (`id`, `first_name`, `username`,
`auth_date`, `hash` as separate fields — a different `data_check_string` and a
different secret derivation from the Mini App's). _Since `265ffbf` admins
sign in with a username and password (`POST /api/auth/admin/login`) instead;
the panel no longer has any Telegram login, and request R2 was withdrawn._

**Q3 — `JoinGameRequest.gameId` is `@NotNull` but unused.**
`POST /api/games/{id}/join` takes the id from the path (`@RequestBody(required = false)`),
yet the DTO still declares `gameId` as `@NotNull`. Sending **no body** works;
sending a body without `gameId` fails with 400 `"gameId: must not be null"`.
Either the field should be dropped or the annotation removed.

**Q4 — No CORS configuration anywhere.** _(Resolved in `e2f5f67`, request R1: CORS for `/api/**` from `CORS_ALLOWED_ORIGINS`, off by default — see §1.1.)_
There is no `CorsConfig`, no `@CrossOrigin`, and no `cors(...)` in
`SecurityConfig` — a search for CORS across `src/` finds nothing. The backend
`CLAUDE.md` lists `config/CorsConfig.java` in the project structure, but the
file does not exist. A browser frontend on a different origin (Vite dev server
on `:5173`, the Mini App on its hosted origin, the admin panel) cannot call
this API at all until CORS is configured. **This blocks all browser-based
frontend work** and needs an allowed-origins list.

**Q5 — No file/photo upload endpoint.** _(Resolved in `29739b6`, request R36: `POST /api/owner/stadiums/{id}/photos` takes a multipart `file` (JPEG/PNG/WebP, ≤ 10 MB, ≤ 10 photos), stores it on the backend's filesystem and serves it publicly at `GET /api/uploads/stadiums/{stadiumId}/{file}`; plus delete and reorder — §4.)_
`CreateStadiumRequest.photos` and `UpdateStadiumRequest.photos` are
`List<String>` of URLs (max 500 chars). Nothing in the API accepts an image, so
it is unclear where an owner's photos are meant to be hosted and how the
frontend should produce those URLs.

**Q6 — `POST /api/bookings/{id}/cash` does not exist.** _(Resolved in `f2af228`, request R37: the endpoint is `POST /api/owner/bookings/{id}/cash` — no body, takes `remainingAmount`, answers the owner's `BookingResponse`, `"Cash recorded"` — §5. The backend `CLAUDE.md` now documents that path.)_
The backend `CLAUDE.md` documents it ("the owner marks the same money as
received in cash (it takes `remainingAmount`, not the full price)") as one of
the two ways a booking remainder is settled, and the `PaymentService` has the
machinery. But `BookingController` has no `cash` mapping — only
`POST /api/games/{id}/cash` exists, for team games. So an owner currently
**cannot** record cash against a partially-paid ordinary booking.

**Q7 — One hard-coded Uzbek error message, and it hard-codes "3".**
`TeamGameService.TOO_LATE_TO_JOIN` is
`"O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi"`. Every other
API message is English, so the frontend's translation layer has to special-case
this one. _Since `9e9acb5` it is no longer the only one: the card-binding
messages (§7.1), the 502 "To'lov tizimi vaqtincha ishlamayapti…" (§1.7) and the 202
`PAYMENT_PENDING` message are Uzbek too. The card ones and the 202 carry a `code`; the Mini App matches the
502 on its exact text, to tell it from a proxy's 502 whose outcome is unknown._ It also writes "3" into the text while the cutoff itself is
configurable (`app.game.opponent-deadline-hours`), so changing the setting
makes the message wrong.

**Q8 — Owner revenue is defined two different ways.**
`GET /api/owner/dashboard/stadiums/{id}/stats` sums only payments with
`payment_type = booking`, so a confirmed game contributes 0 even though it
produced a `source = game` booking on the pitch.
`GET /api/owner/dashboard/stadiums/{id}/schedule` sums booking prices instead
and therefore does include it. The same stadium reports two different revenue
figures and the frontend cannot tell which to show. (Already noted as deferred
in the backend `CLAUDE.md`.)

**Q9 — Money is documented as so'm in some places and tiyin in others.** _Partly answered in `1f18777..8c79245`: `Booking.price` now says "the owner's net price in tiyin" (since `057ac44`: "the owner's own price in tiyin"); `Stadium.pricePerHour`, `Game.totalPrice`, `PricingRule.pricePerHour` and the `Booking` / `Payment` class comments ("All money is integer so'm") still say so'm._
The project rule is tiyin everywhere, and the API does return tiyin. But
several entity Javadocs still say "Integer so'm — never floating point for
money": `Booking.price`, `Stadium.pricePerHour`, `Game.totalPrice` — while
their neighbours (`Booking.paidAmount`, `Stadium.minBookingAmount`) correctly
say tiyin. The comments are stale, not the behaviour, but they are the first
thing a reader checks.

**Q10 — `Booking` status list in the entity is missing a value.**
`Booking.status`'s Javadoc lists `pending, confirmed, completed, expired,
cancelled_by_user, cancelled_by_owner`, but changeset 026 added
`cancelled_opponent_left`, which `BookingService` writes when a team leaves a
confirmed game. A client generating a status union from that comment would
miss it. (It is documented in §1.9 above from the changeset, not the comment.)

**Q11 — Roles live in the JWT but can change underneath it.**
`isOwner`/`isAdmin` are read from the token claims, while `is_blocked` is
re-read from the database on every request. So blocking takes effect
instantly, but a newly approved owner keeps getting 403 from `/api/owner/**`
for up to 24 h unless the client knows to re-authenticate. There is no refresh
endpoint. The Mini App can re-post `initData` silently; the admin panel cannot
(it would need the password again). It would help if `/api/users/me` returning different flags from the
token were a documented signal to re-login.

**Q12 — Payment and refund paths are still mocks.** _Partly answered in `27656b4..ee75ccc`: the real ATMOS client (`AtmosPaymentProvider`) exists, active only under the `atmos` profile; a declined refund is now recorded (`refund_failed`, §10.9) instead of rolling back, and `PaymentReconcileJob` settles `processing` / `return_pending` / `capture_pending` rows. The default is still `fake`, and Payme/Click and their webhooks are unchanged (legacy, signature not verified)._
`app.payments.provider` defaults to `fake` (`FakePaymentProvider`: SMS code
always `111111`, a card ending `0002` always declines). `PaymeProvider` and
`ClickProvider` return a fake checkout URL, and both webhooks trust the body
without verifying a signature. Real ATMOS integration is pending, so any
frontend payment flow can only be tested against the fake provider for now.

**Q13 — `POST /api/teams/{id}` detail has no membership check.**
`GET /api/teams/{id}` returns the full member list (user ids and names) to
**any** logged-in user. If team membership is meant to be private, this is a
leak; if it is public by design, it is worth saying so.

**Q14 — Manual bookings accept a past `startsAt`.**
`CreateBookingRequest.startsAt` is `@Future`, but
`CreateManualBookingRequest.startsAt` is only `@NotNull`. An owner can
therefore record a walk-in in the past. That may well be intentional
(back-filling yesterday's walk-in), but it is undocumented, and the two DTOs
also disagree on the field name for the length (`durationHours` vs `duration`)
— both now optional and only ever `1`.

**Q15 — The challenge board has no `district`.**
Stadiums have `district` since `9f4040a`, but `GameChallengeResponse` still
carries only `stadiumAddress` (its Javadoc still says "stadiums have no
district column"). A district filter or label on the board needs the field.

**Q16 — Some admin status filters are not validated.**
The backend `CLAUDE.md` says "unknown filter values are 400", and `role`,
`status` (users), `type`/`status`/`method` (payments), `district` and `format`
are. But `status` on `GET /api/admin/stadiums`, `/bookings` and `/games` is
compared as a raw string: an unknown value returns an empty page, not 400.

**Q17 — `blocked` is accepted from any stadium status.**
The backend `CLAUDE.md` describes `approved → blocked`, but
`PUT /api/admin/stadiums/{id}/status` only restricts `rejected` (from
`pending`); `blocked` is accepted from `pending` or `rejected` too (audited
`STADIUM_BLOCKED`). The panel should only offer it on approved stadiums.

**Q18 — `/api/admin/stats/revenue` sends `stadiumId: null`.**
It reuses `OwnerRevenueResponse`, which is not `NON_NULL`, so `stadiumId` is
an explicit `null` (unlike the usual omitted-when-null rule, §1.3). Type it
`stadiumId?: string | null` or ignore it.

**Q19 — The owner/admin view of `net` bookings mixes two currencies.** _(Resolved in `6383d85`, request R18: `BookingResponseFactory` converts a `net` booking's amounts to player terms for every view, so `paidAmount + remainingAmount = price` everywhere.)_
Bookings made before changeset 040, and every **game** booking, keep
`pricing_model = net`. For them `BookingResponseFactory.forOwner` returns
`price` as the player price (`playerAmount(ownerPrice)` — for a game booking
not what the teams actually pay, which `GameDetailResponse.totalPrice` sums
per team) but `paidAmount` / `remainingAmount` straight from the row, in the
owner's net terms — so `paidAmount + remainingAmount ≠ price` there, and the
player's view of the same booking shows a different (converted) remainder.
`PaymentService.recordCashPayment` would take the net remainder. The
`pricing_model` field is not in any response, so the client cannot tell which
case it is looking at. The backend `CLAUDE.md` "API fields" describes only the
player-price case. Expose `pricingModel`, or convert consistently.

**Q20 — `StadiumResponse.ownerReceives` / `atmosFee` are never filled.**
The DTO declares them "admin responses only", but no endpoint returns a
`StadiumResponse` to an admin (the admin list is `AdminStadiumResponse`, which
has its own), so they are always omitted. Dead fields, or a missing mapping?
