// Choices remembered on this phone only (not synced, not in the store).
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
