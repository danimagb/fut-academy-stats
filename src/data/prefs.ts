// Choices remembered on this phone only (not synced, not in the store).
import { readOnlyTeam, writableTeams } from './access';
import { getTeam } from './queries';
import { db } from './store';

const GAMES_TEAM_KEY = 'fut-academy-stats.gamesTeam'; // team filter on the games page ('' = all)

/** Team shown on the games page, or '' for all (only when there's more than one team). */
export function gamesTeam(): string {
  const id = localStorage.getItem(GAMES_TEAM_KEY) || '';
  return db.teams.length > 1 && getTeam(id) ? id : '';
}

export function setGamesTeam(id: string): void {
  localStorage.setItem(GAMES_TEAM_KEY, id);
}

/** Team preselected for a new game: the games-page filter, else the last one used, else the first this user may change. */
export function defaultTeamId(): string | null {
  const ok = (id: string | null | undefined) => (id && getTeam(id) && !readOnlyTeam(id) ? id : null);
  return ok(gamesTeam()) ?? ok(db.lastTeamId) ?? writableTeams()[0]?.id ?? null;
}
