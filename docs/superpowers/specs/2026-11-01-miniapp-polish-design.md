# Mini App polish — fullscreen, header, splash, compact cards

Sub-project A of two (B = checkout, cards, payment, Bronlarim — its own spec).
Approved in chat on 2026-11-01. Follows `CLAUDE.md` and its "Mini App" section.

## Goal

Make the Mini App feel native inside Telegram: fullscreen on phones with our
own header in Telegram's Close/⋯ row, a branded splash instead of a skeleton
flash, and the denser home screen from "Bosh sahifa v2" — without inventing
any data.

## Design frames used (telegram-webapp.pen, read through pencil MCP)

`Fullscreen Header` (G4i6s) · `Sarlavha / Fullscreen / Logo|Salom` ·
`Stadium Card Compact` (S9bEG) + its skeleton (XHUua) · `Info Banner` (i1tcN)
· `Bosh sahifa / Maydonlar / Roʻyxat|Loading` · `Logo Mark` (EUDPH) ·
`Brend / Logo belgisi` · `Brand / App icon` (rlESe) ·
`Yuklanish / Splash / Default|Animatsiya`.

Key measurements: Telegram row 46 px, Close and ⋯ pills 90×32 at 12 px from
the edges, our title centred between them (mark 24 px + 17 px semibold);
content starts 12 px below the row; header bg `p3-bg`, a 1 px border only once
scrolled. Compact card: 358 wide, padding 10, radius 16, photo 150 tall radius
12, name 16 semibold, meta 13, price 16 bold + "/soat" 13, button 40 tall.

## 1. Telegram layer — `src/miniapp/telegram/`

- `webApp.ts` types: `isFullscreen`, `requestFullscreen()`,
  `exitFullscreen()`, `disableVerticalSwipes()`, `setBottomBarColor()`,
  events `fullscreenChanged`, `fullscreenFailed`.
- `initViewport()`:
  1. `ready()`, `expand()`.
  2. `disableVerticalSwipes()` when `isVersionAtLeast('7.7')`.
  3. `requestFullscreen()` only when `platform` is `android` or `ios` **and**
     `isVersionAtLeast('8.0')`. Desktop (`tdesktop`, `macos`), web
     (`weba`, `webk`) and older clients keep the normal mode.
  4. `<html data-fullscreen="true|false">` from `isFullscreen`, updated on
     `fullscreenChanged`; `fullscreenFailed` sets it to false.
  5. CSS variables, updated on `safeAreaChanged` / `contentSafeAreaChanged`:
     `--tg-safe-top|bottom|left|right` = `safeAreaInset` (device only — today
     they are device + content, which changes), `--tg-content-top` =
     `contentSafeAreaInset.top`.
- `getStartParam()` — one function, the deep-link payload from, in order:
  `initDataUnsafe.start_param`, `start_param` inside `initData`, the page
  URL's `?startapp=`, then `?tgWebAppStartParam=` (the bot opens
  `MINIAPP_URL?startapp=<payload>` because Telegram passes no start_param to
  `web_app` buttons). Works outside Telegram too (URL only). Routing on it is
  Part 4.
- Outside Telegram nothing is called and the CSS falls back to
  `env(safe-area-inset-*)`, `--tg-content-top: 0px`.

## 2. Theme → Telegram chrome — `src/miniapp/theme.ts`

On every theme apply (start, Profil → Mavzu, `themeChanged`):
`setHeaderColor(--bar-bg)`, `setBackgroundColor(--page-bg)`,
`setBottomBarColor(--bar-bg)` (7.10+, guarded), read from the computed tokens.

## 3. Header — `components/AppHeader` (replaces `Header` usage)

- `data-fullscreen=true`: fixed height `var(--tg-content-top)` at
  `top: var(--tg-safe-top)` (the screen pads `--tg-safe-top`), title centred
  with `px-[102px]` (12 + 90 pill + 0 gap) so it never reaches Close/⋯, no back
  button of our own (Telegram's BackButton, as now), no action slot inside the
  row — an action moves below the header into the content.
- Otherwise: today's 56 px header (title left, own back button when Telegram
  has none, action on the right).
- Tab roots: `LogoMark` 24 + "MiniPolya"; Bosh sahifa shows
  "Salom, {firstName}" when `useMe()` has a `firstName`, else the logo title.
- Bottom border appears once the page scrolls (`useScrolled`).
- Inner screens keep their own titles.
- Bottom nav and bottom bars keep `pb-(--tg-safe-bottom)`.

## 4. Brand and splash

- `src/shared/brand/logo-mark.svg` (EUDPH path, viewBox 64, `currentColor`)
  and `src/shared/brand/logoMark.ts` (the path string). The React component
  `LogoMark.tsx` lives in `src/miniapp/components/` and imports that string.
- `public/favicon.svg` — the mark in `#2563EB`.
- `design/brand/app-icon-512.png` — exported from the `Brand / App icon` frame
  (gradient #3B7BF5→#1D4ED8, radius 112, white mark 308), safe-circle guide
  hidden. For BotFather; uploaded by the user.
- Splash in `index.html`: `<div id="splash">` with inline SVG mark (96),
  "MiniPolya" 24 semibold, three dots, tagline "Toshkent maydonlari — bir
  joyda" (Uzbek: the language is unknown before login, and Uzbek is the
  default). Colours from `prefers-color-scheme`; a three-line inline script
  after `telegram-web-app.js` sets `data-theme` from Telegram's `colorScheme`
  (and the stored Mavzu override) before the bundle loads, so the splash
  matches the app. Animation A (ball rolls, 1.2 s) only under
  `prefers-reduced-motion: no-preference`; otherwise the static logo.
- `src/miniapp/splash.ts` — `hideSplash()`: idempotent; waits until 400 ms
  after navigation start, then a 200 ms opacity fade (none with reduced
  motion), then removes the node. Called by:
  - `AuthGate` on `error`, `blocked`, `no-telegram`;
  - `useSplashDone(ready)` in each route's page: Bosh sahifa when its first
    list page has settled (data or error); other routes on mount.
  The AuthGate loading skeleton is no longer shown — the splash covers it.
- `components/LogoSpinner` — animation B (pulse 1 → 1.06, opacity 1 → 0.6,
  1.6 s), static with reduced motion, `role="status"` + translated label.
  Lists keep their skeletons.

## 5. Home and compact card

- `stadiums/StadiumCardCompact.tsx` — exactly S9bEG: photo `loading="lazy"`
  on a `bg-surface` placeholder, fades in on load; no photo → the surface with
  a muted logo mark; heart (36, image overlay) top right, rating chip bottom
  left (only when `averageRating` exists); name and meta one truncated line
  each; `formatSom(pricePerHour)` + "/soat" and "Band qilish" on one row. One
  price, from the API.
- Bosh sahifa order: search + filter button → `DateStrip` (reused) → Info
  Banner "Toʻlov xavfsiz · Bekor qilish shartlari aniq", dismissible
  (remembered in localStorage `minipolya-miniapp-banner-hidden`) → section
  header "Barcha maydonlar · {totalElements}" → compact cards → "Yana
  yuklash". Loading: compact skeletons.
- The chosen date travels: card → `/stadiums/:id?date=YYYY-MM-DD`;
  `StadiumPage` starts its strip on that date when it is inside the 28-day
  window, else today.
- Format chips move into the Filters sheet (format, price, district).
- Sevimlilar uses the compact card.
- **Skipped (no API):** the "Yaqin atrofda" carousel (needs distance or
  rating order) → backend request R24; "Boʻsh maydonlar · N" (needs a
  free-on-date filter) → R25. Both added to `docs/backend-requests.md` and
  `MISSING_ENDPOINTS`; nothing requested meanwhile.

## 6. Dev sign-in (local testing only)

- `src/miniapp/auth/dev/` — a user picker on the "open in Telegram" screen
  using backend R19: `GET /api/auth/dev/users`, `POST /api/auth/dev/login`,
  both with header `X-Dev-Login-Key: <VITE_DEV_LOGIN_KEY>`.
- Loaded only via `if (import.meta.env.DEV) await import('./dev/…')`, so
  neither the picker nor the key is in `dist`. Verified after `npm run build`
  by grepping `dist/` for `dev/login`, `X-Dev-Login-Key` and the key value.
- `.env.example` gets an empty `VITE_DEV_LOGIN_KEY=`.
- Note: backend `ed403c7` does not check `X-Dev-Login-Key` yet; the header is
  sent anyway and is harmless until it does.

## Error handling

- `requestFullscreen` throws on unsupported clients → caught, normal mode.
- `fullscreenFailed` → normal mode, normal header.
- Splash: an error in login or the first screen hides it and the error screen
  shows; a hard JS failure leaves the splash — acceptable, the bundle failed.

## Testing

Unit (Vitest, fake Telegram): viewport gating by platform/version, CSS
variables, fullscreen events; `getStartParam` sources and order; theme →
`setHeaderColor/BackgroundColor/BottomBarColor` on change; splash minimum
400 ms, reduced motion, idempotence, error path; `AppHeader` greeting vs
logo, fullscreen padding; compact card one price, lazy image, rating only when
present; home date → stadium link; Filters sheet format; dev picker absent in
production (`import.meta.env.DEV` false). Then browser at 360×640, 390×844,
430×932, light and dark, via the dev picker.
