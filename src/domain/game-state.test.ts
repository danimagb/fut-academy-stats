import { describe, expect, it } from 'vitest';
import { at, ev, makeGame, makePlayer } from '@/test/factories';
import { startClock } from './clock';
import { canRecord, deriveState, planMove, statsOf } from './game-state';
import type { Game } from './types';

const MIN = 60_000;
// p1 is the GK; p2-p4 start (1 GK + 3); p5, p6 on the bench.
const players = [1, 2, 3, 4, 5, 6].map((n) => makePlayer({ id: `p${n}`, number: String(n) }));

function live(over: Partial<Game> = {}): Game {
  const g = makeGame(players, { status: 'live', ...over });
  g.marks.push({ type: 'start', period: 1, t: 0, wall: 0 });
  startClock(g, 0);
  return g;
}

describe('deriveState', () => {
  it('starts with the starters on, the goalkeeper in goal and 0–0', () => {
    const d = deriveState(makeGame(players), 0);
    expect([...d.on].sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(d.gk).toBe('p1');
    expect(d.slots).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect([d.us, d.them]).toEqual([0, 0]);
  });

  it('counts minutes played, including time still running', () => {
    const g = live();
    g.events.push(ev({ type: 'sub', playerId: 'p2', inId: 'p5', t: at('10:00') }));
    const d = deriveState(g, 15 * MIN);
    expect(d.stats.p2!.played).toBe(10 * MIN);
    expect(d.stats.p5!.played).toBe(5 * MIN);
    expect(d.stats.p3!.played).toBe(15 * MIN);
    expect(d.stats.p6!.played).toBe(0);
    expect(d.stats.p2!.intervals).toEqual([[0, at('10:00')]]);
  });

  it('counts extra time as time played', () => {
    const g = live();
    expect(deriveState(g, 23 * MIN).stats.p3!.played).toBe(23 * MIN);
  });

  it('puts the player coming on in the place of the one going off', () => {
    const g = live();
    g.events.push(ev({ type: 'sub', playerId: 'p3', inId: 'p6', t: at('05:00') }));
    const d = deriveState(g, 6 * MIN);
    expect(d.slots).toEqual(['p1', 'p2', 'p6', 'p4']);
    expect(d.on.has('p3')).toBe(false);
  });

  it('subbing the goalkeeper makes the new player the goalkeeper', () => {
    const g = live();
    g.events.push(ev({ type: 'sub', playerId: 'p1', inId: 'p5', t: at('05:00') }));
    const d = deriveState(g, 6 * MIN);
    expect(d.gk).toBe('p5');
    expect(d.slots[0]).toBe('p5');
  });

  it('moves a pitch player into goal, swapping places with the goalkeeper', () => {
    const g = live();
    g.events.push(ev({ type: 'gk', playerId: 'p3', t: at('05:00') }));
    const d = deriveState(g, 6 * MIN);
    expect(d.gk).toBe('p3');
    expect(d.slots).toEqual(['p3', 'p2', 'p1', 'p4']);
  });

  it('swaps outfield positions', () => {
    const g = live();
    g.events.push(ev({ type: 'pos', playerId: 'p2', slot: 3, t: at('05:00') }));
    expect(deriveState(g, 6 * MIN).slots).toEqual(['p1', 'p4', 'p3', 'p2']);
  });

  it('a red card takes the player off for good and leaves the team one short', () => {
    const g = live();
    g.events.push(ev({ type: 'red', playerId: 'p4', t: at('08:00') }));
    const d = deriveState(g, 12 * MIN);
    expect(d.on.has('p4')).toBe(false);
    expect(d.sentOff.has('p4')).toBe(true);
    expect(d.slots).toEqual(['p1', 'p2', 'p3', null]);
    expect(d.stats.p4).toMatchObject({ red: 1, redAt: at('08:00'), played: 8 * MIN });
  });

  it('a sub after a red card fills the empty place', () => {
    const g = live();
    g.events.push(
      ev({ type: 'red', playerId: 'p4', t: at('08:00') }),
      ev({ type: 'sub', playerId: 'p2', inId: 'p5', t: at('09:00') }),
    );
    expect(deriveState(g, 10 * MIN).slots).toEqual(['p1', 'p5', 'p3', null]);
  });

  it('a red card for the goalkeeper leaves nobody in goal', () => {
    const g = live();
    g.events.push(ev({ type: 'red', playerId: 'p1', t: at('08:00') }));
    const d = deriveState(g, 10 * MIN);
    expect(d.gk).toBeNull();
    expect(d.slots[0]).toBeNull();
  });

  it('counts goals, goals conceded and cards', () => {
    const g = live();
    g.events.push(
      ev({ type: 'goal', playerId: 'p3', t: at('01:00') }),
      ev({ type: 'goal', playerId: 'p3', t: at('02:00') }),
      ev({ type: 'oppgoal', t: at('03:00') }),
      ev({ type: 'yellow', playerId: 'p2', t: at('04:00') }),
    );
    const d = deriveState(g, 5 * MIN);
    expect([d.us, d.them]).toEqual([2, 1]);
    expect(d.stats.p3!.goals).toBe(2);
    expect(d.stats.p2!.yellow).toBe(1);
  });

  it('drops zero-length stints (a player subbed straight back off)', () => {
    const g = live();
    g.events.push(
      ev({ type: 'sub', playerId: 'p2', inId: 'p5', t: at('05:00') }),
      ev({ type: 'sub', playerId: 'p5', inId: 'p2', t: at('05:00') }),
    );
    expect(deriveState(g, 6 * MIN).stats.p5!.intervals).toEqual([]);
  });
});

describe('planMove', () => {
  it('before kick-off, just rearranges the starting lineup', () => {
    const g = makeGame(players);
    const d = deriveState(g, 0);
    expect(planMove(g, d, 'p2', 0)).toEqual({ kind: 'lineup', lineup: ['p2', 'p1', 'p3', 'p4'], gkId: 'p2' });
  });

  it('during the game, moving into or out of goal changes the goalkeeper', () => {
    const g = live();
    const d = deriveState(g, MIN);
    expect(planMove(g, d, 'p3', 0)).toEqual({ kind: 'gk', playerId: 'p3' });
    expect(planMove(g, d, 'p1', 2)).toEqual({ kind: 'gk', playerId: 'p3' });
  });

  it('swaps outfield positions during the game', () => {
    const g = live();
    expect(planMove(g, deriveState(g, MIN), 'p2', 3)).toEqual({ kind: 'pos', playerId: 'p2', slot: 3 });
  });

  it('does nothing for the same slot, a bench player, or the GK leaving the goal empty', () => {
    const g = live();
    g.events.push(ev({ type: 'red', playerId: 'p4', t: at('01:00') }));
    const d = deriveState(g, 2 * MIN);
    expect(planMove(g, d, 'p2', 1)).toEqual({ kind: 'none' });
    expect(planMove(g, d, 'p5', 1)).toEqual({ kind: 'none' });
    expect(planMove(g, d, 'p1', 3)).toEqual({ kind: 'none' });
  });
});

describe('canRecord', () => {
  it('allows new events until full time', () => {
    expect(canRecord(makeGame(players))).toBe(true);
    expect(canRecord(live())).toBe(true);
    expect(canRecord(live({ status: 'break' }))).toBe(true);
    expect(canRecord(live({ status: 'finished' }))).toBe(false);
  });
});

describe('statsOf', () => {
  it("returns a squad member's stats, and zeros for an id outside the squad", () => {
    const g = live();
    g.events.push(ev({ type: 'goal', playerId: 'p2', t: 60_000 }));
    const d = deriveState(g, 120_000);
    expect(statsOf(d, 'p2').goals).toBe(1);
    expect(statsOf(d, 'nobody')).toEqual({
      intervals: [],
      open: null,
      goals: 0,
      yellow: 0,
      red: 0,
      redAt: null,
      played: 0,
    });
  });
});
