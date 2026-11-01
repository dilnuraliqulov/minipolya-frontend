# Mini App booking — checkout, cards, payment, Bronlarim

Sub-project B (A = polish, done in `47b5bfd..040fde3`). Design approved in chat
on 2026-11-01 ("continue"). Follows `CLAUDE.md` and its "Mini App" section;
backend reference `docs/api-reference.md` at `ed403c7` (= backend HEAD).

## Goal

A player books one hour and pays with a saved card, manages saved cards, sees
their bookings, pays a remainder, cancels with the API's refund figure, and
reviews a completed booking — showing only what the API returns.

## Design frames (telegram-webapp.pen, pencil MCP; dark twins mirror these)

| Area | Frames |
|---|---|
| Checkout | `jUwx9` Default · `EibQD` Karta yoʻq · `exdde` Toʻlanmoqda · `A0kjP` Toʻlov amalga oshmadi · `OXb3d` Toʻliq toʻlov talab qilinadi · `jQThs` Karta qoʻshildi · `WZouw` Internet yoʻq |
| Success | `WQ33a` Bron qilindi |
| Add card | `PcMfk` 1-qadam · `p5Ryw` Notoʻgʻri raqam · `ubs7b` SMS kod · `TcaS1` Notoʻgʻri kod · `HyxdZ` Kod muddati tugadi · `KdGFs` Internet yoʻq · `fQunq` Karta qoʻshildi |
| Kartalarim | `dROS0` Default · `QYoAb` Oʻchirishni tasdiqlash · `lWawE` Empty · `NsP3q` Loading · `ikhRr` Error |
| Bronlar list | `r4x2ro` Default · `DTfZG` Empty · `QXmq0` Loading · `UMDGi` Error |
| Booking detail | `WVB5s` Kutilmoqda · `RxgQH` qisman toʻlangan · `kVmsK` toʻliq toʻlangan · `uKMZB` qaytarilmaydi · `FrFXp` Bekor qilingan · `vaYXD` Oʻtkazilgan (baholash) · `wih8u` baholangan · `ZHylm` Muddati oʻtgan · `g9A0xi` Loading · `J9zhM` Error |
| Sheets | `JGFhE` Bekor qilish / Tasdiqlash · `QZyHy` Baholash / Oyna |

Implementers screenshot the frames they build (light and dark) and match
spacing and type; the text below decides **what data** each element shows.

## Facts the design depends on (from the backend)

- `POST /api/bookings` creates **and charges** in one call. A declined card is
  **HTTP 200** with `paymentStatus: "unpaid"`, `status: "pending"`,
  `expiresAt` (10-minute hold). `paid` / `partially_paid` = success.
- An `unpaid` answer cannot tell declined from still-processing. The payment
  row in `GET /api/payments/my` (newest first) with that `bookingId` says it:
  `failed` = declined, `processing` = not settled yet.
- 409 `"Slot is already booked"` has no `code`; branch on status 409 for this
  call only.
- Before a booking exists the API gives only the slot's `pricePerHour`, the
  stadium's `minBookingAmount` and `cancellationPolicy.cancellationHours`. The
  deposit cap, the remainder and the deadline date would be client
  calculations → **R27**.
- No endpoint re-tries the charge of a pending booking → **R28** (user ruling:
  after a decline no client retry; "Qayta urinish" / "Boshqa karta" disabled
  with "Tez orada").
- `GET /api/bookings` is newest `startsAt` first, all statuses mixed, no
  upcoming/past filter → **R29** (user ruling: Kelgusi / Oʻtgan tabs shown
  disabled "Tez orada", one combined server-ordered list meanwhile).
- `BookingResponse` has `stadiumId`/`stadiumName` only — no photo, district,
  format, address, phone, coordinates. The detail screen loads
  `GET /api/stadiums/{stadiumId}` for those; the list card shows the
  `LogoMark` placeholder instead of a photo → **R31** (cover photo + district
  + format on `BookingResponse`).
- A player's booking never says how much was paid in cash (Q6) → **R30**;
  the "paid in cash" note is hidden. The static design note "yoki maydonda
  naqd toʻlashingiz mumkin" under the pay-remainder button stays (no number).
- Saved cards have no default flag: the design's "Asosiy" badge is not shown.
  `cardType` decides the brand tile (HUMO / UZCARD text tile, anything else a
  card icon).
- One review per stadium per user; `GET /api/reviews/my` lists the player's
  reviews (match on `bookingId`, else on `stadiumId`).

## 1. Checkout — `/checkout?stadium=<id>&date=YYYY-MM-DD&start=HH:mm`

Entered from the stadium page (already behind `useProfileGate`). Invalid or
missing params, a date outside the 28-day window, or a slot not `free` in
`GET /api/stadiums/{id}/availability?date=` → an error state with "Vaqtni
tanlash" back to the stadium page.

- **Summary card:** stadium name, district · format (from the stadium detail),
  Sana (`formatLongDate`), Vaqt (`slotLabel`), Davomiyligi "1 soat" (a booking
  is exactly one hour — a fixed fact, not a sum), Jami = the slot's
  `pricePerHour`.
- **Toʻlov turi** (radio cards):
  - "Toʻliq toʻlov · {pricePerHour}" — always.
  - "Oldindan toʻlov · {minBookingAmount}" — only when the stadium has
    `minBookingAmount` **and** it is lower than `pricePerHour` (a display
    choice between two API figures, no arithmetic). Default selection: deposit
    when offered, else full.
  - Deposit chosen → note "Qolgan summani keyin ilovada yoki maydonda naqd
    toʻlaysiz." (no number — R27).
  - No deposit → frame `OXb3d`: only the full option, note "Bu maydon
    toʻliq toʻlovni talab qiladi."
- **Karta:** `GET /api/cards` as radio rows "•••• 1234" + `cardType` ·
  `expiry`; first card preselected; "+ Karta qoʻshish" opens the add-card
  sheet, and a newly saved card becomes the selection (frame `jQThs`). No
  cards → frame `EibQD`: the add row and "Toʻlash uchun avval karta
  qoʻshing"; pay disabled.
- **Cancellation note** above the button: "Oʻyin boshlanishidan
  {cancellationHours} soat oldingacha bekor qilsangiz, toʻlov toʻliq
  qaytariladi. Undan keyin qaytarilmaydi."
- **Pay button** (BottomBar): "Toʻlash · {amount of the selected option}".
- Errors on `GET` → `ErrorState` with "Qayta urinish".

## 2. Paying — a pure state machine `payment/machine.ts`

States: `idle` → `paying` → one of `success(booking)` · `declined(booking)` ·
`checking(booking)` · `slotTaken` · `failed(errorKey)`.

1. `paying`: button shows `LogoSpinner` + "Toʻlanmoqda…" (frame `exdde`),
   inputs disabled, Telegram BackButton ignored.
2. `POST /api/bookings { stadiumId, startsAt, cardId, paymentOption }`;
   `startsAt` = the Tashkent date+hour converted to UTC by a new shared helper
   `tashkentToUtc(date, 'HH:mm')`; `paymentOption` `"MINIMUM"` / `"FULL"`.
3. `paid` / `partially_paid` → `success`.
4. `unpaid` → `resolveUnpaid(booking)`: read `GET /api/payments/my?page=0&size=20`,
   take the first row with `bookingId === booking.id`:
   - `failed` → `declined`.
   - `processing` (or no row yet) → poll `GET /api/bookings/{id}` up to **5
     times, 3 s apart**; `paid`/`partially_paid` → `success`; still `unpaid`
     and a `failed` row has appeared → `declined`; otherwise `checking`.
5. 409 → `slotTaken`: toast-free full message "Bu vaqt band boʻlib qoldi"
   + "Boshqa vaqt tanlash" → `/stadiums/:id?date=` with that date's
   availability query invalidated.
6. Any other error → `failed(errorMessageKey)`: message + "Qayta urinish"
   (re-runs step 2 — safe: a booking that did get created makes the retry a
   409, never a second charge) and "Bronlarim" → `/games`.

- **declined** (frame `A0kjP`): the chosen card row outlined in danger, the
  message "Toʻlov amalga oshmadi. Karta rad etildi. Boshqa karta tanlang
  yoki kartani tekshiring." and a hold countdown "Bron {mm:ss} davomida
  saqlanadi" from `expiresAt`; "Qayta urinish" and "Boshqa karta" disabled
  with "Tez orada" (R28). At 0 the countdown reads "Bron muddati tugadi".
- **checking**: "Toʻlov tekshirilmoqda. Natijani Bronlarim boʻlimida
  koʻrasiz." + "Bronni koʻrish" → `/bookings/:id`. Never a failure, never a
  retry.
- **success** (frame `WQ33a`, route state, BackButton → home): check mark,
  "Band qilindi!", stadium name, date · time; card "Toʻlandi: {paidAmount}"
  and, when `remainingAmount > 0`, "· Qolgani: {remainingAmount}" plus the
  cash/app note; "Bekor qilish muddati: {formatLongDate+time of
  cancellationDeadline} gacha" when present; buttons "Oʻyinlarimga oʻtish"
  (`/games`) and "Bosh sahifa" (`/`). After success the bookings list and the
  stadium's availability queries are invalidated.

The same machine (minus `slotTaken`, minus booking creation) drives
**pay-remainder**: `POST /api/bookings/{id}/pay-remainder { cardId }` →
`paid` = success, otherwise resolve via payments (`paymentType: remainder`).

**Countdown** `useCountdown(expiresAt)`: seconds left from the API timestamp
and the device clock, ticking each second, never negative, `mm:ss`.

## 3. Cards

- **Kartalarim `/profile/cards`** (frames `dROS0`, `lWawE`, `NsP3q`,
  `ikhRr`): list of `GET /api/cards`, each row brand tile + "•••• {last 4 of
  maskedNumber}" + `cardType` · `expiry`, a ⋯ button → sheet with
  "Kartani oʻchirish" → confirm sheet (`QYoAb`) → `DELETE /api/cards/{id}` →
  toast "Karta oʻchirildi". "+ Karta qoʻshish". Footer note "Karta
  maʼlumotlari MiniPolya'da saqlanmaydi — faqat toʻlov tokeni saqlanadi."
  Profil → Kartalarim already routes here.
- **Add card** — a full-height `BottomSheet` used by Kartalarim and checkout,
  two steps:
  1. Number (16 digits shown in groups of 4, `inputMode="numeric"`,
     `autocomplete="cc-number"`) + expiry (`MM/YY`, `autocomplete="cc-exp"`).
     Client-side: button enabled only at 16 digits and a `MM/YY` shape with
     month 01–12 (input shape, not a business rule). `POST /api/cards` →
     step 2. 400 → frame `p5Ryw` "Karta raqami yoki amal qilish muddati
     notoʻgʻri".
  2. SMS (`ubs7b`): "Kod {maskedPhone} raqamiga yuborildi", six one-digit
     boxes (one `<input autocomplete="one-time-code" inputMode="numeric"
     maxLength=6>` drawn as six cells), "Kodni qayta yuborish (0:59)" — a
     60 s timer; resend re-posts the same number+expiry for a new
     `bindingId`. `POST /api/cards/confirm { bindingId, smsCode }` → `fQunq`
     "Karta qoʻshildi" → close, cards query invalidated, `onSaved(card)`.
     A 4xx on confirm → `TcaS1` "Kod notoʻgʻri. Qaytadan kiriting." (code
     cleared). After the 60 s window with no confirm, the hint changes to
     `HyxdZ` "Kod muddati tugadi — yangi kod soʻrang" (the provider's expiry
     is not in the API; the 60 s resend timer is the only clock). Network →
     `KdGFs` "Internet aloqasi yoʻq".
- **Sensitive data**: number, expiry and SMS code live only in component
  state of the sheet; API calls go through plain `api.post`, **not**
  `useMutation` (its variables sit in the mutation cache). Never logged,
  never stored, never in a query key; cleared on close and on success.
  A test spies on `console.*`, `localStorage`, `sessionStorage` and walks the
  QueryClient's query and mutation caches for the number and code.

## 4. Oʻyinlarim tab — bookings (`/games`)

- Header "Oʻyinlarim"; segmented Kelgusi / Oʻtgan rendered **disabled** with
  the "Tez orada" note (R29).
- `GET /api/bookings?page=&size=20`, infinite "Yana koʻrsatish" / load on
  scroll as `StadiumsPage` does; order as the server sends.
- **Booking card** (component `BookingCard`, design `pgyhv`): `LogoMark`
  tile (R31), stadium name, "{weekday}, {d-month} · {time range}", status
  badge; tap → `/bookings/:id`.
- Status → badge (`bookings/status.ts`, the one mapping):
  `pending` Kutilmoqda (warning) · `confirmed` Tasdiqlangan (success) ·
  `completed` Oʻtkazilgan (neutral) · `expired` Muddati oʻtgan (neutral) ·
  `cancelled_by_user` / `cancelled_by_owner` / `cancelled_opponent_left`
  Bekor qilingan (danger). Unknown → the raw value in a neutral badge.
- Loading `SkeletonList`, empty `EmptyState` "Hali bronlar yoʻq" + "Maydon
  topish" → `/`, error `ErrorState` + retry.
- Games are not part of B: nothing about games is requested or shown.

## 5. Booking detail — `/bookings/:id`

`GET /api/bookings/{id}` + `GET /api/stadiums/{stadiumId}` (for photo,
district, format, address, phone, coordinates). Stadium failure degrades to
the booking's own fields (name only); booking failure → `ErrorState`.

- **Head:** cover photo (or mark), name, "{district} · {format}", status badge.
- **Pending banner** (`WVB5s`, only `pending` + `expiresAt`): "Toʻlovni
  yakunlash uchun {hh:mm Tashkent of expiresAt} gacha" + live countdown;
  "Toʻlash" disabled "Tez orada" (R28).
- **Info card:** date · time range, "1 soat" from `durationHours` ("{n}
  soat"), address + "Xaritada ochish" (`mapLink`), phone + "Qoʻngʻiroq"
  (`tel:`), each only when the stadium gives it.
- **Toʻlov card:** Narx `price`, Toʻlangan `paidAmount` (✓ when
  `paymentStatus = paid`), Qolgan summa `remainingAmount` with "Toʻlanmagan"
  (warning) when > 0.
- **Pay the rest:** only when `paymentStatus = partially_paid` and status is
  `confirmed` or `completed`: "Qolganini ilovada toʻlash" → card-choice sheet
  (saved cards + add card) → the payment machine's pay-remainder path; then
  the booking query is refreshed. Note under it: "yoki maydonda naqd
  toʻlashingiz mumkin".
- **Bekor qilish shartlari:** "{cancellationDeadline formatted} gacha bekor
  qilsangiz, toʻlov toʻliq qaytariladi. Undan keyin qaytarilmaydi." when
  `cancellationDeadline` exists, else the `cancellationHours` sentence. A
  green line "Hozir bekor qilsangiz: {refundIfCancelledNow} qaytariladi" when
  `refundIfCancelledNow > 0`; when it is 0 and money was paid, the warning
  line "Hozir bekor qilsangiz, toʻlov qaytarilmaydi" (frame `uKMZB`).
- **Cancel:** for `pending` / `confirmed`: "Bronni bekor qilish"
  (danger-outline) → sheet `JGFhE` repeating the refund line → `POST
  /api/bookings/{id}/cancel` → toast "Bron bekor qilindi · {refundAmount}
  qaytarildi" (amount part only when `refundAmount > 0`), booking + list
  invalidated. 400 (status changed) → toast with the error text and refetch.
- **Cancelled** (`FrFXp`): `cancelledAt` date, `cancellationReason` if any.
- **Review** (`vaYXD` / `wih8u`): only for `completed`. `GET
  /api/reviews/my` (first page): a review with this `bookingId` or this
  `stadiumId` → "Sizning bahoyingiz" with its stars and comment; otherwise
  "Oʻyinni baholang" → sheet `QZyHy` (1–5 stars required, comment ≤ 2000) →
  `POST /api/reviews { stadiumId, bookingId, rating, comment? }` → toast
  "Rahmat! Bahoyingiz qabul qilindi"; the two 400s ("already reviewed",
  "only a stadium you have played at") map to their own texts via exact
  strings in `shared/api/messages.ts`.

## 6. Errors and text

- `errors.ts` stays the one mapping; new keys only through it. New exact
  strings (in `API_MESSAGES`): `slotAlreadyBooked` is **not** needed (409 is
  unique on this call); `alreadyReviewed`, `reviewNotPlayed`.
- Every new string in uz/ru/en and in `docs/translations-to-review.md`.
- `docs/backend-requests.md`: R27–R31 under Open requests, each in the
  template; `src/miniapp/api/missing.ts` gets `BOOKING_QUOTE` (R27),
  `BOOKING_PAY` (R28), `BOOKINGS_WHEN` (R29), `BOOKING_CASH_PAID` (R30),
  `BOOKING_STADIUM_FIELDS` (R31).

## 7. Tests (TDD, one commit per task)

- payment machine: every transition incl. the 5×3 s polling with fake timers.
- countdown from `expiresAt` with a fake clock (ticks, floors at 0, `mm:ss`).
- slot taken → message → back to slots with the date, availability refetched.
- cancel shows `refundIfCancelledNow` before and `refundAmount` after.
- card number and SMS code reach no `console`, storage or query/mutation cache.
- each new screen: loading, empty, error + retry, and light/dark via tokens.

## Out of scope

Games in Oʻyinlarim, recurring bookings, legacy Payme/Click checkout, the
owner side, deep-link routing (Part 4).
