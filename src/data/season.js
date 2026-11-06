// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// A team's season: which team and season the stats page shows (remembered on this phone), and
// the numbers and short texts the stats page, a player's sheet and the PDF share. Moved from
// app/legacy.js.
import { getTeam, teamPlayers } from '@/data/queries';
import { plural } from '@/shared/i18n/i18n';
import { db } from '@/data/store';
import { fmtMins } from '@/shared/lib/format';
import { statsSeasons as seasonsOfTeam, teamStats as teamSeason } from '@/domain/stats';
import { t } from '@/shared/i18n/i18n';

export const STATS_TEAM_KEY = 'fut-academy-stats.statsTeam'; // team picked on the stats page
export const STATS_SEASON_KEY = 'fut-academy-stats.statsSeason'; // season picked on the stats page (e.g. '2026/2027')

export function setStatsTeam(id) {
  localStorage.setItem(STATS_TEAM_KEY, id);
}

export function setStatsSeason(id) {
  localStorage.setItem(STATS_SEASON_KEY, id);
}

export function statsTeam() {
  const id = localStorage.getItem(STATS_TEAM_KEY);
  return getTeam(id) ? id : getTeam(db.lastTeamId) ? db.lastTeamId : db.teams[0]?.id || '';
}

export const statsSeasons = (teamId) => seasonsOfTeam(db.games, teamId);

export function statsSeason(teamId) {
  const seasons = statsSeasons(teamId);
  const s = localStorage.getItem(STATS_SEASON_KEY);
  return seasons.includes(s) ? s : seasons[0] || '';
}

export const teamStats = (teamId, season) =>
  teamSeason(db.games, teamPlayers(teamId), teamId, season, Date.now());

export const ddmm = (g) => {
  const [, m, d] = String(g.date).split('-');
  return d ? `${d}/${m}` : '';
};
export const playerFullName = (p) => p.fullName || p.name;

// What a player did in one game, as a short line ("60' · 2 goals · yellow").
export function gameDetail(r) {
  if (!r.s) return t('notCalled');
  if (!r.played) return t('didNotPlay');
  return [
    fmtMins(r.s.played) + (r.started ? '' : ` (${t('statSubIn')})`),
    r.s.goals ? plural('statGoalN', r.s.goals) : '',
    r.s.yellow ? t('statYellowWord') + (r.s.yellow > 1 ? ` ×${r.s.yellow}` : '') : '',
    r.s.red ? t('statRedWord') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

// Our score first, then the opponent ("2–0 CD Ribeira").
export const gameShort = (g, d) => `${d.us}–${d.them} ${g.opponent || t('opponent')}`;
