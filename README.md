# MiniPolya Frontend

Frontends for **MiniPolya**, a football pitch booking platform for Tashkent.
Players find and book pitches, pay by card and organise games, including
team-vs-team matches; stadium owners manage pitches, prices and schedules.

This repository holds two apps built from one Vite project:

| App | For | Entry |
|---|---|---|
| **Telegram Mini App** | players and stadium owners (owner mode) | `index.html` → `src/miniapp` |
| **Admin panel** | platform admins, desktop web | `admin.html` → `src/admin` |

The backend (Spring Boot) lives in a separate repository, `../minipolyaBackend`.

## Running locally

Requires Node.js 22.12+ or 24+ (what Vite 8 and Vitest 5 support).

```bash
npm install
npm run dev
```

- Mini App: <http://localhost:5173/>
- Admin panel: <http://localhost:5173/admin/>

In development the apps call `/api` on their own origin and the dev server
forwards it to the backend at `http://localhost:8080`, so start the backend
first. No `.env.local` is needed for development. For a production build,
copy `.env.example` to `.env.local` and set `VITE_API_URL`.

Outside Telegram the Mini App renders, but it cannot log in: login needs the
`initData` Telegram provides when the app is opened from the bot.

## Scripts

```bash
npm run dev           # dev server for both apps
npm run build         # type-check and build both apps into dist/
npm run preview       # serve the production build
npm run test          # unit tests (Vitest)
npm run lint          # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript
```

## Documentation

- [`CLAUDE.md`](CLAUDE.md): project rules, stack, structure, theme and API
  conventions. Read this first.
- [`docs/api-reference.md`](docs/api-reference.md): the backend API, generated
  from the backend source.
- [`docs/backend-requests.md`](docs/backend-requests.md): what the frontend
  needs from the backend that doesn't exist yet.
