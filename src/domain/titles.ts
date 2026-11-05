// How teams, games and periods are named.
import { t } from '@/shared/i18n/i18n';
import type { Game, Team } from './types';

/** "Club - Age group", or whichever of the two is set. */
export const teamFull = (club: unknown, name: unknown): string =>
  [club, name]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' - ');

export const teamLabel = (tm: Pick<Team, 'club' | 'name'>): string =>
  teamFull(tm.club, tm.name) || t('unnamedTeam');

/** The same for a game (which keeps a copy of its team's club and name). */
export const gameTeam = (g: Pick<Game, 'club' | 'team'>): string => teamFull(g.club, g.team);

/** "1st half", "Q3", "Game"… for period `n` of this game. */
export function periodName(g: Pick<Game, 'periods'>, n: number): string {
  if (g.periods === 2) return n === 1 ? t('p1') : t('p2');
  if (g.periods === 4) return t('pQ', { n });
  if (g.periods === 1) return t('pGame');
  return t('pN', { n });
}

/** "Club x Opponent" (or the other way round when playing away). */
export function matchTitle(g: Pick<Game, 'club' | 'team' | 'opponent' | 'home'>): string {
  const us = gameTeam(g);
  const them = g.opponent || t('opponent');
  if (!us) return `vs ${them}`;
  return g.home === false ? `${them} x ${us}` : `${us} x ${them}`;
}

/** Football seasons run August to July: "2026-08-01" → "2026/2027"; '' for no date. */
export function seasonOf(date: unknown): string {
  const [y, m] = String(date).split('-').map(Number);
  if (!y) return '';
  return (m ?? 0) >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
