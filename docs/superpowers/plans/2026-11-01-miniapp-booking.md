# Mini App booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Checkout with a saved card, card management, the payment states, the bookings list in Oʻyinlarim, booking detail with pay-remainder, cancel and review.

**Architecture:** API modules per backend area under `src/miniapp/api/`; a pure payment state machine driven by a small hook; screens under `src/miniapp/booking/`, `src/miniapp/cards/`, `src/miniapp/bookings/`. TanStack Query for reads; card entry deliberately outside the Query cache.

**Tech Stack:** React 19, TS 6 strict, react-router 8, TanStack Query 5, i18next, Tailwind 4 tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-01-miniapp-booking-design.md` — read it first; it fixes every text, field and rule referenced below.

## Global Constraints

- Every user-facing string through `t()` in uz/ru/en (keys identical — test enforces); new keys listed in `docs/translations-to-review.md`. Uzbek `ʻ` U+02BB, `ʼ` U+02BC. No hard-coded strings, not even `aria-label`.
- Tokens only (`bg-bar`, `bg-page`, `bg-background`, `text-primary`, `text-secondary`, `bg-accent`, `text-link`, `success|warning|danger(-soft)` …); no hex, no fixed Tailwind colours. Check light and dark.
- Money only via `formatMoney` (Mini App) / `formatSom`; times via `shared/format` helpers in Asia/Tashkent. Never compute a price, deposit, remainder, refund or deadline.
- Use existing components (`Button`, `Card`, `ListRow`, `Badge`, `BottomSheet`, `Screen`/`Header`/`BottomBar`, `StateView`/`EmptyState`/`ErrorState`, `Skeleton*`, `LogoSpinner`, `useToast`); `useBackButton` for back; `haptic` on main actions; touch targets ≥ 44px.
- Errors shown only via `errorMessageKey` / `errorMessage` (`src/miniapp/api/errors.ts`); exact backend strings only in `src/shared/api/messages.ts`.
- `src/shared` imports nothing from `src/miniapp`/`src/admin`.
- Card number, expiry and SMS code: component state only; never `console`, storage, query keys or `useMutation` variables.
- Each task ends with `npm run typecheck && npm run lint && npm run test` green, then a commit on `feature/miniapp-stadiums` with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Leave untracked `admin-real-data-report.md` alone. Never touch `../minipolyaBackend`, never branch or push.
- After any `git stash`/checkout run `npm run format` (CRLF).

## Review Focus

1. Double charge: "Qayta urinish" after a network error must re-POST only from `failed`, never from `declined`/`checking` — Task 2 test `retry is offered only from failed`.
2. Leaving checkout while `paying` (BackButton / route change) must not set state after unmount or fire a second POST — Task 4 test `back is ignored while paying`.
3. Countdown when `expiresAt` is already past or the device clock is ahead → shows `00:00` / "Bron muddati tugadi", never negative — Task 2 test `floors at zero`.
4. Pasting a spaced card number ("8600 1234 5678 9012") or a 6-digit SMS code from the keyboard suggestion must work — Task 3 tests `accepts a pasted spaced number`, `accepts a pasted code`.
5. A booking whose stadium request fails still renders its detail from the booking alone — Task 6 test `renders without the stadium`.

---

### Task 1: Foundations — API modules, statuses, helper, backend requests

**Files:**
- Create: `src/miniapp/api/bookings.ts`, `src/miniapp/api/cards.ts`, `src/miniapp/api/payments.ts`, `src/miniapp/api/reviews.ts`, `src/miniapp/bookings/status.ts`, `src/miniapp/test/bookings.ts`
- Modify: `src/shared/format/datetime.ts` + `index.ts` (`tashkentToUtc`), `src/shared/api/messages.ts`, `src/miniapp/api/missing.ts`, `src/miniapp/api/errors.ts` (no new branches yet unless needed), `docs/backend-requests.md` (R27–R31, template format, Open requests), locales (status labels)
- Test: `src/shared/format/datetime.test.ts` (or the existing format test file), `src/miniapp/bookings/status.test.ts`, `src/miniapp/api/missing.test.ts` if absent

**Interfaces (Produces):**
- `tashkentToUtc(date: string /* YYYY-MM-DD */, time: string /* HH:mm */): string` → ISO UTC `"2026-11-06T15:00:00.000Z"` for `('2026-11-06','20:00')`. Use the `Asia/Tashkent` offset via `Intl` (do not hard-code +5).
- `api/bookings.ts`: `interface Booking` (all `BookingResponse` player fields from api-reference §5, optional where NON_NULL), `type BookingStatus`, `type PaymentStatus = 'unpaid'|'partially_paid'|'paid'`, `type PaymentOption = 'MINIMUM'|'FULL'`; `createBooking(body: { stadiumId: string; startsAt: string; cardId: string; paymentOption: PaymentOption }): Promise<Booking>`; `getBookings(page: number): Promise<Page<Booking>>` (size 20); `getBooking(id): Promise<Booking>`; `payRemainder(id, cardId): Promise<Booking>`; `cancelBooking(id): Promise<Booking>`. Constants `BOOKING_QUOTE = 'GET /api/stadiums/{id}/quote'`, `BOOKING_PAY = 'POST /api/bookings/{id}/pay'`, `BOOKINGS_WHEN = 'GET /api/bookings?when'`, `BOOKING_CASH_PAID = 'BookingResponse.paidInCash'`, `BOOKING_STADIUM_FIELDS = 'BookingResponse.stadiumCoverPhotoUrl'`. Query keys `BOOKINGS_KEY = ['bookings']`, `bookingKey(id) = ['booking', id]`.
- `api/cards.ts`: `interface SavedCard { id; maskedNumber; cardType; expiry; isActive; createdAt }`; `getCards(): Promise<SavedCard[]>`; `startCardBinding(cardNumber: string, expiry: string): Promise<{ bindingId: string; maskedPhone: string }>`; `confirmCard(bindingId, smsCode): Promise<SavedCard>`; `deleteCard(id): Promise<void>`; `CARDS_KEY = ['cards']`; `lastFour(masked: string): string`.
- `api/payments.ts`: `interface Payment { id; bookingId?; amount; paymentType; status; createdAt; … }`; `getMyPayments(page = 0): Promise<Page<Payment>>` (size 20).
- `api/reviews.ts`: `interface MyReview` (= `ReviewResponse`); `getMyReviews(): Promise<Page<MyReview>>`; `postReview(body: { stadiumId; bookingId?; rating; comment? }): Promise<MyReview>`; `MY_REVIEWS_KEY = ['reviews','my']`. Reuse the existing `Review` type from `api/stadiums.ts` if it matches.
- `bookings/status.ts`: `bookingStatusBadge(status: string): { tone: BadgeTone; labelKey: ParseKeys | null; raw: string }` — mapping in spec §4.
- `messages.ts` `API_MESSAGES.alreadyReviewed = 'You have already reviewed this stadium'`, `reviewNotPlayed = 'You can only review a stadium you have played at'`.
- `test/bookings.ts`: `makeBooking(overrides)`, `makeCard(overrides)`, `makePayment(overrides)`.

- [ ] **Step 1: Failing tests:** `tashkentToUtc('2026-11-06','20:00') === '2026-11-06T15:00:00.000Z'`, `('2026-11-07','00:00') === '2026-11-06T19:00:00.000Z'`; `bookingStatusBadge` table for all seven statuses + `'weird'` → neutral, raw `'weird'`; `lastFour('8600 •••• 1234') === '1234'`; `isAvailable(BOOKING_PAY) === false` (and the other four); `createBooking` sends `paymentOption` uppercase and `startsAt` unchanged (stubApi `calls`).
- [ ] **Step 2:** `npx vitest run src/shared/format src/miniapp/bookings src/miniapp/api` → FAIL.
- [ ] **Step 3:** Implement. Write R27 (quote: `GET /api/stadiums/{id}/quote?startsAt=&paymentOption=` → `{ price, deposit, remainder, cancellationDeadline }`), R28 (`POST /api/bookings/{id}/pay { cardId, paymentOption? }` for a pending unpaid booking within its hold), R29 (`?when=upcoming|past` on `GET /api/bookings`, upcoming ascending, past descending), R30 (`paidInCash` tiyin on the player `BookingResponse`), R31 (`stadiumCoverPhotoUrl`, `stadiumDistrict`, `stadiumFormat` on `BookingResponse`) with every template field; add each to `MISSING_ENDPOINTS` and update its header comment.
- [ ] **Step 4:** PASS; typecheck, lint.
- [ ] **Step 5:** Commit `feat(miniapp): booking, card, payment and review API; R27–R31`.

### Task 2: Payment state machine and countdown

**Files:**
- Create: `src/miniapp/payment/machine.ts`, `src/miniapp/payment/usePayment.ts`, `src/miniapp/payment/useCountdown.ts`
- Test: `src/miniapp/payment/machine.test.ts`, `src/miniapp/payment/useCountdown.test.ts`

**Interfaces:**
- Consumes: Task 1 `createBooking`, `payRemainder`, `getBooking`, `getMyPayments`, `Booking`, `errorMessageKey`.
- Produces:
  - `type PaymentState = { kind: 'idle' } | { kind: 'paying' } | { kind: 'success'; booking: Booking } | { kind: 'declined'; booking: Booking } | { kind: 'checking'; booking: Booking } | { kind: 'slotTaken' } | { kind: 'failed'; errorKey: ErrorMessageKey }`.
  - `runPayment(charge: () => Promise<Booking>, opts: { paymentType: 'booking' | 'remainder'; pollTimes?: number /* 5 */; pollMs?: number /* 3000 */; sleep?: (ms) => Promise<void>; isCancelled?: () => boolean }): Promise<PaymentState>` — pure async, no React. 409 from `charge` → `slotTaken` only when `paymentType === 'booking'`.
  - `isSuccess(b: Booking)`: `paymentStatus` `paid` | `partially_paid` for booking; `paid` for remainder (a remainder payment that fails leaves `partially_paid`, so success = `paid`).
  - `canRetry(state): boolean` — true only for `failed`.
  - `usePayment(): { state: PaymentState; pay: (charge, opts) => Promise<void>; reset: () => void }` — ignores `pay` while `paying`; no setState after unmount.
  - `useCountdown(expiresAt: string | undefined, now?: () => number): { seconds: number; label: string /* 'mm:ss' */; expired: boolean }` — 1 s interval, floor at 0.

- [ ] **Step 1: Failing tests** (`vi.useFakeTimers()`; inject `sleep`):
  - `paid → success`, `partially_paid → success` (booking).
  - `unpaid + failed payment row → declined` (row matched on `bookingId`; another booking's `failed` row ignored).
  - `unpaid + processing → polls getBooking 5 times 3000 ms apart → checking` (assert 5 calls, sleep called with 3000).
  - `processing then paid on 3rd poll → success` (stops polling).
  - `processing then failed row appears → declined`.
  - `no payment row → polls → checking`.
  - `409 → slotTaken` (booking); `409 on remainder → failed('errors.conflict')`.
  - `network error → failed('errors.network')`; `500 → failed('errors.server')`.
  - `retry is offered only from failed` — `canRetry` true only for `failed`.
  - `remainder: partially_paid answer + failed row → declined`; `paid → success`.
  - `usePayment ignores a second pay while paying` (one `charge` call).
  - countdown: `'2026-11-06T15:10:00Z'` with now `15:00:00Z` → `'10:00'`; after 61 s → `'08:59'`; `floors at zero` (past `expiresAt` → `'00:00'`, `expired` true); `undefined` → `expired` false, `seconds` 0.
- [ ] **Step 2:** `npx vitest run src/miniapp/payment` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): payment state machine with processing poll, and the hold countdown`.

### Task 3: Cards — Kartalarim and the add-card sheet

**Files:**
- Create: `src/miniapp/cards/CardsPage.tsx`, `src/miniapp/cards/AddCardSheet.tsx`, `src/miniapp/cards/CardRow.tsx` (brand tile + "•••• 1234" + type · expiry; `selected`/`onSelect` radio mode and `onMore` list mode), `src/miniapp/cards/queries.ts` (`useCards`, `useDeleteCard`), `src/miniapp/cards/cardInput.ts` (`digitsOnly`, `groupCardNumber`, `isCardNumberComplete`, `isExpiryShape`)
- Modify: `src/miniapp/routes.tsx` (`/profile/cards` → `CardsPage`), locales, `docs/translations-to-review.md`
- Test: `src/miniapp/cards/cardInput.test.ts`, `src/miniapp/cards/CardsPage.test.tsx`, `src/miniapp/cards/AddCardSheet.test.tsx`

**Interfaces:**
- Consumes: Task 1 cards API.
- Produces: `AddCardSheet({ open: boolean; onClose(): void; onSaved(card: SavedCard): void })`; `CardRow({ card; selected?; onSelect?; onMore?; invalid? })`; `useCards()` (query `CARDS_KEY`).

- [ ] **Step 1: Failing tests:**
  - cardInput: `groupCardNumber('8600123456789012') === '8600 1234 5678 9012'`; `digitsOnly('8600 1234-5678 9012') === '8600123456789012'`; `isExpiryShape('12/27')` true, `'13/27'` false, `'1/27'` false.
  - CardsPage: lists two cards as "•••• 1234" / "•••• 5678" with type · expiry; loading skeleton; empty state with "Karta qoʻshish"; error + "Qayta urinish" refetches; delete via ⋯ → confirm → `DELETE /api/cards/c1` called, toast, list refetched.
  - AddCardSheet: button disabled until 16 digits + valid expiry; `accepts a pasted spaced number`; posts `{ cardNumber:'8600123456789012', expiry:'12/27' }`; shows `maskedPhone`; resend disabled for 60 s then re-posts the card (2nd `POST /api/cards`) and uses the new `bindingId`; `accepts a pasted code` ('111111' at once) → `POST /api/cards/confirm { bindingId, smsCode:'111111' }` → `onSaved(card)`; 400 on bind → wrong-number text; 400 on confirm → wrong-code text and code cleared; network → no-internet text; after 60 s without confirm → code-expired hint.
  - **sensitive**: spy `console.log/info/warn/error/debug`, `Storage.prototype.setItem`; after a full bind+confirm, none received '8600123456789012', '1234 5678', or '111111'; `JSON.stringify(queryClient.getQueryCache().getAll().map(q => [q.queryKey, q.state.data]))` and the mutation cache's variables contain none of them.
- [ ] **Step 2:** `npx vitest run src/miniapp/cards` → FAIL.
- [ ] **Step 3:** Implement; API calls in the sheet via plain `await startCardBinding(...)` inside handlers (not `useMutation`); clear number/expiry/code on close and success. Brand tile: `cardType` lowercased contains `humo` → "HUMO", `uzcard` → "UZCARD", else `CreditCard` icon; tile colours from tokens.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): Kartalarim and adding a card with SMS confirmation`.

### Task 4: Checkout and the success screen

**Files:**
- Create: `src/miniapp/booking/CheckoutPage.tsx`, `src/miniapp/booking/PaymentOptions.tsx`, `src/miniapp/booking/BookedPage.tsx` (route `/checkout/done`, booking passed in `location.state`; without state → redirect `/games`), `src/miniapp/booking/checkoutParams.ts` (`parseCheckoutParams(search, today): { stadiumId; date; start } | null`)
- Modify: `src/miniapp/routes.tsx`, locales, translations doc
- Test: `src/miniapp/booking/checkoutParams.test.ts`, `src/miniapp/booking/CheckoutPage.test.tsx`, `src/miniapp/booking/BookedPage.test.tsx`

**Interfaces:**
- Consumes: `useStadium`, `getAvailability`/`availabilityKey` (stadiums/queries), `useCards`, `CardRow`, `AddCardSheet`, `usePayment`, `useCountdown`, `createBooking`, `tashkentToUtc`, `isInBookingWindow`, `slotLabel`, `formatLongDate`.
- Produces: routes `/checkout`, `/checkout/done`.

- [ ] **Step 1: Failing tests** (stadium with `minBookingAmount: 5500000`, slot 20:00 `pricePerHour: 15500000`, two cards):
  - shows Jami "155 000 soʻm", options "Oldindan toʻlov · 55 000 soʻm" (selected) and "Toʻliq toʻlov · 155 000 soʻm", the remainder note without a number, the cancellation sentence with `cancellationHours`, button "Toʻlash · 55 000 soʻm"; choosing full → "Toʻlash · 155 000 soʻm".
  - no `minBookingAmount` → only full + "toʻliq toʻlov talab qiladi" note.
  - pay posts `{ stadiumId, startsAt:'2026-11-06T15:00:00.000Z', cardId:'c1', paymentOption:'MINIMUM' }`; button shows "Toʻlanmoqda…" while pending.
  - `paid` → navigates to `/checkout/done`; BookedPage shows "Band qilindi!", "Toʻlandi: 155 000 soʻm", deadline line from `cancellationDeadline`, no "Qolgani" when `remainingAmount` 0; with `remainingAmount: 10000000` shows "Qolgani: 100 000 soʻm".
  - declined (unpaid + failed row) → danger text, countdown from `expiresAt`, "Qayta urinish" and "Boshqa karta" disabled with "Tez orada".
  - slot taken (409) → "Bu vaqt band boʻlib qoldi"; "Boshqa vaqt tanlash" → `/stadiums/s1?date=2026-11-06`; availability for that date refetched.
  - network error → error text + "Qayta urinish" re-posts once.
  - no cards → "Toʻlash uchun avval karta qoʻshing", pay disabled; adding a card in the sheet selects it.
  - bad params (`?date=garbage`, slot not free) → error state with "Vaqtni tanlash".
  - `back is ignored while paying` (BackButton handler during pending POST does not navigate; one POST only).
- [ ] **Step 2:** FAIL. **Step 3:** Implement (invalidate `BOOKINGS_KEY` and the availability key on success). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): checkout — payment option, card, pay, declined/slot-taken/processing, Band qilindi`.

### Task 5: Oʻyinlarim — the bookings list

**Files:**
- Create: `src/miniapp/bookings/BookingsPage.tsx`, `src/miniapp/bookings/BookingCard.tsx`, `src/miniapp/bookings/queries.ts` (`useBookings` infinite, `useBooking(id)`)
- Modify: `src/miniapp/routes.tsx` (`/games` → `BookingsPage` inside the tab layout as other tabs), locales, translations doc
- Test: `src/miniapp/bookings/BookingsPage.test.tsx`

**Interfaces:** Consumes Task 1 `getBookings`, `bookingStatusBadge`, `BOOKINGS_WHEN`. Produces `useBooking(id)`, `BookingCard({ booking; onOpen })`.

- [ ] **Step 1: Failing tests:** renders cards in server order with name, "Juma, 6-noyabr · 20:00–21:00" style line and badges (Kutilmoqda / Tasdiqlangan / Bekor qilingan); Kelgusi / Oʻtgan disabled with "Tez orada" and no `when` query sent; tap → `/bookings/b1`; second page loads ("Yana koʻrsatish" or sentinel, matching StadiumsPage's pattern); loading skeleton; empty "Hali bronlar yoʻq" + "Maydon topish" → `/`; error + retry.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): Oʻyinlarim — the player's bookings with status badges`.

### Task 6: Booking detail — info, payment card, pay the rest, cancel

**Files:**
- Create: `src/miniapp/bookings/BookingPage.tsx`, `src/miniapp/bookings/PaymentSummary.tsx`, `src/miniapp/bookings/CancelSheet.tsx`, `src/miniapp/bookings/PayRemainderSheet.tsx` (card choice + add card + `usePayment` remainder path)
- Modify: `src/miniapp/routes.tsx` (`/bookings/:id`), locales, translations doc
- Test: `src/miniapp/bookings/BookingPage.test.tsx`

**Interfaces:** Consumes `useBooking`, `useStadium`, `useCards`, `CardRow`, `AddCardSheet`, `usePayment`, `payRemainder`, `cancelBooking`, `useCountdown`, `mapLink`, `bookingStatusBadge`.

- [ ] **Step 1: Failing tests:**
  - partially paid confirmed: Narx 155 000, Toʻlangan 55 000, Qolgan summa 100 000 + "Toʻlanmagan"; "Qolganini ilovada toʻlash" → sheet → pay → `POST /api/bookings/b1/pay-remainder { cardId:'c1' }` → success toast, booking refetched; declined → declined text in sheet.
  - fully paid: no pay-remainder button, ✓ on Toʻlangan.
  - `cancel shows the API's refund`: `refundIfCancelledNow: 5500000` → "Hozir bekor qilsangiz: 55 000 soʻm qaytariladi" on page and in sheet; confirm → `POST /api/bookings/b1/cancel`; response `refundAmount: 5500000` → toast with "55 000 soʻm"; `refundIfCancelledNow: 0` with `paidAmount > 0` → "toʻlov qaytarilmaydi" warning.
  - pending: banner with countdown from `expiresAt`, "Toʻlash" disabled "Tez orada".
  - cancelled: no cancel button, cancelled date shown; expired: badge Muddati oʻtgan, no actions.
  - address/phone/map shown from the stadium; `renders without the stadium` (stadium 500 → name from booking, no address rows, no error screen).
  - loading skeleton; booking 404 → error state + retry.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): booking detail — payment card, pay the rest, cancel with the API's refund`.

### Task 7: Review a completed booking

**Files:**
- Create: `src/miniapp/bookings/ReviewSection.tsx`, `src/miniapp/bookings/ReviewSheet.tsx`
- Modify: `src/miniapp/bookings/BookingPage.tsx`, `src/miniapp/api/errors.ts` (review 400s → `errors.alreadyReviewed` / `errors.reviewNotPlayed` via `API_MESSAGES`), locales, translations doc
- Test: `src/miniapp/bookings/ReviewSection.test.tsx`, `src/miniapp/api/errors.test.ts`

- [ ] **Step 1: Failing tests:** completed booking without own review → "Oʻyinni baholang" → sheet → submit disabled until a star → `POST /api/reviews { stadiumId:'s1', bookingId:'b1', rating:4, comment:'Zoʻr' }` → toast, section shows the stars; existing review with `bookingId: 'b1'` (or same `stadiumId`) → "Sizning bahoyingiz" and no button; 400 `'You have already reviewed this stadium'` → its text; confirmed booking → no section and no `GET /api/reviews/my`; errors.test: both exact strings map to their keys, other 400 stays `errors.invalid`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): review a completed booking`.

### Task 8: Docs and browser check

**Files:** `CLAUDE.md` (structure tree: `booking/`, `bookings/`, `cards/`, `payment/`; Mini App rules: card data never in Query cache, payment machine), `docs/api-reference.md` (only if anything was found wrong), `docs/translations-to-review.md` (complete).

- [ ] **Step 1:** Update docs; `npm run format:check`, typecheck, lint, test, build.
- [ ] **Step 2:** Browser (backend in dev profile, dev picker): checkout → add card (SMS 111111) → pay → Band qilindi; card ending 0002 → declined; Oʻyinlarim list; booking detail; cancel. 390×844 light and dark. If the dev backend is not up, report it as PARTIAL.
- [ ] **Step 3:** Commit `docs: booking flow — checkout, cards, payment, Oʻyinlarim`.
