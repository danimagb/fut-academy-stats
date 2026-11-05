// Season stats for a team and its players, from finished games.
import { deriveState, type GameState, type PlayerState } from './game-state';
import { byNumber } from './players';
import { seasonOf } from './titles';
import type { Game, Player } from './types';

/** A team's finished games, oldest first. */
export const finishedGames = (games: readonly Game[], teamId: string): Game[] =>
  games
    .filter((g) => g.teamId === teamId && g.status === 'finished')
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

/** Seasons the team has finished games in, newest first. */
export const statsSeasons = (games: readonly Game[], teamId: string): string[] =>
  [
    ...new Set(
      finishedGames(games, teamId)
        .map((g) => seasonOf(g.date))
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();

export type GameWithState = { g: Game; d: GameState };

export type PlayerGameRow = {
  g: Game;
  d: GameState;
  /** Null when the player wasn't in the squad. */
  s: PlayerState | null;
  started: boolean;
  played: boolean;
};

export type PlayerSeason = {
  p: Player;
  rows: PlayerGameRow[];
  teamGames: number;
  called: number;
  played: number;
  starts: number;
  minutes: number;
  goals: number;
  yellow: number;
  red: number;
};

export type TeamSeason = {
  games: GameWithState[];
  record: { w: number; d: number; l: number; gf: number; ga: number };
  players: PlayerSeason[];
};

/** Everything the stats page and a player's sheet need, for one team and season. */
export function teamStats(
  games: readonly Game[],
  teamPlayers: readonly Player[],
  teamId: string,
  season: string,
  now: number,
): TeamSeason {
  const list = finishedGames(games, teamId)
    .filter((g) => seasonOf(g.date) === season)
    .map((g) => ({ g, d: deriveState(g, now) }));
  const record = { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  for (const { d } of list) {
    record[d.us > d.them ? 'w' : d.us < d.them ? 'l' : 'd']++;
    record.gf += d.us;
    record.ga += d.them;
  }
  const players = [...teamPlayers].sort(byNumber).map((p) => playerStats(p, list));
  return { games: list, record, players };
}

export function playerStats(p: Player, games: readonly GameWithState[]): PlayerSeason {
  const rows = games.map(({ g, d }) => {
    const s = d.stats[p.id] || null;
    return { g, d, s, started: !!s && g.starters.includes(p.id), played: !!s && s.intervals.length > 0 };
  });
  const sum = (k: 'played' | 'goals' | 'yellow' | 'red') => rows.reduce((n, r) => n + (r.s ? r.s[k] : 0), 0);
  return {
    p,
    rows,
    teamGames: rows.length,
    called: rows.filter((r) => r.s).length,
    played: rows.filter((r) => r.played).length,
    starts: rows.filter((r) => r.started).length,
    minutes: Math.floor(sum('played') / 60000),
    goals: sum('goals'),
    yellow: sum('yellow'),
    red: sum('red'),
  };
}

/** Regular length of a game, minutes. */
export const gameLength = (g: Pick<Game, 'periods' | 'periodMin'>): number => g.periods * g.periodMin;

export const resultOf = (d: Pick<GameState, 'us' | 'them'>): 'win' | 'loss' | 'draw' =>
  d.us > d.them ? 'win' : d.us < d.them ? 'loss' : 'draw';
