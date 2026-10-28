# MiniPolya Backend API Reference

Generated for the frontend from the backend source. **Do not hand-edit to add
endpoints or fields that are not in the backend** — regenerate from the source
when the backend changes.

| | |
|---|---|
| Backend repository | `../minipolyaBackend` |
| Branch | `main` |
| Commit | `12e3a91` (`12e3a91bd63012d5735e958791549975ba64d8e7`) — _Remove the nonexistent CorsConfig.java from CLAUDE.md_, 2026-10-28 |
| Generated | 2026-10-27; updated 2026-10-28 for `bba7504..12e3a91` (error codes, admin password login, token revocation) |
| Endpoints documented | **96** callable by the frontend, plus 3 webhooks |

---

## 1. Conventions

### 1.1 Base URL

The backend listens on port **8080** (`server.port` in `application.yaml`) and
every path below is absolute from the host root. The frontend takes the host
from `VITE_API_URL`, e.g. `VITE_API_URL=http://localhost:8080`.

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
| `success` | `boolean` | `true` on 2xx, `false` on every error |
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
| `ACCOUNT_BLOCKED` | 403 | — | `POST /api/auth/admin/login` (the filter's blocked 403 has no code) |
| `TOKEN_REVOKED` | 401 | — | **any** authenticated request (§1.5) |

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
  admin-panel tokens are ever revoked. The token returned by
  `POST /api/admin/me/password` is issued after the stamp and stays valid.

### 1.6 Access levels

`config/SecurityConfig.java`:

| Level | How it is enforced |
|---|---|
| **public** | `/api/auth/**`, `GET /api/stadiums/**`, `GET /api/reviews/stadium/**`, `/webhooks/**` |
| **user** | any other path — a valid JWT is required |
| **owner** | `/api/owner/**` → requires `ROLE_OWNER` (the `isOwner` claim) |
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
| 403 | `"Access denied"` | valid token, wrong role for `/api/owner/**` or `/api/admin/**` |
| 403 | `"Account is blocked"` | the user is blocked |
| 404 | `"<Thing> not found"` | `ResourceNotFoundException` |
| 409 | `"Data conflict"` | a database constraint other than the booking overlap |
| 410 | `"Booking has expired"` | `BookingExpiredException` |
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
| `stadium.status` | `pending`, `approved`, `blocked` |
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
| `payment.status` | `held`, `captured`, `released`, `paid`, `refunded`, `failed`, `pending`, `completed` |
| `ownerApplication.status` | `pending`, `under_review`, `approved`, `rejected` |
| `notification.type` | `booking_confirmed`, `booking_cancelled`, `booking_reminder`, `booking_expired`, `game_confirmed`, `game_cancelled`, `game_player_joined`, `game_player_left`, `game_payment_received`, `game_opponent_left`, `review_reply`, `stadium_approved`, `stadium_rejected`, `owner_application_status`, `promotion_new` |
| `notification.referenceType` | `booking`, `game`, `stadium`, `review`, `application` |
| `paymentOption` (request) | `MINIMUM`, `FULL` — **uppercase**, unlike the response enums |
| `teamMember.role` | `leader`, `member` (plain string) |

`game.status = open` means "waiting"; for a `team_vs_team` game it means one
team is waiting for an opponent and **the pitch is not booked yet**. The value
was deliberately not renamed because casual games share the column.

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
| 403 | `"Account is blocked"` |

**Notes**

- A first-time user is created with `name` from the Telegram first/last name,
  **no phone** (`initData` carries none, so `phone` is absent on the response)
  and `language` from Telegram's `language_code` when it is one of `uz`/`ru`/
  `en`, otherwise `uz`.
- The client must **never** trust `initData` itself — only this endpoint's
  answer. Verification needs `BOT_TOKEN`, which lives only on the server.
- There is **no refresh endpoint and no logout endpoint.** On a 401 the Mini
  App re-posts `initData`; the admin panel has to send the user back to login.
- **There is no Telegram Login Widget endpoint** for the admin panel. See
  [Q2](#11-questions-about-the-backend). Admins sign in with a username and
  password instead (next endpoint).

### `POST /api/auth/admin/login` — public

Admin panel sign-in. Admin accounts (username + BCrypt password hash) are
created directly in the database — there is no endpoint to create one. Only a
user with `is_admin = true` **and** a password can sign in here.

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
| `name` | string | |
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

**Body** — both fields optional; only non-null values are applied.

| Field | Type | Validation |
|---|---|---|
| `name` | string? | `@Size(min=1, max=120)` — `"name must be between 1 and 120 characters"` |
| `language` | string? | `@Pattern(uz\|ru\|en)` — `"language must be one of: uz, ru, en"` |

**Response** — the updated `UserResponse`.

**Errors** — 400 (validation); 401; 404 `"User not found"`.

---

## 4. Stadiums and availability

`StadiumResponse` — listing summary (`NON_NULL`)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name`, `address` | string | |
| `latitude`, `longitude` | number? | |
| `format`, `surfaceType`, `status` | string | §1.9 |
| `pricePerHour` | number **(tiyin)** | |
| `ownerName` | string? | |
| `isActive` | boolean | |
| `averageRating` | number? | absent when the stadium has no reviews |
| `reviewCount` | number? | |

No `photos` and no `amenities` — deliberately omitted to avoid a lazy load per
row. Fetch the detail endpoint for those.

`StadiumDetailResponse` (`NON_NULL`) — everything above except
`averageRating`/`reviewCount`, plus:

| Field | Type | Notes |
|---|---|---|
| `ownerId` | UUID | |
| `ownerName`, `ownerPhone` | string? | |
| `phone`, `description` | string? | |
| `openTime`, `closeTime` | time | `"09:00:00"` |
| `minBookingAmount` | number? **(tiyin)** | absent ⇒ the player must pay in full |
| `isFavorited` | boolean? | only present for an authenticated caller |
| `cancellationPolicy` | `{ cancellationHours: number }` | |
| `photos` | `{ id: UUID, url: string, position: number }[]` | ordered by `position` |
| `amenities` | `AmenitiesResponse` | `parking`, `lighting`, `showers`, `lockerRoom`, `wifi`, `cafe`, `equipmentRental`, `tribune` — all boolean |
| `createdAt`, `updatedAt` | timestamp (UTC) | |

### `GET /api/stadiums` — public · paged

Approved, active stadiums only.

| Query | Type | Required | Notes |
|---|---|---|---|
| `q` | string | no | free text search |
| `format` | string | no | `5x5` \| `7x7` \| `9x9` \| `11x11` |
| `maxPrice` | number (tiyin) | no | upper bound on `pricePerHour` |
| `page`, `size` | number | no | `0` / `20` |

**Response** — paged `StadiumResponse`.

### `GET /api/stadiums/{id}` — public

**Response** — `StadiumDetailResponse`. `isFavorited` is only filled in when a
JWT is sent (the endpoint is public, so the field is simply absent otherwise).

**Errors** — 400 `"Invalid id"`; 404 `"Stadium not found"`.

### `GET /api/stadiums/{stadiumId}/availability` — public

The hourly grid for one day: what is free, what each hour costs, and whether a
team is waiting on it.

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
| `available` | boolean | |
| `pricePerHour` | number? **(tiyin)** | absent when not available |
| `originalPrice` | number? **(tiyin)** | the price before the promotion; absent when there is none |
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

### `POST /api/owner/stadiums` — owner

**Body** — `CreateStadiumRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | yes | `@NotBlank @Size(max=150)` |
| `address` | string | yes | `@NotBlank @Size(max=300)` |
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
| `photos` | string[] | no | each non-blank, max 500 chars (URLs — there is no upload endpoint, see [Q5](#11-questions-about-the-backend)) |
| `amenities` | object | no | the eight booleans |

**Response** — `StadiumDetailResponse`, `message: "Stadium submitted for review"`.
The stadium is created with `status: "pending"` and is invisible to players
until an admin approves it.

**Errors** — 400 validation; 400 `"minBookingAmount must be at least 50000 tiyin (500 so'm)"`; 401; 403 `"Access denied"`.

**Note** — this path is behind `ROLE_OWNER`, so a user who is not yet an owner
cannot create their first stadium here; they go through
`POST /api/owner-applications` first (§9) and must then obtain a **new token**
for the `isOwner` claim to appear.

### `PUT /api/owner/stadiums/{id}` — owner

**Body** — `UpdateStadiumRequest`: every field of the create body optional
(only non-null values applied), plus `isActive` (boolean). `status` is
deliberately absent — only an admin changes it.

**Response** — `StadiumDetailResponse`.

**Errors** — 400 validation / `"minBookingAmount must be at least 50000 tiyin (500 so'm)"`; 403 `"You do not own this stadium"`; 404 `"Stadium not found"`.

### `GET /api/owner/stadiums` — owner

**Response** — `StadiumResponse[]` (not paged) for the calling owner, any
status.

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
| `durationHours` | number | |
| `price` | number **(tiyin)** | the whole pitch price |
| `paidAmount` | number **(tiyin)** | running total of successful payments |
| `remainingAmount` | number **(tiyin)** | `max(0, price − paidAmount)` |
| `paymentStatus` | string | `unpaid` \| `partially_paid` \| `paid` |
| `clientName`, `clientPhone` | string? | manual/walk-in bookings |
| `isWalkin` | boolean | |
| `expiresAt` | timestamp (UTC)? | the hold deadline while `pending` |
| `cancelledAt` | timestamp (UTC)? | |
| `cancellationReason` | string? | |
| `cancellationPolicy` | `{ cancellationHours }` | show before confirming |
| `cancellationDeadline` | timestamp (UTC)? | last moment a cancellation still refunds |
| `refundIfCancelledNow` | number **(tiyin)**? | **display this, never recompute it** |
| `refundAmount` | number **(tiyin)**? | only on a cancellation response: what was actually refunded |
| `createdAt` | timestamp (UTC) | |

### `POST /api/bookings` — user

Creates the booking **and charges the chosen saved card in the same call.**

**Body** — `CreateBookingRequest`

| Field | Type | Required | Validation |
|---|---|---|---|
| `stadiumId` | UUID | yes | `@NotNull` |
| `startsAt` | timestamp (UTC) | yes | `@NotNull @Future`; must be **on the hour in Asia/Tashkent** |
| `durationHours` | number | yes | `@NotNull @Min(1)` — `"durationHours must be at least 1"` |
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
| 400 | `"durationHours: durationHours must be at least 1"`, `"startsAt: must be a future date"`, … |
| 400 | `"Duration must be at least 1 hour"` |
| 400 | `"Booking must start on the hour"` |
| 400 | `"Stadium has no bookable hours"` (`closeTime <= openTime`) |
| 400 | `"Booking must start at or after <openTime>"` |
| 400 | `"Booking must end by <closeTime>"` |
| 400 | `"Stadium is closed on <date>"` (a `stadium_closure` overlaps) |
| 400 | `"Cannot book more than 4 weeks ahead"` |
| 400 | `"This stadium requires full payment; it has no minimum booking amount"` (`MINIMUM` on a stadium with no minimum) |
| 400 | `"The stadium minimum is not below this booking's price, so full payment is required"` |
| 403 | `"You cannot book your own stadium; add a manual booking instead"` |
| 404 | `"Stadium not available"` (missing, not approved, or inactive) |
| 404 | `"Card not found"` (unknown, not the caller's, or deactivated) |
| 404 | `"User not found"` |
| 409 | `"Slot is already booked"` (1-hour booking) |
| 409 | `"One or more of the selected hours is already booked"` (multi-hour) |

**Notes**

- Price = the sum of each hour's price from the pricing rules, with the best
  active promotion applied per hour — identical to what availability showed.
  **Never compute it in the client**; `price` on the response is authoritative.
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
| 400 | `"Already paid"` — the owner took it in cash first |
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
| `duration` | number | yes | `@NotNull @Min(1)` — note the name is `duration`, not `durationHours` |
| `notes` | string | no | |
| `paymentMethod` | string | no | `"cash"` or null |

**Response** — `BookingResponse`, `message: "Manual booking created"`.

**Errors** — the booking-window 400s above; 403 `"You do not own this stadium"`; 404 `"Stadium not found"`; 409 overlap.

### `GET /api/owner/stadiums/{stadiumId}/bookings` — owner · paged

| Query | Type | Required |
|---|---|---|
| `from`, `to` | `LocalDate` | no |
| `page`, `size` | number | no |

**Response** — paged `BookingResponse`. **Errors** — 403 `"You do not own this stadium"`.

### `DELETE /api/owner/bookings/{bookingId}` — owner

The owner cancels a booking. **Always a full refund** of every card payment,
whatever the time left.

| Query | Type | Required |
|---|---|---|
| `reason` | string | no |

**Response** — `BookingResponse`, `message: "Booking cancelled"`.

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
| `duration` | number (hours) |
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
| `duration` | number | yes | `@NotNull @Min(1)` |

**Response** — `BookingSeriesResponse`, `message: "Recurring booking created"`.

**Errors** — 400 `"Duration must be at least 1 hour"`, `"Booking must start on the hour"`, `"Requested time is outside the stadium's operating hours"`; 404 `"Stadium not found"`.

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
| `maskedNumber` | string | e.g. `"8600 •••• 1234"` |
| `cardType` | string | |
| `isActive` | boolean | |
| `createdAt` | timestamp (UTC) | |

There is **no token field** — payment calls take `cardId`.

#### `POST /api/cards` — user

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `cardNumber` | string | yes | `@Pattern(\d{16})` — `"cardNumber must be 16 digits"` |
| `expiry` | string | yes | `@Pattern(\d{2}/\d{2})` — `"expiry must be MM/YY"` |

**Response** — `{ "bindingId": string }`, `message: "SMS code sent"`. Nothing
is persisted yet; an abandoned binding expires at the provider.

**Errors** — 400 validation; 404 `"User not found"`.

#### `POST /api/cards/confirm` — user

**Body** — `{ "bindingId": string, "smsCode": string }` (both `@NotBlank`).

**Response** — `SavedCardResponse`, `message: "Card saved"`.

**Errors** — 400 validation; 404 `"User not found"`; a wrong SMS code or
unknown binding comes from the provider (with the fake provider the code is
always `111111`).

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
| `amount` | number **(tiyin)** | negative on a refund row |
| `ownerAmount`, `platformAmount` | number **(tiyin)** | always sum to `amount` |
| `commissionPercent` | number? | |
| `method` | string | `card` \| `cash` |
| `paymentType` | string | §1.9 |
| `provider` | string | `atmos` \| `payme` \| `click` \| `cash` |
| `providerTxnId` | string? | unique — makes webhooks idempotent |
| `status` | string | §1.9 |
| `refundReason` | string? | |
| `createdAt` | timestamp (UTC) | |

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
| `totalPrice` | number **(tiyin)** |
| `isPublic` | boolean |

`GameDetailResponse` (`NON_NULL`) — the above plus `description`, `stadiumId`,
`creatorId`, `minPlayers`, `serviceFeePerPerson` _(tiyin)_, `teamAId`,
`teamAName`, `teamBId`, `teamBName`, `bookingId`, `inviteLink` (Telegram deep
link `t.me/{bot}?start=game_{id}`), `createdAt`, plus:

`teams` — **`team_vs_team` only**, `GameTeamResponse[]`:

| Field | Type | Notes |
|---|---|---|
| `side` | `"a"` \| `"b"` | |
| `teamId`, `leaderId` | UUID | |
| `teamName`, `leaderName` | string? | |
| `feeAmount` | number **(tiyin)** | platform fee; **not** part of the pitch price |
| `advanceAmount` | number **(tiyin)** | owner advance paid up front |
| `remainderAmount` | number **(tiyin)** | still owed on the pitch |
| `remainderStatus` | `"unpaid"` \| `"paid"` | |
| `paidInApp` | number **(tiyin)** | everything this team has paid through the app |
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
| `duration` | number | yes | `@NotNull @Min(1)` |
| `teamAId` | UUID | **required for `team_vs_team`** | caller must be that team's leader |
| `cardId` | UUID | **required for `team_vs_team`** | ignored for other types |

**Response** — `GameDetailResponse`, `message: "Game created"`.

For `team_vs_team` the creating leader's card is put **on hold** for
`fee + advance`; no slot is booked and `status` stays `open` (= waiting).

**Errors**

| Status | `message` |
|---|---|
| 400 | validation; `"teamAId is required for a team_vs_team game"`; `"cardId is required to create a team game"` |
| 400 | `"Card payment was declined; the game was not created"` |
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
| `stadiumId` UUID, `stadiumName`, `stadiumAddress`, `format` | string | `stadiumAddress` stands in for a district — stadiums have no district column |
| `startsAt`, `endsAt` | timestamp (UTC) | |
| `durationHours` | number | |
| `totalPrice` | number **(tiyin)** | whole pitch price |
| `feeAmount` | number **(tiyin)** | platform fee the joining team pays |
| `advanceAmount` | number **(tiyin)** | owner advance the joining team pays |
| `amountToPayNow` | number **(tiyin)** | `fee + advance` — what the card is charged |
| `remainderAmount` | number **(tiyin)** | what the joining team still owes afterwards |

### `GET /api/games/my` — user · paged

Games the caller is in, latest `startsAt` first. **Response** — paged `GameResponse`.

### `POST /api/games/{id}/join` — user

**Body** — `JoinGameRequest`, and the **body as a whole is optional** (an
invited casual player or team member can POST with no body at all).

| Field | Type | Required | Validation |
|---|---|---|---|
| `gameId` | UUID | see note | `@NotNull` **but the path value is what is used** |
| `side` | `"a"` \| `"b"` | no | `@Pattern(a\|b)` |
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
| 400 | `"teamId is required to join as team B"`, `"cardId is required to join a team game"` |
| 400 | `"A team cannot play against itself"`, `"This game already has an opponent"` |
| 400 | `"O'yin boshlanishiga 3 soatdan kam qoldi, qo'shilib bo'lmaydi"` — past the 3-hour point (**the only Uzbek message the API returns**; see [Q7](#11-questions-about-the-backend)) |
| 403 | `"Only the team leader can accept"` |
| 404 | `"Game not found"` / `"Team not found"` / `"Card not found"` |
| 409 | `"That time slot is already booked"` |

### `POST /api/games/{id}/pay` — user

The **legacy casual** hosted checkout. Refuses a team game.

| Query | Type | Required |
|---|---|---|
| `provider` | string (`payme` \| `click`) | yes |

**Response** — `PaymentInitResponse`.

**Errors** — 400 `"Unknown payment provider: <name>"`; 404 `"Game not found"`.

### `POST /api/games/{id}/pay-remainder` — user (team leader)

A leader settles **their own team's** remainder from a saved card, before or
after the game.

**Body** — `{ "cardId": UUID }` (`@NotNull`).

**Response** — the refreshed `GameDetailResponse`, `message: "Remainder paid"`.

**Errors** — 400 `"Already paid"`, `"Card payment was declined; the remainder is still owed"`; 404 `"Game not found"` / `"Card not found"`.

### `POST /api/games/{id}/cash` — owner (the stadium's owner)

The owner marks one team's remainder as received in cash. Whichever of cash
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
(not a favourite wrapper).

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
`isActive` boolean, `createdAt` (UTC).

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
| `GET /api/owner/dashboard/stadiums` | `StadiumResponse[]` |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/stats` | `OwnerDashboardStatsResponse` |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/revenue` | `OwnerRevenueResponse` |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/schedule` | `OwnerScheduleResponse[]` |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/reviews` | paged `ReviewResponse`, newest first |
| `GET /api/owner/dashboard/stadiums/{stadiumId}/bookings` | paged `BookingResponse` |

`OwnerDashboardStatsResponse` (all fields present): `stadiumId` UUID,
`stadiumName` string, `todayBookings`/`weekBookings`/`monthBookings`/
`totalBookings` number, `todayRevenue`/`weekRevenue`/`monthRevenue`/
`totalRevenue` number **(tiyin)**, `averageRating` number, `reviewCount`
number, `occupancyPercent` number.

`OwnerRevenueResponse`: `stadiumId` UUID, `dailyRevenue`
`{ date: LocalDate, revenue: number (tiyin), bookingCount: number }[]`.

`OwnerScheduleResponse` (one per day; `from`/`to` are optional `LocalDate`
query parameters): `date`, `bookings` `BookingResponse[]`, `waitingGames`
`{ gameId: UUID, teamName: string, startsAt, endsAt }[]`, `totalSlots`,
`bookedSlots` number, `revenue` number **(tiyin)**.

> `waitingGames` are `team_vs_team` games looking for an opponent — the pitch
> is still free and the owner may take a walk-in for it.

> **Two revenue definitions.** `…/stats` sums only `payment_type = booking`
> rows; `…/schedule` sums booking prices. They disagree for game bookings —
> see [Q8](#11-questions-about-the-backend).

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
403 `"Access denied"`.

#### Own account — `POST /api/admin/me/password`

Body (`ChangePasswordRequest`): `currentPassword` string (`@NotBlank`
`"currentPassword is required"`), `newPassword` string (`@NotBlank`
`"newPassword is required"`, `@Size(min=10)` `"newPassword must be at least 10
characters"`, and at most 72 UTF-8 bytes).

Response: `AuthResponse` (`token`, `user`), `message: "Parol o'zgartirildi"`.
**Every token issued before the change — the caller's included — is revoked**
(401 `TOKEN_REVOKED`, §1.5); the client must store the returned token at once.

Errors: 400 `"Joriy parol noto'g'ri"` (wrong current password, or the account
has no password); 400 `"newPassword must be at most 72 bytes"`; 400
validation; 404 `"User not found"`.

#### Users

| Endpoint | Notes |
|---|---|
| `GET /api/admin/users` · paged | `?search=` optional; newest first |
| `GET /api/admin/users/{id}` | |
| `PUT /api/admin/users/{id}` | body `{ isOwner?, isAdmin?, isBlocked? }` — all optional booleans, nulls left unchanged; `message: "User updated"` |

`AdminUserResponse` (`NON_NULL`): `id` UUID, `name`, `phone` string?,
`telegramId` number?, `language` string, `isOwner`, `isAdmin`, `isBlocked`
boolean, `bookingCount`, `stadiumCount` number, `createdAt` (UTC),
`lastActiveAt` (UTC)?.

**Errors** — 400 `"You cannot remove your own admin access"`, `"You cannot block yourself"`; 404 `"User not found"`.

#### Stadiums

| Endpoint | Notes |
|---|---|
| `GET /api/admin/stadiums` · paged | `?status=`, `?search=` optional; newest first |
| `GET /api/admin/stadiums/{id}` | |
| `PUT /api/admin/stadiums/{id}/status` | body `{ status, reason? }`, `status` `@NotBlank @Pattern(approved\|blocked\|pending)`; `message: "Stadium status updated"` |

`AdminStadiumResponse` (`NON_NULL`): `id` UUID, `name`, `address`, `ownerName`
string, `ownerId` UUID, `status`, `format`, `surfaceType` string,
`averageRating` number, `reviewCount`, `totalBookings` number, `totalRevenue`
number **(tiyin)**, `createdAt` (UTC).

**Note** — approving a stadium also sets its owner's `is_owner = true`, so that
user needs a **new token** before `/api/owner/**` will admit them.

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
| `PUT /api/admin/settings` | all three fields optional; `message: "Settings updated"` |

`PlatformSettingsResponse` (all present): `id` UUID,
`bookingCommissionPercent` number (whole percent),
`teamGamePlatformFee` number **(tiyin)**, `casualGameServiceFee` number
**(tiyin)**, `updatedAt` (UTC).

**Body** — `bookingCommissionPercent` (0–50), `teamGamePlatformFee` (≥ 0,
tiyin), `casualGameServiceFee` (≥ 0, tiyin). Validated in the service, not by
bean validation, so a rejected value writes **nothing**.

**Errors** — 400 `"<field> must not be negative"` (and the commission range message).

#### Stats

| Endpoint | Response |
|---|---|
| `GET /api/admin/stats` | `AdminPlatformStatsResponse` |
| `GET /api/admin/stats/revenue` | `OwnerRevenueResponse` (platform-wide; `stadiumId` is not meaningful here) |

`AdminPlatformStatsResponse` — all numbers, all present:
`totalUsers`, `totalOwners`, `newUsersToday`, `newUsersThisWeek`,
`newUsersThisMonth`, `totalStadiums`, `approvedStadiums`, `pendingStadiums`,
`blockedStadiums`, `totalBookings`, `todayBookings`, `weekBookings`,
`monthBookings`, `totalRevenue` **(tiyin)**, `todayRevenue` **(tiyin)**,
`weekRevenue` **(tiyin)**, `monthRevenue` **(tiyin)**, `totalGames`,
`activeGames`, `pendingOwnerApplications`, `pendingStadiumApprovals`.

#### Audit log

| Endpoint | Response |
|---|---|
| `GET /api/admin/audit-log` · paged | newest first |
| `GET /api/admin/audit-log/user/{userId}` · paged | newest first |
| `GET /api/admin/audit-log/entity/{type}/{id}` | `AuditLogResponse[]` (not paged) |

`AuditLogResponse` (`NON_NULL`): `id`, `userId` UUID, `userName` string?,
`action`, `entityType` string, `entityId` UUID?, `details` string? (a JSON
string, not an object), `ipAddress` string?, `createdAt` (UTC).

`{type}` is the raw `entity_type` string, e.g. `booking`, `stadium`, `game`,
`user`.

---

## Webhooks — called by Telegram / payment providers, **not by the frontend**

Listed for completeness only. All three are public (no JWT) and must never be
called from the client.

| Endpoint | Caller | Notes |
|---|---|---|
| `POST /webhooks/payme` | Payme | mock — accepts any body, extracts `txnId`/`transactionId`/`providerTxnId`/`id` and `status`. **`TODO: Verify Payme request signature`** |
| `POST /webhooks/click` | Click | mock — same shape. **`TODO: Verify Click request signature`** |
| `POST /webhooks/telegram` | Telegram | placeholder — logs the update. **`TODO: Verify the Telegram secret token header`** |

---

## 11. Questions about the backend

Things that look unfinished, inconsistent or unclear. **Nothing here has been
changed** — this is a list for the backend author.

**Q1 — Most errors still have no `code`.** _Partly answered:_ the envelope
now has an optional `code` (§1.2), but only the admin-login errors and
`TOKEN_REVOKED` set it; everything else is prose only. Clients that want to react
to a specific failure (for example telling "already booked" apart from
"outside opening hours", both of which can arrive as a 400/409 with prose)
have to match on the English `message` string, which is brittle and cannot be
translated. A stable machine-readable `code` would fix both. Until then the
frontend branches on HTTP status and, where it must, on the exact string.

**Q2 — There is no Telegram Login Widget endpoint.**
`AuthController` exposes only `POST /api/auth/telegram`, which takes Mini App
`initData`. The backend `CLAUDE.md` describes a second flow ("Telegram Login
Widget (web dashboard) — same flow, different payload format"), but no
endpoint accepts the widget's payload (`id`, `first_name`, `username`,
`auth_date`, `hash` as separate fields — a different `data_check_string` and a
different secret derivation from the Mini App's). _Since `265ffbf` admins can
sign in with a username and password instead (`POST /api/auth/admin/login`),
so this no longer blocks the admin panel._

**Q3 — `JoinGameRequest.gameId` is `@NotNull` but unused.**
`POST /api/games/{id}/join` takes the id from the path (`@RequestBody(required = false)`),
yet the DTO still declares `gameId` as `@NotNull`. Sending **no body** works;
sending a body without `gameId` fails with 400 `"gameId: must not be null"`.
Either the field should be dropped or the annotation removed.

**Q4 — No CORS configuration anywhere.**
There is no `CorsConfig`, no `@CrossOrigin`, and no `cors(...)` in
`SecurityConfig` — a search for CORS across `src/` finds nothing. The backend
`CLAUDE.md` lists `config/CorsConfig.java` in the project structure, but the
file does not exist. A browser frontend on a different origin (Vite dev server
on `:5173`, the Mini App on its hosted origin, the admin panel) cannot call
this API at all until CORS is configured. **This blocks all browser-based
frontend work** and needs an allowed-origins list.

**Q5 — No file/photo upload endpoint.**
`CreateStadiumRequest.photos` and `UpdateStadiumRequest.photos` are
`List<String>` of URLs (max 500 chars). Nothing in the API accepts an image, so
it is unclear where an owner's photos are meant to be hosted and how the
frontend should produce those URLs.

**Q6 — `POST /api/bookings/{id}/cash` does not exist.**
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
this one. It also writes "3" into the text while the cutoff itself is
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

**Q9 — Money is documented as so'm in some places and tiyin in others.**
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
(see Q2). It would help if `/api/users/me` returning different flags from the
token were a documented signal to re-login.

**Q12 — Payment and refund paths are still mocks.**
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
also disagree on the field name for the length (`durationHours` vs `duration`).
