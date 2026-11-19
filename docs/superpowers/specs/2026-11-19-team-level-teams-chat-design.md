# Team level, Teams section and game chat — design

**Date:** 2026-11-19 · **Repos:** `minipolyaBackend`, `minipolyaFrontend` (Mini App only)

## Intent and why

Three things are built together because they share one object — the team:

1. **Team level** (`havaskor` / `orta` / `professional`). Today any team may challenge any
   other, so a group of friends can end up paying for an hour against a side that trains
   twice a week. A level makes the mismatch visible *before* money moves: on the card, on the
   board, on the accept screen, in the chat header.
2. **The Teams section** is the thinnest screen in the Mini App — a name, a member list and
   the challenge board glued underneath. It is where a captain runs the team, and it has no
   next game, no invite affordance beyond a secondary button, and no story for a player with
   no team.
3. **The game chat** is a flat list of bubbles with no grouping, no day separators, no
   loading of history and a composer that fights the Telegram keyboard. It is the only place
   the two captains agree on anything, so it has to be good.

## Goals

- A level is set when a team is created, changed only by the captain, audited, and returned
  everywhere a team is shown.
- The challenge board filters by level **on the server**, preselected to the viewer's own
  level; a cross-level accept asks once, and never blocks.
- The team page answers, at a glance: who we are, what level, when we next play, who is in,
  how to invite, what the captain can do.
- The chat reads like a chat: grouped bubbles, day separators, system events, history on
  scroll-up, optimistic sends, polling only while it is open and visible.

## Non-goals

- No team logo upload (see D1), no team rename, no transfer of captaincy.
- No WebSocket; chat stays REST + polling, as `GameMessageService` documents.
- No new money rules, no change to the join/cancel flow, no change to the cancellation bands.
- No level-based matchmaking or ranking; the level is informational, never a gate.
- The `.pen` design files are not touched; the design is expressed in code with the existing
  tokens and components.

## Anti-goals

- Inventing numbers on the team page. Every figure comes from the API or is not shown.
- A level that silently blocks a join. The platform earns its fee when games happen.
- Breaking the team-game money model, the audit-code stability rule, or an applied changeset.

## Approaches considered

**A — level as a short checked column, mapped to a Java enum (chosen).**
`teams.level VARCHAR(20) NULL` with a `CHECK` on the three values, nullable so every existing
team stays valid and reads as "not set". Mirrors how `bookings.status`, `stadiums.district`
and `game_teams.payment_option` already work in this schema. Cheapest, matches the codebase,
and a fourth level later is one changeset.

**B — a `team_levels` lookup table with a foreign key.**
Would let an admin add a level without a deploy. Rejected: nothing in this product edits
reference data at runtime, it adds a join to every team read, and the three levels are
product copy, not data.

**C — level derived from history (games played, win rate).**
Rejected outright: there is no result recording in the platform (nothing even sets
`games.status = 'completed'`), so it would be invented data — the one thing the repo's rules
forbid most clearly.

For the chat, the alternative to **page-based history plus a `before` cursor** was replacing
the endpoint with a pure cursor API. Rejected: `GET /api/games/{id}/messages?page=&size=`
already ships, but page boundaries shift when a message arrives mid-scroll. Adding an optional
`before` instant keeps the shipped contract and makes "load older" stable. Chosen.

## Constraints

- Backend: new Liquibase changeset only, never an edit to an applied one; UUID v7 ids; money
  in tiyin; timestamps TIMESTAMPTZ UTC; no entity in a response; MapStruct mapping; audit
  codes are append-only; no secret ever reaches the audit log.
- Frontend: only endpoints and fields the backend really has; every string through i18next
  (uz default, plus ru and en written by Claude and listed in `docs/translations-to-review.md`);
  design tokens only, light and dark; touch targets at least 44px; Telegram safe areas;
  skeleton, empty and error states on every screen; never re-implement a business rule.
- Neither repo pushes or creates branches; commits land on the current branch.
- `.env` files are never read or edited.

## The design

### 1. Team level

**Schema** — changeset `054-team-level.sql`:

```sql
ALTER TABLE teams ADD COLUMN level VARCHAR(20)
    CHECK (level IN ('havaskor', 'orta', 'professional'));
```

Nullable on purpose: a team created before this change has no level, which the app shows as
"not set" and the captain is nudged to fix.

**Values.** The stored values are the Uzbek words the product uses (`havaskor`, `orta`,
`professional`), lowercase like every other enum on the wire. The display names and the one
line under each come from the client's translations, so ru/en readers see their own words over
the same value.

**API**

| Endpoint | Change |
|---|---|
| `POST /api/teams` | `level` is **required** (one of the three, otherwise 400) |
| `PATCH /api/teams/{id}` | **new**: `{ "level": "orta" }`, captain only (403 otherwise), returns `TeamDetailResponse`, audited |
| `GET /api/teams/me`, `GET /api/teams/{id}` | `level` on the response |
| `GET /api/games/challenges` | new `level` filter, applied in the query against the waiting team |
| every team shown in a game | `teamLevel` on `GameTeamResponse`, `waitingTeamLevel` on `GameChallengeResponse` |

**Audit.** New code `TEAM_LEVEL_CHANGED` (append-only), new entity type `team`, new
`AuditLabels.team(Team)` = the team's name. Written as the **player** actor, one entry,
`change("level", old, new)` — so an edit that changes nothing writes nothing, per the audit
rules. Creating a team stays unaudited, as today.

**Mini App**

- **Create team** gains a level step: three choice cards, each a coloured badge, the name and
  one line — Havaskor "Doʻstlar bilan dam olish uchun oʻynaymiz" · Oʻrta "Muntazam oʻynaymiz,
  yaxshi tayyorgarlik" · Professional "Turnir darajasi, kuchli jamoa", with ru/en equivalents.
  "Jamoa yaratish" stays disabled until a level is chosen.
- **A team with no level** shows the captain a banner on the team page, "Jamoangiz darajasini
  belgilang", opening the same three cards in a sheet (`PATCH`). Members see no banner.
- **The badge** — one `TeamLevelBadge` component, used on the team page header, team cards,
  challenge cards (home carousel and board), the accept screen, the game screen and the chat
  header. Tones: havaskor `neutral`, orta `warning`, professional `accent`.
- **The board** gets chips "Hammasi · Havaskor · Oʻrta · Professional". The viewer's own team
  level is preselected (the first of their teams that has one); with no team or no level,
  "Hammasi". The chip drives `?level=` — the server filters, the client never slices a page.
- **Accepting across levels** opens a confirmation sheet, "Bu jamoa <daraja> darajada. Davom
  etasizmi?", with "Davom etish" / "Bekor qilish". It is a confirmation, never a block, and it
  is not shown when the two levels match or either is unset.

### 2. Teams section

One screen, rebuilt from the existing components (`Card`, `Badge`, `Button`, `Chip`,
`BottomSheet`, `SkeletonList`, `EmptyState`/`ErrorState`).

```
┌──────────────────────────────────────┐
│ [AB]  Alpha Bravo          [Oʻrta]   │  header card: avatar (initials on a
│       8 aʼzo · Sardor: Ali V.        │  colour derived from the team id)
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Keyingi oʻyin                        │
│ Shanba, 21-noyabr · 20:00            │  only when there is one
│ Chilonzor Arena                      │
│ Raqib: Delta FC  (or "Raqib kutilmoqda")
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ ⊕  Aʼzo taklif qilish                │  captain only, prominent
│    nusxa olish · Telegram · yangilash │
└──────────────────────────────────────┘
  [ Raqib qidirish ]                      captain: primary action
  "Oʻyinlarni faqat sardor yaratadi"      member: the line instead
┌──────────────────────────────────────┐
│ Aʼzolar (8)                          │
│ [AV] Ali Valiyev        [Sardor]  ⋯  │
│ [BS] Bek Sattorov                 ⋯  │
└──────────────────────────────────────┘
  Oʻynalgan oʻyinlar 4 · Kutilayotgan 1   from the API only
  [ Jamoadan chiqish ]                    member only
```

- **Several teams** → the existing chip row at the top becomes the team switcher, kept in the
  URL (`?team=`) as it is today.
- **No team** → an inviting empty state: "Sizda hali jamoa yoʻq", a short explanation of what
  team-vs-team games are, and "Jamoa yaratish".
- **Members.** Avatar, name, "Sardor" chip for the captain. The captain removes a member
  (confirmation sheet, as today). A member leaves the team (confirmation) — this needs the
  backend to let a member remove **themselves**.
- **Stats** come from the API and nowhere else: `gamesPlayed` and `upcomingGame` on
  `TeamDetailResponse`. Nothing is counted in the client, nothing is estimated.
- Skeletons while loading, `ErrorState` with "Qayta urinish" on failure, 44px targets
  throughout, tokens only.

**Backend for the section**

- `TeamDetailResponse` gains `level`, `gamesPlayed` (confirmed team games of this team that
  have already started) and `upcomingGame` (`{ gameId, startsAt, status, stadiumName,
  opponentName? }` — the soonest waiting-or-confirmed team game of this team, `opponentName`
  absent while the opponent is still awaited). Both come from `GameRepository` queries over
  the games this team is `active` in — no new table, no guesswork.
- `DELETE /api/teams/{id}/members/{userId}` accepts **the member themselves** as the caller, so
  a player can leave; the captain still cannot be removed this way.

### 3. Game chat

The chat stays exactly as available as it is now — only while the game is `confirmed`.

```
            ── Bugun ──
      Oʻyin tasdiqlandi            system, centred, muted
      Delta FC qoʻshildi

 Ali Valiyev  [Alpha Bravo · Oʻrta]        group header
 ┌───────────────────────────┐
 │ Salom! Soat 20:00 da…     │
 └───────────────────────────┘
 ┌───────────────────────────┐
 │ Formangiz qanday rangda?  │             grouped: no repeated header
 └───────────────────────────┘
  19:42
                      ┌─────────────────────────┐
                      │ Oq. Sizda?              │  own, accent, right
                      └─────────────────────────┘
                                             19:45
```

- Bubbles: own on the right in the accent colour, others on the left on `bg-background`.
  Sender name and a small team badge (team name + level) above the **first** message of each
  run; time under the **last** of each run; consecutive messages from one sender grouped.
- Day separators: "Bugun", "Kecha", "18-noyabr" — in the viewer's language.
- System messages centred and muted, from the backend's events.
- Composer pinned above the keyboard and Telegram's safe area, a textarea growing to 4 lines,
  send disabled when empty, counter once within 50 of the limit, Enter inserts a newline on
  mobile (never sends).
- Auto-scroll only when the viewer is already at the bottom; otherwise a "Yangi xabarlar ↓"
  pill that scrolls down on tap.
- Older messages load when the list is scrolled to the top, keeping the scroll anchored.
- Sending is optimistic: the bubble appears at once as "sending", turns into the saved message
  on success, and becomes "Yuborilmadi — qayta urinish uchun bosing" on failure.
- Polling every 5 s **only** while the chat screen is open and the document is visible; it
  stops when hidden and resumes on return.
- Header: both team names with their level badges and the game's time; tapping it opens the
  game screen.
- Empty state: "Hali xabar yoʻq. Raqib jamoa bilan kelishib oling!"
- Message text is rendered as text, never HTML; URLs are shown as plain text and are not
  turned into links or opened.

**Backend for the chat**

- Changeset `055-game-message-system.sql`: `game_messages.user_id` becomes nullable, and the
  table gains `kind VARCHAR(10) NOT NULL DEFAULT 'user'` (checked `user`/`system`),
  `event VARCHAR(40)` and `event_team_name VARCHAR(100)`. Existing rows are `user`.
- System messages are written when a team game becomes confirmed: `game_confirmed`, and
  `team_joined` carrying the joining team's name. They are ordinary rows, so they page and
  sort with everything else, and a team that joined later still sees only what came after it.
- `GameMessageResponse` gains `kind`, `event`, `eventTeamName`, and for a player's message the
  sender's side and team: `side`, `teamId`, `teamName`, `teamLevel`. They are resolved from
  the game's `game_teams` once per request, not per message.
- `GET /api/games/{id}/messages` gains an optional `before` (ISO instant) — the page of
  messages strictly older than it, newest first. Without it the endpoint behaves as today.
- `GameDetailResponse` gains `chatMessageMaxLength` (team games only) so the composer's limit
  and counter come from the server rather than a client constant.

## Decisions logged (made by Claude, not asked)

- **D1 — no team logo.** The only upload path in the backend is `StadiumPhoto`, owner-scoped,
  with its own table, controller and storage directory; a team logo would need a column or
  table, an endpoint, authorisation and cleanup. Not simple, so it is skipped per the brief.
  The avatar is the team's initials on a colour derived from its id (a stable hash into a
  small token-based palette). **Follow-up:** team logo upload.
- **D2 — level values are the Uzbek words** (`havaskor`, `orta`, `professional`), as the brief
  names them, lowercase on the wire like every other enum here.
- **D3 — `PATCH /api/teams/{id}`** is the edit endpoint (not `PUT`), because it carries one
  field, matching the partial-update convention in the repo.
- **D4 — level is required on create.** Existing backend tests that create a team without one
  are updated; the Mini App is the only client.
- **D5 — stats come from two new fields on the team detail**, not from a new endpoint and not
  from counting `GET /api/games/my` in the client (whose rows carry no team).
- **D6 — the Telegram "new chat message" bot notification is a follow-up, not built.** It
  needs a new `notifications.type` value (a CHECK constraint, so a changeset), a per-user
  per-game throttle that has to survive a restart, and a "has this user opened the chat
  recently" signal the platform does not record at all. That is three new pieces of state, not
  a call to the existing service. **Follow-up:** chat push notification.
- **D7 — chat history stays page-based with an added `before` cursor**, rather than a new
  cursor-only endpoint (see Approaches).
- **D8 — polling is gated on `document.visibilityState` explicitly**, not left to TanStack
  Query's window-focus default, so a backgrounded Telegram Mini App makes no requests.
- **D9 — the uncommitted work already in the frontend tree** at the start of this session
  (home header, date picker, `.pen`) is committed first, untouched, as its own commit, so the
  work here is separable and the tree can end clean. Nothing in it is modified.

## What is left to the builder

- The exact colour palette for the derived team avatar (existing tokens only, passing the
  contrast test).
- Where the level chips sit relative to the existing board header.
- Test names and the split between unit and `@DatabaseTest` coverage.
