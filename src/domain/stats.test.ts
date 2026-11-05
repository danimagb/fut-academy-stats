import { describe, expect, it } from 'vitest';
import { at, ev, makeGame, makePlayer } from '@/test/factories';
import { finishedGames, gameLength, resultOf, statsSeasons, teamStats } from './stats';
import type { Game, Player } from './types';

const players: Player[] = [1, 2, 3, 4, 5].map((n) =>
  makePlayer({ id: `p${n}`, number: String(n), teamId: 'T' }),
);

/** A finished 2 × 20 game on `date`; `events` happen in the first half, which ends at 20:00. */
function finished(date: string, events: Game['events'] = [], over: Partial<Game> = {}): Game {
  const g = makeGame(players.slice(0, 4), { teamId: 'T', date, status: 'finished', ...over });
  g.events = events;
  g.marks = [
    { type: 'start', period: 1, t: 0, wall: 0 },
    { type: 'end', period: 1, t: at('20:00'), wall: 0 },
    { type: 'start', period: 2, t: at('20:00'), wall: 0 },
    { type: 'end', period: 2, t: at('40:00'), wall: 0 },
  ];
  g.clock = { running: false, startedAt: null, elapsedMs: at('40:00'), period: 2 };
  return g;
}

describe('season stats', () => {
  const games = [
    finished('2026-09-12', [
      ev({ type: 'goal', playerId: 'p2', t: at('05:00') }),
      ev({ type: 'goal', playerId: 'p2', t: at('06:00') }),
    ]),
    finished('2026-08-30', [ev({ type: 'oppgoal', t: at('05:00') })]),
    finished('2027-02-01', [ev({ type: 'sub', playerId: 'p3', inId: 'p5', t: at('10:00') })], {
      squad: ['p1', 'p2', 'p3', 'p4', 'p5'],
    }),
    finished('2026-05-01'), // previous season
    makeGame(players, { teamId: 'T', date: '2026-10-01' }), // not played yet
    finished('2026-09-20', [], { teamId: 'OTHER' }),
  ];

  it('lists finished games of the team, oldest first', () => {
    expect(finishedGames(games, 'T').map((g) => g.date)).toEqual([
      '2026-05-01',
      '2026-08-30',
      '2026-09-12',
      '2027-02-01',
    ]);
  });

  it('lists seasons newest first', () => {
    expect(statsSeasons(games, 'T')).toEqual(['2026/2027', '2025/2026']);
  });

  it("adds up the team's record and each player's season", () => {
    const st = teamStats(games, players, 'T', '2026/2027', 0);
    expect(st.games).toHaveLength(3);
    expect(st.record).toEqual({ w: 1, d: 1, l: 1, gf: 2, ga: 1 });

    const byId = Object.fromEntries(st.players.map((ps) => [ps.p.id, ps]));
    expect(byId.p2).toMatchObject({ teamGames: 3, called: 3, played: 3, starts: 3, minutes: 120, goals: 2 });
    expect(byId.p3).toMatchObject({ called: 3, starts: 3, minutes: 90 });
    expect(byId.p5).toMatchObject({ called: 1, played: 1, starts: 0, minutes: 30 });
  });

  it('works out the result and the regular length of a game', () => {
    expect([
      resultOf({ us: 2, them: 1 }),
      resultOf({ us: 0, them: 1 }),
      resultOf({ us: 1, them: 1 }),
    ]).toEqual(['win', 'loss', 'draw']);
    expect(gameLength({ periods: 2, periodMin: 25 })).toBe(50);
  });
});
