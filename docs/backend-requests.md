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
waits on; the panel shows "Tez orada" for those until they ship.
`src/miniapp/api/missing.ts` is the same list for the Mini App. Both lists
hold only the entries of requests that are still open.

R24, R25 and R27–R31 are listed in `src/miniapp/api/missing.ts`; Bosh sahifa
requests neither R24 nor R25 and shows no "Yaqin atrofda" or "Boʻsh maydonlar"
section yet. R27–R31 are the booking flow (checkout, Oʻyinlarim, booking detail):
the screens show "Tez orada" or hide the field until they ship.

### R24 — Sort the stadium list by distance or rating

**What's needed**
`GET /api/stadiums` has a fixed order and no sort parameter, so the client
cannot show the nearest or best-rated pitches first. Sorting one page in the
client would be wrong, so a server-side sort is needed.

**Which screen needs it**
Mini App player — Bosh sahifa, the "Yaqin atrofda" (nearby) section.

**Proposed endpoint**
`GET /api/stadiums` — public (same access as today), new optional parameters.

Request — in addition to the existing `q`, `format`, `maxPrice`, `district`,
`page`, `size`:

| Field | Type | Required | Validation |
|---|---|---|---|
| `sort` | string | no | `distance` or `rating`; anything else is 400. Default stays today's fixed order |
| `lat` | number | only with `sort=distance` | -90 to 90 |
| `lng` | number | only with `sort=distance` | -180 to 180 |

Response — the existing page payload, same fields, ordered by the chosen sort
(`distance`: nearest first; `rating`: highest `averageRating` first, stadiums
without reviews last).

| Field | Type | Notes |
|---|---|---|
| `distanceMeters` | integer | optional; on each stadium, only with `sort=distance` |

Error cases — 400 when `sort` is not `distance` or `rating`; 400 for
`sort=distance` without `lat` and `lng`, or with out-of-range values.

**Priority**
Medium — blocks the "Yaqin atrofda" section; Bosh sahifa works without it.

### R25 — Only stadiums with a free hour on a date

**What's needed**
The date strip on Bosh sahifa picks a day, but the list cannot be narrowed to
stadiums that have a free hour that day. Checking availability stadium by
stadium from the client would be one request per card.

**Which screen needs it**
Mini App player — Bosh sahifa, the "Boʻsh maydonlar · N" section.

**Proposed endpoint**
`GET /api/stadiums` — public (same access as today), new optional parameters.

Request — in addition to the existing ones:

| Field | Type | Required | Validation |
|---|---|---|---|
| `date` | string | no | `yyyy-MM-dd` (Tashkent day), today to `app.booking.max-weeks-ahead` weeks ahead; otherwise 400 |
| `freeOnly` | boolean | no | `true` returns only stadiums with at least one bookable hour on `date`; requires `date` |

Response — the existing page payload. `totalElements` is the number of
stadiums that have a free hour on `date`, so the client can show "Boʻsh
maydonlar · N" without counting a page.

| Field | Type | Notes |
|---|---|---|
| `content[]` | stadium | same fields as today; `pricePerHour` unchanged |
| `totalElements` | integer | stadiums with a free hour on `date` |

Error cases — 400 when `date` is malformed, in the past or beyond the booking
window; 400 for `freeOnly=true` without `date`.

**Priority**
Medium — blocks the "Boʻsh maydonlar · N" section; the chosen date already
travels to the stadium page.

### R27 — Quote before paying for a booking

**What's needed**
Checkout must show the price, the deposit a `MINIMUM` payment charges, the
remainder and the cancellation deadline **before** the booking exists. Today
they only arrive on the `BookingResponse` after `POST /api/bookings` has already
charged the card. The client must not compute them (deposit = capped minimum,
promotions, deadline).

**Which screen needs it**
Mini App player — checkout ("Bronni tasdiqlash"), the payment-option choice
and the amount shown on the pay button.

**Proposed endpoint**
`GET /api/stadiums/{id}/quote` — logged-in user

Request — path `id`, query:

| Field | Type | Required | Validation |
|---|---|---|---|
| `startsAt` | timestamp (UTC) | yes | on the hour in Tashkent, in the bookable window, same rules as `POST /api/bookings` |
| `paymentOption` | `"MINIMUM"` \| `"FULL"` | yes | uppercase; `MINIMUM` on a stadium with no minimum is 400 |

Response — `data`:

| Field | Type | Notes |
|---|---|---|
| `price` | number | **tiyin**; the player price D for that hour, promotions applied |
| `deposit` | number | **tiyin**; what `paymentOption` charges now (`price` for `FULL`) |
| `remainder` | number | **tiyin**; `price - deposit` as the backend would book it |
| `cancellationDeadline` | timestamp (UTC) | last moment a cancellation still refunds |

Error cases — 400 same messages as `POST /api/bookings` (`"Booking must start
on the hour"`, `"Cannot book more than 4 weeks ahead"`, `"This stadium requires
full payment; it has no minimum booking amount"`, closed, outside hours); 404
`"Stadium not available"`; 409 `"Slot is already booked"`.

**Priority**
Medium — checkout works from the availability price; the deposit and deadline
lines wait on it.

### R29 — Upcoming and past filter on the booking list

**What's needed**
`GET /api/bookings` returns every booking in one fixed order, so the client
cannot show "Kelgusi" and "Oʻtgan" separately. Splitting one page in the client
would be wrong.

**Which screen needs it**
Mini App player — Oʻyinlarim, the Kelgusi / Oʻtgan segmented control.

**Proposed endpoint**
`GET /api/bookings` — logged-in user, new optional parameter.

Request — in addition to `page`, `size`:

| Field | Type | Required | Validation |
|---|---|---|---|
| `when` | string | no | `upcoming` or `past`; anything else is 400. Absent keeps today's order |

Response — the existing page payload. `upcoming`: bookings that have not ended
yet, soonest first; `past`: ended bookings, most recent first.

Error cases — 400 `"Invalid when"` for an unknown value.

**Priority**
Medium — the list works unsplit; the segmented control stays disabled until it
ships.

### R30 — Cash taken on a booking, on the player response

**What's needed**
`paidAmount` mixes card and cash, so the client cannot tell the player how much
was paid in the app and how much in cash, nor explain why a cancellation refund
(card money only) is smaller than `paidAmount`.

**Which screen needs it**
Mini App player — booking detail, the Toʻlov card.

**Proposed endpoint**
`GET /api/bookings`, `GET /api/bookings/{id}` and the other player
`BookingResponse` endpoints — logged-in user, new response field.

Request — unchanged.

Response — `BookingResponse`:

| Field | Type | Notes |
|---|---|---|
| `paidInCash` | number | optional; **tiyin** taken in cash by the owner; omitted when 0 |

Error cases — none new.

**Priority**
Low — the Toʻlov card shows `paidAmount` without the split.

### R31 — Stadium photo, district and format on a booking

**What's needed**
A booking carries only `stadiumId` and `stadiumName`. The Oʻyinlarim list would
need one `GET /api/stadiums/{id}` per card to show a photo, the district and
the format.

**Which screen needs it**
Mini App player — Oʻyinlarim booking cards and the booking detail head.

**Proposed endpoint**
`GET /api/bookings` and `GET /api/bookings/{id}` — logged-in user, new
response fields.

Request — unchanged.

Response — `BookingResponse`:

| Field | Type | Notes |
|---|---|---|
| `stadiumCoverPhotoUrl` | string | optional; the stadium's first photo, as `coverPhotoUrl` on `StadiumResponse` |
| `stadiumDistrict` | string | optional; one of the twelve district strings |
| `stadiumFormat` | string | `5x5` \| `7x7` \| `9x9` \| `11x11` |

Error cases — none new.

**Priority**
Low — the list shows the logo mark instead of a photo; the detail page fetches
the stadium.

### R33 — A team game's price before it is created

**What's needed**
"Raqib qidirish" shows what the leader's team pays now and its remainder
before the game exists. Only the created game carries them
(`GameDetailResponse.teams[].price` / `remainderAmount`); computing them in the
client would re-implement the team-game split (`TeamGameSplit`).

**Which screen needs it**
Mini App player — Raqib qidirish (find an opponent) form.

**Proposed endpoint**
`GET /api/stadiums/{id}/team-game-quote` — logged-in user.

Request:

| Field | Type | Required | Validation |
|---|---|---|---|
| `startsAt` | timestamp (UTC) | yes | on the hour in Tashkent, a free slot |

Response:

| Field | Type | Notes |
|---|---|---|
| `price` | number **(tiyin)** | what each team pays in the app on joining (player price) |
| `remainderAmount` | number **(tiyin)** | what each team owes afterwards, the same in the app or in cash |
| `totalPrice` | number **(tiyin)** | both teams together |
| `cancellationDeadline` | timestamp (UTC) | when free cancellation ends |

Error cases — 400 when `startsAt` is not a bookable hour; 404 `"Stadium not
found"`.

**Priority**
Medium — the form shows the slot's price only and the team sees its exact
figures on the game page right after starting.

### R34 — Refuse a second remainder charge while one is processing

**What's needed**
`POST /api/bookings/{id}/pay-remainder` refuses only when the booking is
already `paid`. If the first charge is still `processing` (the provider has not
answered), the booking stays `partially_paid` and a second call charges the
card again; both can settle. The Mini App hides the button while it sees a
`processing` remainder row, but the server should guarantee it.

**Which screen needs it**
Mini App player — booking detail, "Qolganini ilovada toʻlash" (and any other
client calling the endpoint).

**Proposed endpoint**
`POST /api/bookings/{id}/pay-remainder` — unchanged request and response; one
new error case.

Error cases — 409 `"A payment for this booking is still being processed"` while
a `remainder` payment of this booking is `processing`, with `code:
"PAYMENT_PROCESSING"` so clients need not match the prose.

**Priority**
High — guards against charging a player twice.

### R40 — Make team game charges safe to retry

**What's needed**
`POST /api/games` (team game) and `POST /api/games/{id}/pay-remainder` are not
idempotent. If the answer is lost (timeout, 5xx), a retry creates a second
waiting game with a second hold, or charges a remainder that is still
`processing` again (`chargeForTeamGame` has no guard). The Mini App no longer
offers a retry after such errors and sends the captain to Oʻyinlarim, but the
server should make a retry harmless.

**Which screen needs it**
Mini App player — Raqib qidirish, game detail "Qolganini toʻlash".

**Proposed change**
- `POST /api/games` and `POST /api/games/{id}/pay-remainder` accept an
  optional `Idempotency-Key` header (UUID); a repeated key within 24 h returns
  the first result instead of acting again.
- `pay-remainder` answers 409 `code: "PAYMENT_PROCESSING"` while a remainder
  payment of that team is `processing` (same as R34 for bookings).
- `POST /api/games` refuses a second waiting game of the same team on the same
  hour: 409 `"Your team is already looking for an opponent at this time"`.

**Priority**
High — guards against double holds and double charges.

---

### R45 — Keep a game that is being joined off the challenge board

**What's needed**
While a team's join is half-way (`game_teams.status = 'joining'`, e.g. after a
202 `PAYMENT_PENDING`), the game stays `open` and `GET /api/games/challenges`
still lists it — to every captain, including the one whose team is joining.
"Qabul qilish" then offers to pay again; the backend refuses the second join
(400 "This game already has an opponent", nothing charged), but the board
should not offer it. The Mini App hides the button for the joining captain for
the rest of that launch only (`teams/pendingJoins.ts`).

**Which screen needs it**
Mini App player — Jamoam, "Raqib qidirayotgan jamoalar".

**Proposed change**
`GET /api/games/challenges` leaves out games that have a `joining` team (the
partial unique index already treats that side as taken). Optionally,
`GameDetailResponse` gets `joinPending: boolean` (true while a team is
`joining`) so the game screen can say "Toʻlov tasdiqlanmoqda" after a relaunch.

**Priority**
Low — the server already refuses a second join; this only removes a dead button.

---

## Done

In the order they were asked for, by priority. Each entry keeps its original contract; **Shipped as** notes
where the backend differs from it — the backend is what counts, and
`docs/api-reference.md` documents it.

### R28 — Pay a pending booking whose payment was declined _(shipped in `e14bd5e`)_

**Shipped:** `POST /api/bookings/{id}/pay` `{ cardId }` as proposed, for the same amount as the first attempt (deposit or full); a decline is 200 with the new `declineReason` and the same `expiresAt` (never extended); 409 `BOOKING_NOT_PENDING`, `BOOKING_EXPIRED`, `PAYMENT_IN_PROGRESS`.

**What's needed**
A declined card leaves the booking `pending` / `unpaid` until the 10-minute
hold expires, but there is no way to pay it afterwards: `pay-remainder` needs a
`partially_paid` booking, and re-posting `POST /api/bookings` is a 409 on the
held slot.

**Which screen needs it**
Mini App player — booking detail ("Toʻlash" in the pending banner) and the
"try another card" step after a decline.

**Proposed endpoint**
`POST /api/bookings/{id}/pay` — logged-in user (the booking's owner)

Request — path `id`, body:

| Field | Type | Required | Validation |
|---|---|---|---|
| `cardId` | UUID | yes | an active card of the caller |
| `paymentOption` | `"MINIMUM"` \| `"FULL"` | no | uppercase; absent keeps the option chosen at creation; same rule as creation |

Response — `BookingResponse`, `message` as for creation (`paid` /
`partially_paid` / `unpaid` outcome; a decline is still **200**).

Error cases — 400 `"Booking is not awaiting payment"` (not `pending`, already
paid, or the hold expired); 403 `"This booking does not belong to you"`; 404
`"Booking not found"` / `"Card not found"`.

**Priority**
Medium — without it a declined payment can only be retried by waiting for the
hold to expire and booking again.

---

### R44 — Say why a card payment was declined _(shipped in `41a786c`)_

**Shipped:** the 400 declines of the team-game calls carry `code` INSUFFICIENT_FUNDS / CARD_EXPIRED / CARD_DECLINED; `BookingResponse.declineReason` (every view) and `PaymentResponse.declineReason` (not `failureCode` as proposed), values uppercase; plus `BookingResponse.paymentState` (`ccfa4d5`): `paid` / `processing` / `declined` / `failed` / `none`, always present.

**What's needed**
Card binding now answers with a `code` (`CARD_NOT_SUPPORTED`, `CARD_EXPIRED`,
`SMS_CODE_WRONG` …), but a declined **payment** still does not say why. The
team-game declines are 400s with English prose ("Card payment was declined; …")
and a declined booking is HTTP 200 with a `failed` row in
`GET /api/payments/my` — no reason either way. The provider's code is known
(`STPIMS-ERR-057` / `-112` insufficient funds, `-067` card expired, `-058`
blocked) but kept in `payments.failure_reason`, which only the admin sees. So
the player cannot be told "not enough money on the card" versus "the card was
declined" versus "the card has expired".

**Which screen needs it**
Mini App player — checkout and "Qolganini toʻlash" (bookings), Raqib qidirish,
accepting a challenge and the team remainder (team games).

**Proposed change**
- The 400 declines of `POST /api/games`, `POST /api/games/{id}/join` and
  `POST /api/games/{id}/pay-remainder` add a `code`:

  | `code` | When (ATMOS) |
  |---|---|
  | `INSUFFICIENT_FUNDS` | `STPIMS-ERR-057`, `STPIMS-ERR-112` |
  | `CARD_EXPIRED` | `STPIMS-ERR-067` (the same code card binding uses) |
  | `CARD_DECLINED` | any other decline |

- `PaymentResponse` (`GET /api/payments/my`) gets an optional
  `failureCode` (`string`, the same three values), present only on a `failed`
  row; never the provider's own code or text.

The Mini App already maps `INSUFFICIENT_FUNDS`, `CARD_EXPIRED` and
`CARD_DECLINED` (`errors.ts`); until they are sent every decline reads
"Karta rad etildi".

**Priority**
Medium — the player cannot tell an empty card from a refused one.

---

### R43 — Daily revenue for the last 7 or 30 days, every day included _(shipped in `a65e149`)_

**What's needed**
Hisobot draws a 7/30-day revenue chart. `GET …/revenue` returned only the last
30 days that had payments, so the client would have to fill in missing days and
cut the window itself.

**Which screen needs it**
Mini App owner mode — Hisobot.

**Proposed change**
`GET /api/owner/dashboard/stadiums/{stadiumId}/revenue?days=7|30` (default 30):
`dailyRevenue` has every day of the window, oldest first, ending today
(Tashkent), with `revenue: 0, bookingCount: 0` on days without payments.

Error cases — 400 "days must be 7 or 30"; 403 "You do not own this stadium".

**Priority**
Medium.

**Shipped as** — as proposed.

### R42 — A user without a stadium can add one and see its status _(shipped in `025b302`)_

**What's needed**
Profil always shows the "Ega rejimi" card: no stadium → "Maydon qoʻshish"; a
stadium under review → "Koʻrib chiqilmoqda"; approved → "Ega rejimiga oʻtish".
`/api/owner/**` is `ROLE_OWNER` and `is_owner` is set only on approval, so a
player can neither submit a stadium nor see its status.

**Which screen needs it**
Mini App player — Profil (Ega rejimi card), Maydon qoʻshish.

**Proposed change**
Exactly `POST /api/owner/stadiums` and `GET /api/owner/stadiums` (not their
sub-paths) need only a signed-in user; both already act on the caller's own
stadiums. Every other `/api/owner/**` path stays `ROLE_OWNER`.

Error cases — 401 without a token; a non-owner still gets 403 on every other
owner path.

**Priority**
High — the profile's owner card depends on it.

**Shipped as** — as proposed. The stadium is created `pending`; approval still sets `is_owner` (the Mini App re-logs in when the profile's flags move).

### R41 — Let the owner turn the minimum booking amount off _(shipped in `ea565b9`)_

**What's needed**
`PUT /api/owner/stadiums/{id}` applies only non-null fields, and a non-null
`minBookingAmount` must be ≥ 50 000 tiyin. Once an owner sets a minimum, they
cannot go back to "full payment only" (null); only an admin can, in the
database.

**Which screen needs it**
Mini App owner mode — Narxlar → Oldindan toʻlov (it can set and change the
minimum, not remove it).

**Proposed change**
`PUT /api/owner/stadiums/{id}` accepts `"clearMinBookingAmount": true`, which
sets `minBookingAmount` to null (full payment only). Sending it together with
`minBookingAmount` → 400 `"Send either minBookingAmount or clearMinBookingAmount"`.
The audit entry records the change like any other field.

**Priority**
Medium — an owner who tries deposits is stuck with them.

**Shipped as** — as proposed.

### R39 — The owner's contract and payout status _(shipped in `74c8d41`)_

**What's needed**
Owner Profil shows "Toʻlovlar: Shartnoma — Imzolangan" and support contact.
Legal details and `atmosContractStatus` exist only under `/api/admin/**`.

**Which screen needs it**
Mini App owner mode — Profil.

**Proposed endpoint**
`GET /api/owner/legal-details` — owner; `{ legalType?, atmosContractStatus,
ownerContractStatus }` (§1.9 values), read-only.

Error cases — none beyond 401/403.

**Priority**
Low — informational.

**Shipped as** — response `{ legalType?, atmosContractStatus, ownerContractStatus }` (lowercase values; `ownerContractStatus` mirrors the admin view of the same contract); no bank or tax details. An owner without a legal-details row gets `none`.

### R38 — Unpaid remainders and the app/cash split for the owner _(shipped in `5cc6ef6`)_

**What's needed**
Hisobot shows "Toʻlanmagan qoldiqlar" and money received in the app vs in cash.
`…/stats` returns only totals; filtering one page of bookings in the client
would be wrong.

**Which screen needs it**
Mini App owner mode — Hisobot.

**Proposed endpoints**
`GET /api/owner/dashboard/stadiums/{id}/bookings?unpaid=true` — owner; paged
`BookingResponse` (owner view) with `remainingAmount > 0`, live bookings only,
soonest first. `OwnerDashboardStatsResponse` gains, per period
(`today`/`week`/`month`): `…PaidInApp`, `…PaidInCash`, `…Outstanding` (tiyin).

Error cases — 403 `"You do not own this stadium"`.

**Priority**
Medium — the totals are shown meanwhile.

**Shipped as** — as proposed: `unpaid=true` on the owner dashboard booking list (live bookings, `remainingAmount > 0`, soonest first, a JPA specification), and `OwnerDashboardStatsResponse` gains `todayPaidInApp`, `todayPaidInCash`, `todayOutstanding` and the same for `week…` / `month…` (tiyin).

### R37 — The owner marks a booking's remainder as paid in cash _(shipped in `f2af228`)_

**What's needed**
`POST /api/bookings/{id}/cash` is documented in the backend `CLAUDE.md` but not
mapped (api-reference Q6). The schedule's "Naqd olindi" cannot work for an
ordinary booking (team games have `POST /api/games/{id}/cash`).

**Which screen needs it**
Mini App owner mode — Jadval booking sheet, Hisobot unpaid list.

**Proposed endpoint**
`POST /api/owner/bookings/{id}/cash` — owner of the stadium; no body. Records
the booking's `remainingAmount` as cash; response `BookingResponse` (owner
view), `message: "Cash recorded"`.

Error cases — 400 `"Already paid"`; 400 `"This booking has no part payment to
complete"`; 403 `"You do not own this stadium"`; 404 `"Booking not found"`.

**Priority**
High — every deposit booking ends with a cash remainder the owner must record.

**Shipped as** — as proposed, plus 409 "A payment for this booking is being processed" while an app remainder payment is `processing`; cash and pay-remainder lock the booking row.

### R36 — Upload stadium photos _(shipped in `29739b6`)_

**What's needed**
`photos` on create/update are URL strings and there is no upload endpoint
(api-reference Q5); a phone owner has no URL to give.

**Which screen needs it**
Mini App owner mode — Maydon qoʻshish step 3 "Rasmlar", Maydonim → Rasmlar.

**Proposed endpoint**
`POST /api/owner/stadiums/{id}/photos` — owner; `multipart/form-data`, field
`file` (JPEG/PNG/WebP, ≤ 10 MB). Response — `PhotoResponse` `{ id, url,
position }`. `DELETE /api/owner/stadiums/{id}/photos/{photoId}` — `data: null`.

Error cases — 400 `"Unsupported image type"`, 413 `"File too large"`; 403; 404.

**Priority**
Medium — stadiums can be created without photos; players see the logo instead.

**Shipped as** — magic-byte check (JPEG/PNG/WebP) → 400 "Unsupported image type"; > 10 MB → 413 "File too large"; at most 10 → 400 "A stadium can have at most 10 photos". Stored under `UPLOADS_DIR` and served publicly at `GET /api/uploads/stadiums/{stadiumId}/{file}` (the stored `url` is that relative path — the Mini App shows it through `mediaUrl`). Also `DELETE …/photos/{photoId}` ("Photo deleted", 404 "Photo not found") and `PUT …/photos/order` `{ photoIds }` (every photo exactly once, else 400 "photoIds must list every photo of the stadium exactly once") → `PhotoResponse[]`; the first is the cover. Audited `STADIUM_UPDATED`.

### R35 — The owner's own stadium detail _(shipped in `bcb73a2`)_

**What's needed**
`GET /api/owner/stadiums` returns `StadiumResponse` (no phone, description,
opening hours, minimum booking amount, cancellation hours, photos or
amenities). The public `GET /api/stadiums/{id}` has them but in **player**
prices and only for approved stadiums. Owner mode cannot show or prefill its
own settings.

**Which screen needs it**
Mini App owner mode — Maydonim: Maʼlumotlar, Ish vaqti, Narx/Bron shartlari,
Rasmlar (also for a stadium still `pending`).

**Proposed endpoint**
`GET /api/owner/stadiums/{id}` — owner of that stadium.

Response — `StadiumDetailResponse` in the owner's view, exactly as `PUT
/api/owner/stadiums/{id}` already returns it (own `pricePerHour` /
`minBookingAmount` with `playerPrice` / `playerMinBookingAmount`, `status`,
`statusReason`, `openTime`, `closeTime`, `cancellationPolicy`, `photos`,
`amenities`, `phone`, `description`), any status.

Error cases — 403 `"You do not own this stadium"`; 404 `"Stadium not found"`.

**Priority**
High — three of the six Maydonim sections wait for it.

**Shipped as** — as proposed, any status; the same response as `PUT /api/owner/stadiums/{id}`.

### R32 — Invite players to a team by link _(shipped in `890db7d`)_

**What's needed**
`POST /api/teams/{id}/members` takes a `userId`, but a leader has no way to
learn another player's id: there is no user search and no invite. The design
has "Taklif havolasini ulashish" (share an invite link) on Jamoam; the player
who opens the link should join the team.

**Which screen needs it**
Mini App player — Jamoam (sardor), "Taklif havolasini ulashish"; joining from
the link (start parameter `team_<code>`, routed in Part 4).

**Proposed endpoints**
`POST /api/teams/{id}/invite` — logged-in user, leader only: returns a link.

| Field | Type | Notes |
|---|---|---|
| `code` | string | opaque, unguessable; valid until the team is deleted or the leader makes a new one |
| `inviteLink` | string | `https://t.me/<bot>/<app>?startapp=team_<code>` |

`POST /api/teams/join` — logged-in user.

Request:

| Field | Type | Required | Validation |
|---|---|---|---|
| `code` | string | yes | `@NotBlank` |

Response — `TeamDetailResponse` of the joined team, `message: "Joined team"`.

Error cases — 403 `"Only the team leader can perform this action"` (invite);
404 `"Invite not found"` (unknown or replaced code); 400 `"User is already a
member of this team"`.

**Priority**
High — without it a team can never have members other than its leader.

**Shipped as** — the backend returns only `{ code }` (22-char base64url, 128 bits); the Mini App builds the link with `buildInviteLink('team_' + code)` from its public `VITE_` names. Added `GET /api/teams/{id}/invite` (leader; the current code, created on first request), `POST` renews it ("Invite link renewed"), and `GET /api/teams/invite/{code}` → `{ team: TeamResponse, isMember }` for the join screen. Join: 404 "Invite not found", already a member **409** "User is already a member of this team" (add-member keeps its 400). No team size limit.

### R26 — Dev sign-in endpoints require a dev-only key _(shipped in `253f585`)_

**What's needed**
The dev-only sign-in endpoints (R19: `GET /api/auth/dev/users`,
`POST /api/auth/dev/login`) should require the header `X-Dev-Login-Key`, which
must match a dev-only backend setting. Without it, a dev backend that is
reachable on a network lets anyone sign in as any user.

**Which screen needs it**
None is blocked. The Mini App's dev user picker (browser testing, `npm run
dev` only) already sends the header from `VITE_DEV_LOGIN_KEY` when it is set.

**Proposed endpoint**
Both R19 endpoints stay as they are — public, `dev` profile only — plus a check
of the header.

Request — header on both calls:

| Field | Type | Required | Validation |
|---|---|---|---|
| `X-Dev-Login-Key` | header | yes | equals the dev-only setting (a long random value in the dev profile's config); compared in constant time |

Response — unchanged.

Error cases — 403 when the header is missing or wrong (any message; no hint
which of the two it was).

**Priority**
Low — hardening for shared dev networks; nothing in the frontend waits on it.

**Shipped as** — a missing, empty or wrong key answers **404 `"Not found"`** (exactly like an unknown path, checked before the body is read by `DevLoginKeyInterceptor`), not 403. The setting is `DEV_LOGIN_KEY` (`app.dev.login-key`); with the `dev` profile active the backend refuses to start unless it is at least 16 characters. Compared as SHA-256 digests in constant time.

### R23 — Stadium list and detail fields the player screens need _(shipped in `c09bfb1`)_

**What's needed**
The Mini App's Bosh sahifa, stadium page and Sevimlilar are built from
`GET /api/stadiums`, `GET /api/stadiums/{id}` and the availability endpoint.
Several things the design shows are not in them:

1. **District filter.** `GET /api/stadiums` takes `q`, `format`, `maxPrice`
   only — no `district`, although stadiums have one (§1.9). The client must
   not filter a page itself.
2. **A cover photo on list items.** `StadiumResponse` deliberately has no
   `photos`, so the list cards and Sevimlilar cards cannot show a photo.
3. **`isFavorited` on list items** (for a logged-in caller), so a list card
   can show and toggle the heart without loading each detail.
4. **The rating on the detail.** `StadiumDetailResponse` has no
   `averageRating` / `reviewCount` (the list has them), so the stadium page
   cannot show "4.8 (128)" when opened from a deep link or Sevimlilar.
5. **Why a slot is unavailable.** `TimeSlot` has only `available`; the
   design shows "Band" (booked) and "Yopiq" (closed) differently.

**Which screen needs it**
Mini App player: Bosh sahifa (filters, cards), Maydon (rating, slots),
Sevimlilar (cards).

**Proposed endpoint**
`GET /api/stadiums` — public · paged — one new optional query parameter:

| Field | Type | Required | Validation |
|---|---|---|---|
| `district` | string | no | one of the twelve exact district strings (§1.9); unknown → 400 `"Unknown district"` |

`StadiumResponse` (public list and `GET /api/favorites`) gains:

| Field | Type | Notes |
|---|---|---|
| `coverPhotoUrl` | string? | the photo with the lowest `position`; absent when none |
| `isFavorited` | boolean? | only for an authenticated caller, as on the detail |

`StadiumDetailResponse` gains:

| Field | Type | Notes |
|---|---|---|
| `averageRating` | number? | same as on the list; absent with no reviews |
| `reviewCount` | number? | |

`TimeSlot` gains:

| Field | Type | Notes |
|---|---|---|
| `unavailableReason` | `"booked"` \| `"closed"`? | only when `available` is false |

Error cases — 400 `"Unknown district"` for the new parameter; nothing else new.

**Priority**
Medium — without them the district filter is disabled ("Tez orada"), cards
have no photo or heart (Sevimlilar excepted), the stadium page shows the
review count without an average, and an unavailable hour reads "Boʻsh emas".

**Shipped as** — an unknown `district` is 400 `"Invalid district"` (not `"Unknown district"`). Instead of `unavailableReason`, every `TimeSlot` has a `status`: `free` | `booked` | `closed` | `past` (`available` is true exactly when it is `free`; precedence past → booked → closed). `reviewCount` on the detail is `0` with no reviews. `GET /api/favorites` returns the same card (`coverPhotoUrl`, `isFavorited: true`).

### R22 — New users start in Uzbek, not in their Telegram language _(shipped in `9db7f62`)_

**What's needed**
The Mini App's language is the user's saved `language` (`UserResponse.language`),
and a **new user must start in Uzbek (`uz`)**. Today
`AuthService.createFromTelegram` sets it from Telegram's `language_code`
(`resolveLanguage`: `ru` / `en` when Telegram says so, otherwise `uz`), so a
player whose Telegram is in Russian starts in Russian. The frontend cannot
correct this: it cannot tell a Telegram-copied `ru` from one the player chose,
and must not override the saved value.

**Which screen needs it**
Mini App, every screen, a player's first launch.

**Proposed endpoint**
No new endpoint. In `POST /api/auth/telegram`, a user created on first login
gets `language = "uz"` regardless of `language_code`. Existing users keep
their saved value; `PATCH /api/users/me` `language` stays the only way to
change it.

| Field | Type | Notes |
|---|---|---|
| `user.language` | `"uz"` | on the response that **creates** the user |

Error cases — none new.

**Priority**
Medium — players with a Russian or English Telegram see the app in that
language on first launch instead of Uzbek; they can switch in Profil → Til.

**Shipped as** requested.

### R19 — R-dev: dev-only login for local Mini App testing (dev profile only, refuses prod) _(shipped in `307b8c8`)_

**What's needed**
Outside Telegram there is no `initData`, so `POST /api/auth/telegram` cannot
work in a plain browser and the Mini App cannot be developed or tested locally
without opening it inside Telegram through a tunnel. The backend has no dev
login (no `dev` profile, no endpoint other than `/api/auth/telegram` and
`/api/auth/admin/login`, checked at `d2c55a2`). The frontend must never hold
the bot token, so it cannot sign fake `initData` itself.

**Which screen needs it**
Mini App, every screen, local development only (`npm run dev`, no Telegram).
The frontend would use it only when `import.meta.env.DEV` is true **and**
there is no Telegram `initData`, behind a small dev-only user picker.

**Proposed endpoint**
`GET /api/auth/dev/users` — public, **registered only under the `dev`
Spring profile** (`@Profile("dev")` on the controller, so the mapping does
not exist anywhere else — a 404 `"Not found"` in every other profile).

Response — a short list of users to pick from (not paged, at most 50,
newest first):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `name` | string | |
| `isOwner` | boolean | |
| `isAdmin` | boolean | |
| `isBlocked` | boolean | so the blocked screen can be tested too |

`POST /api/auth/dev/login` — public, `dev` profile only, same rule.

| Field | Type | Required | Validation |
|---|---|---|---|
| `userId` | UUID | yes | must exist — 404 `"User not found"` |

Response — `AuthResponse` (`token`, `user`), exactly as
`POST /api/auth/telegram` returns it, with the same JWT claims and expiry.

Error cases — 400 `"Invalid id"`; 404 `"User not found"`; 403 `"Account is
blocked"` for a blocked user (same as the Telegram login). The application
must **refuse to start** if the `dev` profile is active together with `prod`
(or `atmos`), so the endpoint can never reach production.

**Priority**
High — without it every Mini App screen can only be checked inside Telegram
through a tunnel; nothing else is blocked.

**Shipped as** requested: `GET /api/auth/dev/users` (the 50 newest), `POST /api/auth/dev/login` `{ userId }`; only under the `dev` profile, and the backend refuses to start with `dev` plus `prod` or `atmos`. A blocked user gets 403 `ACCOUNT_BLOCKED` (R21). The Mini App does not use it yet.

### R20 — Player profile: first name, last name and phone, set only by the user _(shipped in `005a8dd`)_

**What's needed**
The Mini App asks a player to fill in "Profilingizni toʻldiring" (first name,
last name, +998 phone) before their first booking, and lets them edit it under
Profil → Shaxsiy maʼlumotlar. Today `PATCH /api/users/me` accepts only `name`
and `language`; there is no way to set `phone`, and `UserResponse` has a single
`name` that the backend fills from Telegram on first login. So the client
cannot tell whether the player entered their name themselves (the setup must
never be pre-filled from Telegram), and cannot save a phone at all.

**Which screen needs it**
Mini App player: the profile-setup sheet before the first booking, Profil →
Shaxsiy maʼlumotlar, and the phone line on Profil.

**Proposed endpoint**
`PATCH /api/users/me` — logged-in user. New optional body fields, applied
when non-null (existing `name` / `language` unchanged):

| Field | Type | Required | Validation |
|---|---|---|---|
| `firstName` | string | no | trimmed, 1–60 — `"firstName must be between 1 and 60 characters"` |
| `lastName` | string | no | trimmed, 1–60 — `"lastName must be between 1 and 60 characters"` |
| `phone` | string | no | `^\+998\d{9}$` — `"phone must be in the format +998XXXXXXXXX"` |

When `firstName` or `lastName` is set, the backend also updates `name` to
`"<firstName> <lastName>"`, so every existing screen keeps working.

Response — the updated `UserResponse`, which gains:

| Field | Type | Notes |
|---|---|---|
| `firstName` | string? | **only ever set by the user** through this endpoint — never from Telegram; absent until then |
| `lastName` | string? | same rule |
| `phone` | string? | already exists; now writable, `+998XXXXXXXXX` |

The profile counts as complete when all three are present; the client checks
presence only.

Error cases — 400 with the validation messages above; 409 `"Phone is already
used by another account"` if phones must be unique (please say whether they
are); 401; 404 `"User not found"`.

**Priority**
High — blocks the profile setup before the first booking and editing the
phone; the rest of Profil works today.

**Shipped as** requested. Phones are unique: another account's phone is 409 `code: "PHONE_TAKEN"`, "Phone is already used by another account". Audited `PROFILE_UPDATED`.

### R21 — The reason a player's account was blocked _(shipped in `6edd938`)_

**What's needed**
A blocked player gets 403 `"Account is blocked"` from every endpoint (from
`JwtAuthFilter` without a `code`, from `POST /api/auth/telegram` likewise).
The design's "Hisobingiz bloklangan" screen shows **why** and **when**, but
the reason an admin types (`PUT /api/admin/users/{id}` `reason`) is stored
only in the audit log and is not returned to the player.

**Which screen needs it**
Mini App: the full-screen "Hisobingiz bloklangan".

**Proposed endpoint**
No new endpoint. On every blocked 403 (the filter and the Telegram login):

| Field | Type | Notes |
|---|---|---|
| `code` | `"ACCOUNT_BLOCKED"` | the same code the admin login already sends |
| `data.reason` | string? | the reason given with the latest `USER_BLOCKED`, as typed; absent when none was given |
| `data.blockedAt` | timestamp (UTC)? | when the latest block happened |

Error cases — none new.

**Priority**
Medium — the blocked screen works without it but cannot tell the player why.

**Shipped as** requested — from `JwtAuthFilter`, `POST /api/auth/telegram` and `POST /api/auth/admin/login` alike; `data.reason` / `data.blockedAt` come from the latest `USER_BLOCKED` audit entry and either may be absent.

### R18 — Booking amounts that add up in the owner's and admin's views, for every booking _(shipped in `6383d85`)_

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

**Shipped as** the first option: `paidAmount + remainingAmount = price` for every booking in the player, owner and admin views (`net` bookings converted by `BookingResponseFactory`); `pricingModel` is not exposed.

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
