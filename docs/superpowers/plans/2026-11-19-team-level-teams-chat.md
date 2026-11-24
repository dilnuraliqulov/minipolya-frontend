# Team level, Teams section and game chat — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every team a level, rebuild the Mini App's Teams section around it, and rebuild
the team-game chat.

**Architecture:** The backend adds one nullable checked column (`teams.level`), one edit
endpoint, one server-side filter on the challenge query, two computed fields on the team
detail, and system/sender-team/cursor support in the chat. The Mini App consumes all of it with
the existing design-system components; no new library, no new business rule in TypeScript.

**Tech Stack:** Spring Boot 4.1 / Java 21 / Liquibase / MapStruct / PostgreSQL · React 19 /
TypeScript 6 / Tailwind 4 / TanStack Query 5 / i18next / Vitest / Playwright.

**Spec:** `docs/superpowers/specs/2026-11-19-team-level-teams-chat-design.md` (this repo).

## Global Constraints

- Backend: a schema change is a **new** changeset file with a unique `--changeset minipolya:<id>`
  tag, added to `db.changelog-master.yaml`; never edit an applied one.
- Backend: no entity in a response; map with MapStruct. Money is tiyin, timestamps are
  TIMESTAMPTZ UTC. `AuditAction` codes are append-only — never rename one.
- Backend: run with `SPRING_PROFILES_ACTIVE=dev` and `SPRING_DEVTOOLS_RESTART_ENABLED=false`;
  stop the running app before `./mvnw clean` or `./mvnw test`.
- Frontend: every user-facing string goes through `t()` in uz/ru/en; Uzbek uses `ʻ` (U+02BB)
  and `ʼ` (U+02BC). New keys are listed in `docs/translations-to-review.md`.
- Frontend: design tokens only (no hex, no `bg-white`), light **and** dark, touch targets
  ≥ 44px, Telegram safe areas, skeleton + empty + error (`Qayta urinish`) on every screen.
- Level values on the wire are exactly `havaskor`, `orta`, `professional`.
- Neither repo pushes or creates branches. `.env` files are never read or edited.
- Each task ends with its repo's checks passing and one commit.

## Review Focus

Inputs the spec implies but no task's own happy path exercises. Each has a test, in the task
that owns the code.

1. **A team created before this change (level `NULL`)** must still serialise, still appear on
   the board, and still be joinable — nothing may assume a level exists. (Tasks 1, 2, 7)
2. **An unknown `level` query value** on `GET /api/games/challenges` must not 500 or silently
   return everything; it is a 400. (Task 2)
3. **A member calling the remove endpoint on *another* member** must stay 403 after
   self-removal is allowed. (Task 3)
4. **A system chat message has no sender**, so every response mapper and every client renderer
   must survive `userId == null`. (Tasks 4, 11)
5. **Message text containing HTML/markup** (`<b>`, `&`, a bare URL) must render as literal
   text, never as markup and never as an auto-opened link. (Task 11)

---

## File structure

**Backend (`../minipolyaBackend`)**

| File | Responsibility |
|---|---|
| `resources/db/changelog/changes/054-team-level.sql` | the `teams.level` column |
| `resources/db/changelog/changes/055-game-message-system.sql` | system chat messages |
| `entity/Team.java` | `level` field |
| `entity/TeamLevel.java` | the three values + `fromValue` |
| `entity/GameMessage.java` | `kind`, `event`, `eventTeamName`, nullable user |
| `dto/request/CreateTeamRequest.java`, `UpdateTeamRequest.java` | create/edit input |
| `dto/response/TeamResponse.java`, `TeamDetailResponse.java`, `TeamUpcomingGameResponse.java` | team output |
| `dto/response/GameTeamResponse.java`, `GameChallengeResponse.java`, `GameDetailResponse.java`, `GameMessageResponse.java` | game output |
| `service/TeamService.java` | create with level, edit level, stats, self-removal |
| `service/TeamGameService.java` | level on challenges + game teams, system messages on confirm |
| `service/GameMessageService.java` | sender team, `before` cursor, system rows |
| `repository/GameRepository.java`, `GameMessageRepository.java`, `TeamRepository.java` | the queries |
| `audit/AuditAction.java`, `AuditEntityType.java`, `AuditLabels.java` | `TEAM_LEVEL_CHANGED` |
| `docs/claude/teams.md`, `docs/claude/team-games.md`, `docs/frontend-field-changes-2026-11-19.md` | docs |

**Frontend (this repo, `src/miniapp`)**

| File | Responsibility |
|---|---|
| `teams/level.ts` | the level union, order, label/description keys, badge tone |
| `teams/TeamLevelBadge.tsx` | the badge everywhere a team is shown |
| `teams/TeamLevelCards.tsx` | the three choice cards (create step + edit sheet) |
| `teams/TeamLevelSheet.tsx` | the captain's edit sheet |
| `teams/TeamAvatar.tsx` | initials on a colour derived from the team id |
| `teams/TeamPage.tsx` | the rebuilt Jamoam screen |
| `teams/TeamNextGameCard.tsx`, `teams/TeamInviteCard.tsx`, `teams/TeamMembers.tsx` | its parts |
| `teams/TeamCreatePage.tsx` | name + level |
| `teams/ChallengeBoard.tsx`, `teams/ChallengeCardWide.tsx`, `teams/AcceptChallengePage.tsx` | board filter, badges, cross-level sheet |
| `games/ChatPage.tsx` | the rebuilt chat screen |
| `games/chat/groups.ts` | day separators + message grouping (pure) |
| `games/chat/Composer.tsx`, `games/chat/MessageGroup.tsx` | its parts |
| `api/teams.ts`, `api/games.ts` | the new fields and calls |
| `i18n/locales/{uz,ru,en}.json` | the copy |

---

## Task 1 — `teams.level`: column, entity, create, edit, audit

**Files (backend):**
- Create: `src/main/resources/db/changelog/changes/054-team-level.sql`,
  `src/main/java/.../entity/TeamLevel.java`,
  `src/main/java/.../dto/request/UpdateTeamRequest.java`
- Modify: `db.changelog-master.yaml`, `entity/Team.java`, `dto/request/CreateTeamRequest.java`,
  `dto/response/TeamResponse.java`, `dto/response/TeamDetailResponse.java`,
  `mapper/TeamMapper.java`, `service/TeamService.java`, `controller/TeamController.java`,
  `audit/AuditAction.java`, `audit/AuditEntityType.java`, `audit/AuditLabels.java`
- Test: `src/test/java/.../service/TeamServiceTest.java`

**Interfaces — Produces:**
- `enum TeamLevel { HAVASKOR, ORTA, PROFESSIONAL }` with `@JsonValue String getValue()`
  returning `havaskor` / `orta` / `professional`, and `static TeamLevel fromValue(String)`
  throwing `BadRequestException("Unknown team level")` on anything else (null → null).
- `Team.getLevel() : TeamLevel` (nullable).
- `CreateTeamRequest.getLevel() : String` — `@NotBlank`.
- `UpdateTeamRequest.getLevel() : String`.
- `TeamService.updateLevel(UUID requesterId, UUID teamId, UpdateTeamRequest) : TeamDetailResponse`.
- `TeamResponse.level` / `TeamDetailResponse.level` : `TeamLevel` (omitted when null).
- `AuditAction.TEAM_LEVEL_CHANGED`, `AuditEntityType.TEAM = "team"`,
  `AuditLabels.team(Team) : String`.
- `PATCH /api/teams/{id}` → `ApiResponse<TeamDetailResponse>`, message `"Team updated"`.

- [ ] **Step 1: Write the failing tests** in `TeamServiceTest`:
  `createStoresTheChosenLevel` (create with `"orta"` → `response.getLevel() == ORTA`),
  `createRejectsAnUnknownLevel` (`"elite"` → `BadRequestException`),
  `teamWithoutALevelStillMaps` (an entity with `level == null` → response level null),
  `onlyTheLeaderEditsTheLevel` (a member → `ForbiddenException`),
  `updateLevelAuditsTheChange` (`Audited.one(auditService, AuditAction.TEAM_LEVEL_CHANGED)`
  carries `change("level", "havaskor", "professional")`),
  `updateLevelToTheSameValueWritesNoEntry`.
- [ ] **Step 2: Run them and watch them fail** — `./mvnw test -Dtest=TeamServiceTest`.
- [ ] **Step 3: Write changeset 054** (`ALTER TABLE teams ADD COLUMN level VARCHAR(20) CHECK
      (level IN ('havaskor','orta','professional'))`) and include it in the master changelog.
- [ ] **Step 4: Implement** `TeamLevel`, the entity field (`@Convert`-style converter like
      `Notification.TypeConverter`, or `@Enumerated` + converter — match `Notification`),
      the two request DTOs, the two response fields, the mapper mapping, `TeamService.create`
      setting the level, `TeamService.updateLevel`, the controller method, and the audit
      constants. `TeamService` gains `AuditService` as a constructor dependency.
- [ ] **Step 5: Run the tests** — `./mvnw test -Dtest=TeamServiceTest` → PASS.
- [ ] **Step 6: Fix every other compile/test site** that builds a team without a level
      (`./mvnw test` green overall).
- [ ] **Step 7: Commit** `feat(teams): a team has a level, set on create and edited by the leader`.

## Task 2 — the level on every game view, and the board filter

**Files (backend):**
- Modify: `dto/response/GameTeamResponse.java` (`teamLevel`),
  `dto/response/GameChallengeResponse.java` (`waitingTeamLevel`),
  `repository/GameRepository.java` (`findChallenges` gains `:anyLevel` / `:level`),
  `service/TeamGameService.java` (`challenges(...)`, `toChallenge`, the team→response mapping),
  `service/GameService.java`, `controller/GameController.java` (`@RequestParam String level`)
- Test: `src/test/java/.../service/TeamGameChallengesTest.java`

**Interfaces — Consumes:** `TeamLevel` (Task 1).
**Produces:** `GET /api/games/challenges?level=orta`; `GameChallengeResponse.waitingTeamLevel`,
`GameTeamResponse.teamLevel`.

- [ ] **Step 1: Write the failing tests** in `TeamGameChallengesTest`:
  `challengesFilterByLevel` (the repository is called with `anyLevel=false` and `level=ORTA`),
  `challengesWithoutLevelAskForEveryLevel` (`anyLevel=true`),
  `challengesRejectAnUnknownLevel` (`"elite"` → `BadRequestException`),
  `challengeCardCarriesTheWaitingTeamLevel`, and
  `challengeCardOfATeamWithoutALevelHasNone`.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement** the query predicate
      (`AND (:anyLevel = TRUE OR EXISTS (SELECT 1 FROM GameTeam w WHERE w.game = g AND
      w.status = :activeStatus AND w.team.level = :level))`), the service parameter
      (parsed with `TeamLevel.fromValue`, so an unknown value is a 400), the controller
      parameter, and the two response fields.
- [ ] **Step 4: Run the tests** → PASS, then `./mvnw test`.
- [ ] **Step 5: Commit** `feat(games): the challenge board filters by team level`.

## Task 3 — team detail stats and leaving a team

**Files (backend):**
- Create: `dto/response/TeamUpcomingGameResponse.java`
- Modify: `dto/response/TeamDetailResponse.java`, `repository/GameRepository.java`,
  `service/TeamService.java`
- Test: `src/test/java/.../service/TeamServiceTest.java`

**Interfaces — Produces:**
- `TeamUpcomingGameResponse { UUID gameId; OffsetDateTime startsAt; String status;
  String stadiumName; String opponentName; }` (absent fields omitted).
- `TeamDetailResponse.gamesPlayed : Integer`, `TeamDetailResponse.upcomingGame`.
- `GameRepository.countPlayedTeamGames(UUID teamId, OffsetDateTime now) : int` —
  `status = 'confirmed'`, `startsAt < now`, the team `active`.
- `GameRepository.findUpcomingTeamGames(UUID teamId, OffsetDateTime now, Pageable) : List<Game>`
  — `status IN ('confirmed','open')`, `startsAt >= now`, the team `active`, soonest first.
- `TeamService.removeMember` additionally allows `requesterId.equals(memberUserId)`.

- [ ] **Step 1: Write the failing tests**: `detailCountsPlayedGames`,
  `detailNamesTheNextGameOpponent`, `detailSaysNothingWhenTheOpponentIsStillAwaited`
  (`opponentName` null for an `open` game), `aMemberMayLeaveTheTeam`,
  `aMemberMayNotRemoveAnotherMember` (403), `theLeaderCannotLeave` (400, the existing message).
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement** the DTO, the two queries, the mapping in `getDetail` /
      `joinByInvite` / `addMember` (one helper that decorates a `TeamDetailResponse`), and the
      `removeMember` permission change.
- [ ] **Step 4: Run the tests** → PASS, then `./mvnw test`.
- [ ] **Step 5: Commit** `feat(teams): the team detail carries its next game, games played and lets a member leave`.

## Task 4 — the chat backend: system messages, sender team, `before` cursor

**Files (backend):**
- Create: `src/main/resources/db/changelog/changes/055-game-message-system.sql`
- Modify: `db.changelog-master.yaml`, `entity/GameMessage.java`,
  `dto/response/GameMessageResponse.java`, `dto/response/GameDetailResponse.java`,
  `mapper/GameMessageMapper.java`, `repository/GameMessageRepository.java`,
  `service/GameMessageService.java`, `service/TeamGameService.java`,
  `controller/GameMessageController.java`
- Test: `src/test/java/.../service/GameMessageServiceTest.java`

**Interfaces — Produces:**
- `GameMessage.Kind { USER, SYSTEM }` (`@JsonValue` lowercase), `GameMessage.getEvent()`,
  `getEventTeamName()`; `user` is nullable.
- `GameMessageService.systemMessage(Game game, String event, String teamName) : void` — writes
  one `SYSTEM` row; never throws out (logged and swallowed), so it cannot break a confirmation.
- Events: `game_confirmed`, `team_joined`.
- `GameMessageResponse` gains `kind`, `event`, `eventTeamName`, `side`, `teamId`, `teamName`,
  `teamLevel`.
- `GameMessageService.getMessages(UUID gameId, UUID userId, OffsetDateTime before, Pageable)`.
- `GET /api/games/{gameId}/messages?before=<ISO>`.
- `GameDetailResponse.chatMessageMaxLength : Integer` (team games only) = `1000`, the same
  constant `SendGameMessageRequest` validates against (`GameMessageService.MESSAGE_MAX`).

- [ ] **Step 1: Write the failing tests** in `GameMessageServiceTest`:
  `confirmingAGameWritesTheSystemMessages` (`game_confirmed` then `team_joined` with the
  joining team's name), `systemMessageFailureNeverPropagates`,
  `aMessageCarriesItsSendersTeamAndLevel`, `aSystemMessageHasNoSender` (response `userId`
  null, `kind == "system"`), `beforeLoadsOlderMessagesOnly` (the repository is called with the
  instant), `theSameTeamCutoffStillAppliesWithBefore`.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Write changeset 055**: `ALTER TABLE game_messages ALTER COLUMN user_id DROP NOT
      NULL`, `ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (kind IN
      ('user','system'))`, `ADD COLUMN event VARCHAR(40)`, `ADD COLUMN event_team_name
      VARCHAR(100)`; include it in the master changelog.
- [ ] **Step 4: Implement** the entity fields, the repository `...AndCreatedAtBefore...`
      variants, the service (`systemMessage`, the sender-team lookup done once per page from
      `GameTeamRepository.findByGameId`, the `before` parameter), the controller parameter,
      the mapper, `chatMessageMaxLength` on the game detail, and the two `systemMessage` calls
      where `TeamGameService` confirms a game.
- [ ] **Step 5: Run the tests** → PASS, then `./mvnw test`.
- [ ] **Step 6: Commit** `feat(chat): system messages, the sender's team and a before cursor`.

## Task 5 — backend docs

**Files (backend):** `docs/claude/teams.md`, `docs/claude/team-games.md`,
`docs/frontend-field-changes-2026-11-19.md` (create).

- [ ] **Step 1:** Document the level (values, who may set it, the audit code), the new team
      detail fields, member self-removal, the board's `level` filter, and the chat's system
      messages / sender team / `before` cursor — in the two `docs/claude` files, in their voice.
- [ ] **Step 2:** Write `docs/frontend-field-changes-2026-11-19.md` listing every added field
      and endpoint, as the repo's rule requires.
- [ ] **Step 3: Commit** `docs: the team level, the richer team detail and the chat's new fields`.

## Task 6 — frontend: commit the work already in the tree

- [ ] **Step 1:** `git add -A` in `minipolyaFrontend` and commit the pre-existing modified and
      untracked files **unchanged** as `chore: the home header, date picker and layout checks
      as left in the working tree` (decision D9). Nothing is edited in this task.

## Task 7 — frontend level primitives

**Files:** Create `src/miniapp/teams/level.ts`, `teams/TeamLevelBadge.tsx`,
`teams/TeamLevelCards.tsx`, `teams/level.test.tsx`. Modify `api/teams.ts`,
`api/games.ts`, `teams/TeamAvatar.tsx`.

**Interfaces — Produces:**
- `export const TEAM_LEVELS = ['havaskor', 'orta', 'professional'] as const`
- `export type TeamLevel = (typeof TEAM_LEVELS)[number]`
- `export function levelLabel(t, level: TeamLevel): string` (key `team.level.<level>.name`)
- `export function levelTone(level: TeamLevel): BadgeTone`
- `<TeamLevelBadge level={level | undefined} />` — renders nothing when undefined
- `<TeamLevelCards value onChange />` — three cards, `role="radiogroup"`
- `api/teams.ts`: `Team.level?`, `TeamDetail.level?`, `TeamDetail.gamesPlayed?`,
  `TeamDetail.upcomingGame?: TeamUpcomingGame`, `createTeam(name, level)`,
  `updateTeamLevel(id, level)`, `leaveTeam(teamId, userId)`
- `api/games.ts`: `GameTeam.teamLevel?`, `Challenge.waitingTeamLevel?`,
  `GameDetail.chatMessageMaxLength?`, `GameMessage` gains `kind?`, `event?`, `eventTeamName?`,
  `side?`, `teamId?`, `teamName?`, `teamLevel?`; `getMessages(gameId, before?)`
- `teams/TeamAvatar.tsx`: new optional `id` prop picks the background from a fixed palette
  (`export function avatarTone(id: string): number`, a stable hash modulo the palette length)

- [ ] **Step 1: Write the failing tests** in `teams/level.test.tsx`:
  `badgeShowsNothingWithoutALevel`, `badgeNamesTheLevelInUzbek`,
  `cardsMarkTheChosenLevel` (`aria-checked`), `cardsShowOneLineEach`,
  `avatarToneIsStableForAnId` (same id → same index, two different ids used by the test →
  different indexes).
- [ ] **Step 2: Run them and watch them fail** — `npm run test -- level`.
- [ ] **Step 3: Add the translation keys** `team.level.*` (name + description for the three,
      plus `team.level.title`, `team.level.unset`) in uz/ru/en.
- [ ] **Step 4: Implement** `level.ts`, `TeamLevelBadge`, `TeamLevelCards`, the API types and
      functions, and the `TeamAvatar` colour.
- [ ] **Step 5: Run the tests** → PASS.
- [ ] **Step 6: Commit** `feat(miniapp): team level primitives`.

## Task 8 — create a team with a level, and edit it later

**Files:** Modify `teams/TeamCreatePage.tsx`; create `teams/TeamLevelSheet.tsx`,
`teams/TeamCreatePage.test.tsx`.

**Interfaces — Consumes:** Task 7. **Produces:** `<TeamLevelSheet team open onClose />`.

- [ ] **Step 1: Write the failing tests**: `createIsDisabledUntilALevelIsChosen`,
  `createSendsTheChosenLevel` (the POST body is `{ name, level: 'professional' }`),
  `theSheetSavesANewLevel` (PATCH called with `{ level: 'orta' }` and the toast shown).
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Implement** the level step on the create screen and the edit sheet.
- [ ] **Step 4: Run the tests** → PASS.
- [ ] **Step 5: Commit** `feat(miniapp): choose a team level on create and change it later`.

## Task 9 — the Teams section

**Files:** Rewrite `teams/TeamPage.tsx`; create `teams/TeamNextGameCard.tsx`,
`teams/TeamInviteCard.tsx`, `teams/TeamMembers.tsx`. Modify `teams/TeamPage.test.tsx`.

**Interfaces — Consumes:** Tasks 7 and 8.

- [ ] **Step 1: Write the failing tests** in `TeamPage.test.tsx`:
  `noTeamShowsTheInvitingEmptyState`, `theHeaderShowsTheLevelAndCaptain`,
  `aCaptainWithoutALevelSeesTheBanner`, `aMemberSeesNoBanner`,
  `theNextGameCardLinksToTheGame`, `theNextGameCardSaysTheOpponentIsAwaited`,
  `noUpcomingGameHidesTheCard`, `theCaptainSeesInviteAndFindOpponent`,
  `aMemberIsToldOnlyTheCaptainCreatesGames`, `aMemberCanLeaveAfterConfirming`,
  `statsComeFromTheApi` (games played shown; absent → not shown),
  `severalTeamsShowTheSwitcher`, `anErrorOffersRetry`.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Add the translation keys** for the new copy in uz/ru/en.
- [ ] **Step 4: Implement** the screen and its three parts, per the spec's sketch.
- [ ] **Step 5: Run the tests** → PASS, plus `npm run test -- teams`.
- [ ] **Step 6: Commit** `feat(miniapp): rebuild the Teams section`.

## Task 10 — the board filter, the badges and the cross-level confirmation

**Files:** Modify `teams/ChallengeBoard.tsx`, `teams/ChallengeCardWide.tsx`,
`teams/AcceptChallengePage.tsx`, `teams/queries.ts`, `games/GamePage.tsx`,
`stadiums/StadiumsPage.tsx` (the carousel, only if it needs the badge passed through).
Modify `teams/AcceptChallengePage.test.tsx`; create `teams/ChallengeBoard.test.tsx`.

**Interfaces — Consumes:** Tasks 7 and 2.
**Produces:** `useChallenges(level?: TeamLevel | 'all')` keyed by the level.

- [ ] **Step 1: Write the failing tests**: `theBoardPreselectsMyTeamLevel` (the request carries
  `level=orta`), `hammasiAsksForEveryLevel` (no `level` parameter),
  `aPlayerWithoutATeamStartsOnHammasi`, `challengeCardsShowTheWaitingTeamLevel`,
  `acceptingADifferentLevelAsksFirst` (the sheet names the other team's level; the join is not
  called until "Davom etish"), `acceptingTheSameLevelDoesNotAsk`,
  `acceptingWhenEitherLevelIsUnsetDoesNotAsk`.
- [ ] **Step 2: Run them and watch them fail.**
- [ ] **Step 3: Add the translation keys** (`team.levelFilter.*`, `team.levelConfirm*`).
- [ ] **Step 4: Implement** the chips, the query key change, the badges on both challenge cards,
      the badge on the game screen's team rows, and the confirmation sheet.
- [ ] **Step 5: Run the tests** → PASS.
- [ ] **Step 6: Commit** `feat(miniapp): filter the challenge board by level and confirm a cross-level game`.

## Task 11 — the chat

**Files:** Rewrite `games/ChatPage.tsx`; create `games/chat/groups.ts`,
`games/chat/MessageGroup.tsx`, `games/chat/Composer.tsx`, `games/chat/groups.test.ts`.
Modify `games/ChatPage.test.tsx`.

**Interfaces — Consumes:** Tasks 4 and 7.
**Produces:**
- `export interface ChatRun { key: string; userId?: string; mine: boolean; name?: string;
  teamName?: string; teamLevel?: TeamLevel; messages: ChatMessage[] }`
- `export type ChatRow = { kind: 'day'; key: string; date: string } | { kind: 'system'; key:
  string; message: ChatMessage } | { kind: 'run'; key: string; run: ChatRun }`
- `export function chatRows(messages: ChatMessage[], meId: string): ChatRow[]` — oldest first,
  a `day` row whenever the Tashkent date changes, a new run on a different sender or a gap
  over 5 minutes.
- `export function dayLabel(t, isoDate: string, today: string): string` — "Bugun" / "Kecha" /
  `formatLongDate`.

- [ ] **Step 1: Write the failing tests** in `games/chat/groups.test.ts`:
  `consecutiveMessagesFromOneSenderAreOneRun`, `aDifferentSenderStartsANewRun`,
  `aGapOverFiveMinutesStartsANewRun`, `aDayChangeInsertsASeparator`,
  `systemMessagesAreTheirOwnRows`, `dayLabelSaysBugunKechaOrTheDate`.
- [ ] **Step 2: Run them and watch them fail** — `npm run test -- groups`.
- [ ] **Step 3: Implement** `groups.ts`; run the tests → PASS.
- [ ] **Step 4: Write the failing screen tests** in `ChatPage.test.tsx`:
  `ownMessagesSitOnTheRight`, `theSenderNameAndTeamBadgeHeadEachRun`,
  `theHeaderNamesBothTeamsWithLevelsAndOpensTheGame`,
  `sendingShowsTheMessageAtOnce` (optimistic), `aFailedSendOffersRetryOnTap`,
  `theSendButtonIsDisabledWhenEmpty`, `enterInsertsANewlineAndDoesNotSend`,
  `theCounterAppearsNearTheLimit` (limit from `chatMessageMaxLength`),
  `markupInAMessageIsShownAsText` (`<b>hi</b>` appears literally and no `<b>` element exists,
  a bare URL renders as text with no anchor), `newMessagesPillAppearsWhenScrolledUp`,
  `scrollingToTheTopLoadsOlderMessages` (the second request carries `before`),
  `pollingStopsWhenTheDocumentIsHidden`, `theEmptyStateInvitesTheFirstMessage`.
- [ ] **Step 5: Run them and watch them fail.**
- [ ] **Step 6: Add the translation keys** (`chat.*`: day labels, sending, failed, retry, new
      messages, counter, system events `chat.system.gameConfirmed` / `chat.system.teamJoined`).
- [ ] **Step 7: Implement** the screen, `MessageGroup` and `Composer`.
- [ ] **Step 8: Run the tests** → PASS, plus `npm run test -- chat`.
- [ ] **Step 9: Commit** `feat(miniapp): rebuild the game chat`.

## Task 12 — translations, API reference, repo docs

**Files:** `docs/translations-to-review.md`, `docs/api-reference.md`, `docs/miniapp-progress.md`.

- [ ] **Step 1:** List every new uz/ru/en key added in Tasks 7–11 in
      `docs/translations-to-review.md`.
- [ ] **Step 2:** Record the backend's new fields, endpoint and query parameter in
      `docs/api-reference.md`, with the backend commit it was read from.
- [ ] **Step 3: Commit** `docs: the new Mini App copy and the backend fields behind it`.

## Task 13 — verification

- [ ] **Step 1:** Backend: stop the dev app, `./mvnw test` → exit 0; restart it
      (`SPRING_PROFILES_ACTIVE=dev`, `SPRING_DEVTOOLS_RESTART_ENABLED=false`) so Liquibase
      applies 054 and 055.
- [ ] **Step 2:** Frontend: `npm run typecheck`, `npm run lint`, `npm run test`,
      `npm run format`, `npm run build` → all exit 0.
- [ ] **Step 3:** `npm run e2e` → the Playwright layout checks pass.
- [ ] **Step 4:** In Chrome at `localhost:5173`, check every changed screen (Jamoam, create
      team, challenge board, accept, game, chat) at **360×800** and **390×844**, in **light**
      and **dark**, in **uz** and **ru**.
- [ ] **Step 5:** `git status` clean in both repos; write the DONE/PARTIAL table and the list of
      changed API fields.
