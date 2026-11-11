/**
 * Where a `startapp` parameter should open the app — routing only, never
 * identity. `team_<code>` (a team invite, R32) → `/join/<code>`.
 */
export function startRoute(param: string | null): string | null {
  const team = param?.match(/^team_([A-Za-z0-9_-]+)$/)
  return team ? `/join/${team[1]}` : null
}
