# Mini App teams — Jamoam, team vs team, challenge board, game detail, chat

Sub-project C. Autonomous mandate of 2026-11-01 (decisions in
`docs/miniapp-progress.md`). Follows `CLAUDE.md` "Mini App"; backend
`docs/api-reference.md` §8–9 and `../minipolyaBackend/CLAUDE.md` "team_vs_team".

## Design frames (telegram-webapp.pen)

Jamoam `dX8P1` sardor · `V5dthF` aʼzo · `ikY5y` empty · `s5qbcN` loading ·
`KEHXq` error; create `ojrUu` / `i43o9`; booking choice `S5Sv4h`; find opponent
`NLkOX` form · `iSoyg` started; accept `EuPN8` pick team · `r4Kph6` confirm ·
`h9DXw8` done · `k1pICu` slot taken · `c09mL` under 3 h · `zadli` declined;
game `GJHHm` confirmed · `K2K1g4` waiting · `U03NV` played · `Lxqjm` /
`Q7x03i` / `EKAvg` / `yTW1W` cancelled variants · `Q1MwiE` loading · `E6Hljt`
error; cancel sheets `VNoDS` / `JZhNf`; chat `GwSG2` · `iC083` · `D8EWB6` ·
`ogs2y` · `l3fX1Z`.

No frames exist for friends games (casual / open) → not built in C (see progress).

## Facts and gaps

- Teams: `GET /api/teams/me`, `GET /api/teams/{id}` (members), `POST /api/teams`,
  `DELETE /api/teams/{id}/members/{userId}`, `DELETE /api/teams/{id}` (leader).
  `POST /api/teams/{id}/members` needs a userId and there is **no** user search
  and **no** invite/join endpoint → "Taklif havolasini ulashish" is "Tez orada",
  **R32** (team invite link + join by code). No team logo field → initials avatar.
- Challenge board `GET /api/games/challenges` (paged, soonest first) carries
  `amountToPayNow`, `remainderAmount`, `totalPrice` → accepting shows them as is.
  Accept = `POST /api/games/{id}/join { gameId, side: "b", teamId, cardId }`
  (the backend takes the free side). Errors: 409 slot taken; 400 the Uzbek
  3-hour message; 400 "Card payment was declined; …" (exact strings in
  `shared/api/messages.ts`).
- Find opponent = `POST /api/games { type: "team_vs_team", stadiumId, startsAt,
  maxPlayers: 2, teamAId, cardId }` (`maxPlayers` is required but unused for a
  team game). The team's price and remainder exist only on the created game
  (`teams[].price`, `remainderAmount`) → the form shows the slot price only and
  **R33** asks for a pre-creation quote. Errors: 400 declined hold, 400 "at most
  N days", 409 slot taken.
- Game detail `GET /api/games/{id}`: `teams[]` per side with `price`,
  `paidInApp`, `remainderAmount`, `remainderStatus`, `cancellationDeadline`,
  `refundIfCancelledNow`; `participants[]`. Members per team from
  `GET /api/teams/{teamId}`. Leader pays own remainder `POST
  /api/games/{id}/pay-remainder { cardId }` (decline = 400). Cancel `DELETE
  /api/games/{id}` showing the own team's `refundIfCancelledNow`.
- Chat: `GET/POST /api/games/{id}/messages`, open only while `confirmed`;
  newest first → shown oldest at top; refreshed every 5 s while open.
- Oʻyinlarim: `GET /api/games/my` as a "Oʻyinlar" section above "Bronlar"
  (two endpoints, no client merge or sort).

## Screens

1. **Jamoam** (`/team`): no team → empty + "Jamoa yaratish"; several teams →
   chips to switch; team card (initials, name, members count, Sardor/Aʼzo);
   "Raqib qidirayotgan jamoalar" (challenge board, first page + "Yana") with
   "Qabul qilish" for leaders; members list (leader: ⋯ → remove with confirm);
   invite button disabled "Tez orada" (R32); leader: "Jamoani oʻchirish" with
   confirm.
2. **Jamoa yaratish** (`/team/new`): name 3–24 chars as drawn (backend max 100)
   → `POST /api/teams` → back to Jamoam on it.
3. **Booking choice**: on the stadium page, a leader's "Band qilish" opens
   "Qanday band qilasiz?" — Oʻzim band qilaman (checkout) / Raqib jamoa
   qidiraman (`/opponent?stadium&date&start`). Non-leaders go straight to checkout.
4. **Raqib qidirish** (`/opponent`): team radio (teams the user leads), slot
   summary with the slot price, rules text from the backend's documented flow
   (no numbers), card choice, "Raqib qidirishni boshlash" → game detail.
5. **Qabul qilish** (`/challenges/:gameId`): VS header, place/time, Toʻlov
   (`amountToPayNow`, `remainderAmount`), team radio when leading several,
   card, "Toʻlash va qabul qilish · {amountToPayNow}" → game detail; slot taken /
   3 h / declined states.
6. **Oʻyin** (`/games/:id`): VS header + status badge; time/place; chat row
   (confirmed only); teams with members; my team's payment card + "Qolganini
   toʻlash" (leader, unpaid remainder); cancellation terms + refund line +
   "Oʻyinni bekor qilish" (creator or either leader, open/confirmed) → confirm
   sheet with `refundIfCancelledNow`.
7. **Chat** (`/games/:id/chat`).
8. **Oʻyinlarim**: games section.

Game status badges (`games/status.ts`): `open` → Raqib kutilmoqda (warning),
`confirmed` → Tasdiqlangan (success), `completed` → Oʻtkazilgan (neutral),
`cancelled_*` → Bekor qilingan (danger).
