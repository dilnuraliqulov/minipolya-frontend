# Mini App polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fullscreen with our header in Telegram's Close/⋯ row, a branded splash, compact stadium cards and the "Bosh sahifa v2" home — real data only.

**Architecture:** The Telegram wrapper owns fullscreen and the safe-area CSS variables; layout components read only those variables and `html[data-fullscreen]`. The splash is plain HTML in `index.html`, removed by one idempotent `hideSplash()` that pages call once their first data settles. Home reuses `DateStrip` and passes the date to the stadium page through `?date=`.

**Tech Stack:** React 19, TypeScript 6 strict, Tailwind v4 tokens, TanStack Query v5, i18next, Vitest + Testing Library, telegram-web-app.js.

**Spec:** `docs/superpowers/specs/2026-11-01-miniapp-polish-design.md`

## Global Constraints

- Every user-facing string through `t()` in uz/ru/en; new keys listed in `docs/translations-to-review.md`. Uzbek `ʻ` U+02BB, `ʼ` U+02BC.
- Colours only from tokens (`bg-bar`, `bg-page`, `text-primary` …); no hex in components (the inline splash CSS and the SVG files are the only exceptions, values copied from `src/miniapp/index.css`).
- Touch targets ≥ 44px (the 36px heart sits in a 44px hit area).
- Money only via `formatSom` / `formatSomParts`; one price per card.
- `src/shared` imports nothing from `src/miniapp`.
- Each task ends with `npm run typecheck && npm run lint && npm run test` green and a commit; `npm run build` also before the last commit of tasks 4 and 8.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- After any `git stash`/checkout, run `npm run format` (CRLF memory).

## Review Focus

1. Telegram 8.0 on desktop (`tdesktop`, `macos`, `weba`, `webk`) — must NOT go fullscreen. Test in Task 1.
2. `requestFullscreen` throwing (old client lying about version) — app keeps working in normal mode. Test in Task 1.
3. A `?date=` that is malformed or outside the 28-day window — the stadium page falls back to today, never a 400 from availability. Test in Task 7.
4. Splash when login fails fast (< 400 ms) — the error screen still appears after the minimum, splash never sticks. Test in Task 4.
5. A user with no `firstName` (new user) — header shows the logo title, never "Salom, undefined". Test in Task 5.

---

### Task 1: Telegram wrapper — fullscreen, swipes, safe areas, start param

**Files:**
- Modify: `src/miniapp/telegram/webApp.ts`, `src/miniapp/telegram/viewport.ts`, `src/miniapp/index.css` (`:root` vars), `src/miniapp/test/fakeTelegram.ts`
- Test: `src/miniapp/telegram/telegram.test.ts`

**Interfaces:**
- Produces: `TelegramWebApp` gains `isFullscreen?: boolean`, `requestFullscreen?(): void`, `disableVerticalSwipes?(): void`, `setBottomBarColor?(color: string): void`; `TelegramEvent` adds `'fullscreenChanged' | 'fullscreenFailed'`.
- Produces: `initViewport(): () => void`; `<html data-fullscreen="true|false">`; CSS vars `--tg-safe-{top,bottom,left,right}` (device inset only) and `--tg-content-top`.
- Produces: `getStartParam(): string | null` — order: `initDataUnsafe.start_param` → `start_param` in `initData` → `location.search` `startapp` → `tgWebAppStartParam`; works without Telegram.
- Fake: `installFakeTelegram` gets `requestFullscreen`, `disableVerticalSwipes`, `setBottomBarColor` as `vi.fn()`, `isFullscreen: false`, and `isVersionAtLeast` comparing dotted versions (`'7.10'` > `'7.7'`).

- [ ] **Step 1: Failing tests** in `telegram.test.ts`:
  - `requests fullscreen on ios/android 8.0` → `requestFullscreen` called once after `ready` and `expand` (check `mock.invocationCallOrder`).
  - `it.each(['tdesktop','macos','weba','webk'])('stays windowed on %s')` → not called.
  - `stays windowed below 8.0` (`version: '7.10'`) → not called; `disableVerticalSwipes` called.
  - `disables vertical swipes from 7.7`; not on `'7.6'`.
  - `survives requestFullscreen throwing` → no throw, `data-fullscreen="false"`.
  - `marks fullscreen on fullscreenChanged` (set `isFullscreen=true`, emit) → `"true"`; `fullscreenFailed` → `"false"`.
  - `writes device and content insets separately`: safeAreaInset `{top:47,bottom:34,left:0,right:0}`, content `{top:46,…}` → `--tg-safe-top: 47px`, `--tg-safe-bottom: 34px`, `--tg-content-top: 46px`; after changing and emitting `contentSafeAreaChanged` → updated.
  - `getStartParam`: from `initDataUnsafe`; from `initData`; from `?startapp=team_abc` without Telegram (`history.replaceState`); from `?tgWebAppStartParam=x`; `initDataUnsafe` wins over URL; none → `null`.
- [ ] **Step 2:** `npx vitest run src/miniapp/telegram` → FAIL.
- [ ] **Step 3:** Implement. Platform set `MOBILE = new Set(['android','ios'])`. Wrap `requestFullscreen` in try/catch. `index.css` `:root`: add `--tg-content-top: 0px` and a comment that inside Telegram the vars are device-only.
- [ ] **Step 4:** tests PASS; also `src/miniapp/App.test.tsx` still green (it relied on summed insets? grep `--tg-safe` in tests and update).
- [ ] **Step 5:** Commit `feat(miniapp): fullscreen on phones, no swipe-to-close, separate safe areas, start param from the URL`.

### Task 2: Theme paints Telegram's header, background and bottom bar

**Files:** Modify `src/miniapp/theme.ts`; Test `src/miniapp/theme.test.ts`

**Interfaces:** Consumes Task 1 types. `paintTelegramChrome()` uses `--bar-bg` for header and bottom bar, `--page-bg` for background; `setBottomBarColor` only when `isVersionAtLeast('7.10')` and defined.

- [ ] **Step 1: Failing tests:** `paints header/background/bottom bar from tokens` (set `--bar-bg:#ffffff` `--page-bg:#f7f8fa` on `documentElement.style` before `initMiniAppTheme()`; expect the three calls); `repaints on themeChanged`; `repaints when Mavzu changes` (`setThemePreference('dark')`); `skips setBottomBarColor before 7.10`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): Telegram's header, background and bottom bar follow our theme`.

### Task 3: Brand — logo mark, LogoSpinner, favicon, app icon

**Files:**
- Create: `src/shared/brand/logoMark.ts` (`LOGO_MARK_PATH`, `LOGO_MARK_VIEWBOX = '0 0 64 64'`), `src/shared/brand/logo-mark.svg`, `src/miniapp/components/LogoMark.tsx`, `src/miniapp/components/LogoSpinner.tsx`, `design/brand/app-icon-512.png`
- Modify: `public/favicon.svg`, `src/miniapp/components/index.ts`, `src/miniapp/index.css` (keyframes `logo-pulse`), locales (`common.loading` if missing)
- Test: `src/miniapp/components/brand.test.tsx`

**Interfaces:**
- Produces: `LogoMark({ size?: number = 24, className?: string })` — `<svg aria-hidden fill="currentColor">`, default class `text-accent`.
- Produces: `LogoSpinner({ size?: number = 48, label?: string })` — `role="status"`, `aria-label` = label ?? `t('common.loading')`, class `animate-logo-pulse motion-reduce:animate-none`.
- Path (design EUDPH, verbatim): `M12 12h40a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8v-24a8 8 0 0 1 8-8z m1 5a4 4 0 0 0-4 4v22a4 4 0 0 0 4 4h38a4 4 0 0 0 4-4v-22a4 4 0 0 0-4-4z m16.5 0h5v6.5h-5z m0 23.5h5v6.5h-5z m2.5-14.5a6 6 0 1 1 0 12 6 6 0 1 1 0-12z` (fill-rule evenodd).
- Pulse keyframes: scale 1→1.06, opacity 1→0.6, 1.6 s ease-in-out infinite alternate.

- [ ] **Step 1: Failing tests:** `LogoMark renders the design path at the given size`; `LogoSpinner is a status with a translated label`; `LogoSpinner has motion-reduce:animate-none`.
- [ ] **Step 2:** FAIL. **Step 3:** implement; favicon = the path filled `#2563EB`; export `rlESe` with pencil `Export(['rlESe'],'png', 'design/brand', {scale:1})` after hiding the "Safe Circle" guide (do not save that change to the .pen — re-enable after export), rename to `app-icon-512.png`, confirm 512×512.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(brand): logo mark, LogoSpinner, favicon and the 512px bot icon`.

### Task 4: Splash

**Files:**
- Modify: `index.html`, `src/miniapp/auth/AuthGate.tsx`, `src/miniapp/stadiums/StadiumsPage.tsx`, every other routed page via a wrapper (see below)
- Create: `src/miniapp/splash.ts`, `src/miniapp/splash.test.ts`
- Test: also `src/miniapp/auth/AuthGate.test.tsx`

**Interfaces:**
- Produces: `hideSplash(now?: () => number): void` — idempotent; element `#splash`; waits `max(0, 400 - performance.now())` then adds class `splash-out` (opacity 0, 200 ms) then removes after 200 ms; with `matchMedia('(prefers-reduced-motion: reduce)')` removes without fade. No `#splash` → no-op.
- Produces: `useSplashDone(done: boolean = true): void` — calls `hideSplash()` once when `done` becomes true.
- AuthGate: `loading` renders `null` (splash covers it) **but** if no `#splash` exists (tests, HMR) renders the old skeleton; `error`/`blocked`/`no-telegram` call `useSplashDone()`.
- StadiumsPage: `useSplashDone(!list.isPending)`. Other routes: `routes.tsx` wraps non-home elements in `<SplashDone>{el}</SplashDone>` (a component calling `useSplashDone()`).
- index.html: `<div id="splash" role="status" aria-label="MiniPolya">` with inline SVG (96px, the Task 3 path), wordmark, 3 dots, tagline `Toshkent maydonlari — bir joyda`; `<style>` using `#f7f8fa`/`#0b1220`/`#6b7280`/`#2563eb` light and `#000000`/`#f5f7fa`/`#9ca3af` dark under `@media (prefers-color-scheme: dark)` and `html[data-theme=dark]`; ball-roll keyframes 1.2 s ease-in-out infinite inside `@media (prefers-reduced-motion: no-preference)`. Inline classic script after telegram-web-app.js: read `localStorage['minipolya-miniapp-theme']`; if `light`/`dark` use it, else `Telegram.WebApp.colorScheme` when `platform !== 'unknown'`; set `document.documentElement.dataset.theme`. Wrapped in try/catch.

- [ ] **Step 1: Failing tests** (`vi.useFakeTimers`, stub `performance.now`): `waits until 400 ms after start` (now=100 → nothing removed at 299 ms, removed after 300+200); `removes at once after 400 ms with reduced motion`; `is idempotent` (two calls, one timer); `no-op without #splash`. AuthGate: `hides the splash on a login error` (fake 500 from `/api/auth/telegram`, advance timers, `#splash` gone and "Qayta urinish" visible).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS; `npm run build` OK.
- [ ] **Step 5:** Commit `feat(miniapp): branded splash until the first screen has data`.

### Task 5: Header in Telegram's row

**Files:**
- Modify: `src/miniapp/components/Screen.tsx` (`Header`, `Screen`), `src/miniapp/layout/TabScreen.tsx`, `src/miniapp/stadiums/StadiumsPage.tsx`, locales (`home.greeting`: uz `Salom, {{name}}`, ru `Привет, {{name}}`, en `Hi, {{name}}`)
- Create: `src/miniapp/lib/useScrolled.ts`
- Test: `src/miniapp/components/header.test.tsx`

**Interfaces:**
- `Header` props gain `brand?: boolean` (logo mark 24 + title). Fullscreen styling purely CSS: `in-data-[fullscreen=true]:` variant (Tailwind v4 `in-[html[data-fullscreen=true]]:`) → `h-(--tg-content-top) px-[102px] justify-center border-transparent`, title `text-xl font-semibold text-center`, own back button and `action` hidden in that mode; `action` is re-rendered by `TabScreen` as a row below the header when fullscreen.
- `useScrolled(): boolean` — `window.scrollY > 0`, passive listener; header border only when true (both modes per design note).
- `TabScreen` props: `title`, `brand?: boolean = true`, `action?`. Home passes `title = me.firstName ? t('home.greeting',{name}) : t('app.name')`.
- `Screen`: `pt-(--tg-safe-top)` stays; the header is `sticky top-(--tg-safe-top)`.

- [ ] **Step 1: Failing tests:** `brand header shows the mark and MiniPolya`; `home greets by first name` (me with `firstName:'Dilnur'` → "Salom, Dilnur"); `home without firstName shows MiniPolya` (Review Focus 5); `fullscreen header pads 102px each side` (set `data-fullscreen=true`, assert class presence); `border appears after scrolling` (`fireEvent.scroll(window)` with `scrollY=10`).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): header in Telegram's Close/⋯ row, logo title and greeting`.

### Task 6: Compact stadium card

**Files:**
- Create: `src/miniapp/stadiums/StadiumCardCompact.tsx`, `src/miniapp/stadiums/StadiumCardCompact.test.tsx`; add `SkeletonStadiumCompact` to `src/miniapp/components/Skeleton.tsx`
- Modify: `src/miniapp/stadiums/FavoritesPage.tsx`; delete `StadiumCard.tsx` once unused

**Interfaces:**
- `StadiumCardCompact({ stadium: Stadium, onOpen: () => void, favorite?: { favorited: boolean; onToggle: () => void; pending?: boolean } })` — same `favorite` shape as today's card.
- Layout from S9bEG: `rounded-3xl border border-border bg-background p-2.5 gap-2.5`; photo `h-37.5 rounded-xl bg-surface` with `<img loading="lazy" decoding="async">` `opacity-0` → `opacity-100` on `onLoad` (transition 200 ms); no photo → centred `LogoMark size={40} className="text-secondary opacity-40"`; heart 36 visual in a 44 hit area, `bg-image-overlay text-on-accent` top-right; rating chip `bg-image-overlay text-2xs…text-xs font-semibold` bottom-left only when `averageRating !== undefined`; name `text-lg font-semibold truncate`; meta `text-sm text-secondary truncate` = `[district, formatLabel(format), surfaceLabel(surfaceType)]` joined ` · `; price row `formatSomParts(pricePerHour).amount` `text-lg font-bold` + `t('stadiums.perHourShort')` ("/soat") + `Button` h-10 "Band qilish".
- Whole card opens on click of the button and of the photo/name area (one `onOpen`).

- [ ] **Step 1: Failing tests:** `shows one price from pricePerHour` (15500000 → "155 000 soʻm", exactly one money text); `image is lazy and fades in` (`loading="lazy"`, `opacity-0` until `fireEvent.load`); `rating chip only with averageRating`; `heart toggles and reports pressed state`; `no photo shows the mark placeholder`.
- [ ] **Step 2:** FAIL. **Step 3:** implement; switch FavoritesPage. **Step 4:** PASS incl. `FavoritesPage.test.tsx` (update selectors only).
- [ ] **Step 5:** Commit `feat(miniapp): compact stadium card`.

### Task 7: Bosh sahifa v2

**Files:**
- Modify: `src/miniapp/stadiums/StadiumsPage.tsx`, `FiltersSheet.tsx` (format chips), `StadiumPage.tsx` (initial date from `?date=`), `dates.ts` (`isInBookingWindow(iso, today): boolean`), `src/miniapp/api/missing.ts`, `src/miniapp/api/stadiums.ts` (constants), `docs/backend-requests.md` (R24, R25), locales
- Create: `src/miniapp/stadiums/InfoBanner.tsx`
- Test: `StadiumsPage.test.tsx`, `StadiumPage.test.tsx`, `dates.test.ts`

**Interfaces:**
- `STADIUMS_NEARBY = 'GET /api/stadiums?sort=distance'` (R24: `sort=distance|rating`, `lat`,`lng`) and `STADIUMS_FREE_ON_DATE = 'GET /api/stadiums?date'` (R25: `date` + `freeOnly=true`, `totalElements` = free stadiums) in `MISSING_ENDPOINTS`. Nothing renders for them (home never calls them).
- `InfoBanner({ onDismiss })`; hidden state in localStorage `minipolya-miniapp-banner-hidden` = `'1'` (display preference).
- Section header: `t('stadiums.allCount', { count: firstPage.totalElements })` → "Barcha maydonlar · 12".
- Card `onOpen` → `navigate(\`/stadiums/${id}?date=${date}\`)`; StadiumPage `useState(() => isInBookingWindow(param, today) ? param : today)`.
- FiltersSheet `onApply` now returns `{ format, maxPrice, district }`; filter button dot when any is set.

- [ ] **Step 1: Failing tests:** home `renders search, date strip, banner, count header and compact cards`; `banner dismissal is remembered`; `opening a card carries the chosen date` (tap "Ertaga", click "Band qilish" → route `/stadiums/:id?date=<tomorrow>`); `format filter lives in the sheet` (choose 7×7 → request has `format=7x7`); `requests nothing for nearby/free-on-date` (no fetch with `sort=` or `date=` to `/api/stadiums`); StadiumPage `starts on ?date= inside the window`, `falls back to today for ?date=garbage and ?date=<today+40>` (Review Focus 3); `isInBookingWindow` table.
- [ ] **Step 2:** FAIL. **Step 3:** implement + R24/R25 in `docs/backend-requests.md` (template format, Open requests). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(miniapp): Bosh sahifa v2 — date strip, banner, compact list; R24/R25 for nearby and free-on-date`.

### Task 8: Dev sign-in (dev builds only)

**Files:**
- Modify: `src/shared/api/client.ts` (`RequestOptions.headers?: Record<string,string>`, merged after defaults), `src/miniapp/auth/session.ts` (`adopt(token: string, user: User): Promise<void>` — same as the success half of `authenticate`), `src/miniapp/auth/AuthGate.tsx`, `src/vite-env.d.ts` (`VITE_DEV_LOGIN_KEY?: string`), `.env.example`
- Create: `src/miniapp/auth/dev/devAuth.ts`, `src/miniapp/auth/dev/DevLoginPicker.tsx`, `src/miniapp/auth/dev/devAuth.test.ts`

**Interfaces:**
- `devAuth.ts`: `listDevUsers(): Promise<DevUser[]>` (`GET /api/auth/dev/users`), `devLogin(userId: string): Promise<AuthResponse>` (`POST /api/auth/dev/login`), both with `headers: { 'X-Dev-Login-Key': import.meta.env.VITE_DEV_LOGIN_KEY ?? '' }`. `DevUser = { id: string; name: string; isOwner: boolean; isAdmin: boolean; isBlocked: boolean }`.
- AuthGate `NoTelegramScreen`: `const DevLoginPicker = import.meta.env.DEV ? lazy(() => import('./dev/DevLoginPicker')) : null` — the only reference; picker strings are dev-only and NOT translated (developer tool, never shipped) — documented in a comment.
- Picker: list of users (name, owner/admin/blocked tags), tap → `devLogin` → `session.adopt`.

- [ ] **Step 1: Failing tests:** `sends X-Dev-Login-Key` (stub env `VITE_DEV_LOGIN_KEY='k1'` via `vi.stubEnv`, assert fetch header); `client passes custom headers and keeps Authorization`; `session.adopt sets ready and language`.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5: Verify dist** — `VITE_DEV_LOGIN_KEY=probe-key-123 npm run build` then `grep -rl "dev/login\|X-Dev-Login-Key\|probe-key-123\|DevLoginPicker" dist/` → no output.
- [ ] **Step 6:** Commit `feat(miniapp): dev-only user picker for browser testing (not in production builds)`.

### Task 9: Docs and browser check

**Files:** `docs/api-reference.md` (header: commit `ed403c7`, note no `/api` change in `4d5faf0..ed403c7`; bot sets phone via `PHONE_SHARED_VIA_BOT`; MINIAPP_URL `?startapp=`), `docs/translations-to-review.md`, `CLAUDE.md` (structure: `shared/brand`, `splash.ts`, `auth/dev`; Telegram section: fullscreen + `--tg-content-top`; `getStartParam` URL sources).

- [ ] **Step 1:** Update docs; `npm run format:check`, typecheck, lint, test, build.
- [ ] **Step 2:** Browser (backend running in dev profile): `/` at 360×640, 390×844, 430×932 × light/dark via dev picker — screenshots of home, a stadium page, Profil; check splash shows/hides, no overflow, card one price.
- [ ] **Step 3:** Commit `docs: polish — fullscreen, splash, brand, dev sign-in; backend ed403c7`.
