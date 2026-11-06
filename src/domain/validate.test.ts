import { describe, expect, it } from 'vitest';
import { at, ev, makeGame, makePlayer, makeTeam } from '@/test/factories';
import { checkIncoming, checkShape, maxMatchTime } from './validate';
import type { Game } from './types';

const players = [1, 2, 3, 4, 5].map((n) => makePlayer({ id: `p${n}`, number: String(n) }));
const game = (over: Partial<Game> = {}) => makeGame(players, { status: 'finished', ...over });
const problems = (r: unknown) => checkIncoming('games', r).problems;

describe('valid data passes', () => {
  it('accepts normal teams, players and games', () => {
    expect(checkIncoming('teams', makeTeam()).ok).toBe(true);
    expect(checkIncoming('players', players[0]).ok).toBe(true);
    const g = game({
      events: [
        ev({ type: 'goal', playerId: 'p2', t: at('05:00') }),
        ev({ type: 'sub', playerId: 'p2', inId: 'p5', t: at('10:00') }),
        ev({ type: 'oppgoal', t: at('12:00') }),
        ev({ type: 'pos', playerId: 'p3', slot: 2, t: at('13:00') }),
      ],
      marks: [{ type: 'start', period: 1, t: 0, wall: 0 }],
    });
    expect(checkIncoming('games', g)).toEqual({ ok: true, problems: [] });
  });

  it('accepts players and games from before teams existed (no teamId)', () => {
    const { teamId: _t, ...player } = players[0]!;
    const { teamId: _g, ...oldGame } = game();
    expect(checkShape('players', player).ok).toBe(true);
    expect(checkIncoming('games', oldGame).ok).toBe(true);
  });

  it('accepts older games without newer fields (no maxExtra, no marks yet)', () => {
    const g: Partial<Game> = game();
    delete g.maxExtra;
    delete (g as { marks?: unknown }).marks;
    expect(checkIncoming('games', g).ok).toBe(true);
  });

  it('accepts a long game with all its extra time', () => {
    const g = game({ periods: 2, periodMin: 20, maxExtra: 10 });
    g.events.push(ev({ type: 'goal', playerId: 'p2', t: 60 * 60_000 }));
    expect(checkIncoming('games', g).ok).toBe(true);
  });
});

describe('broken or implausible data is rejected', () => {
  it('rejects records that would crash the app', () => {
    expect(checkShape('teams', null).ok).toBe(false);
    expect(checkShape('players', { teamId: 'T' }).problems).toEqual(['id']);
    expect(checkShape('players', { id: 'x', teamId: 7 }).problems).toEqual(['teamId']);
    expect(checkShape('games', { ...game(), events: {} }).problems).toContain('events');
    expect(checkShape('games', { ...game(), clock: null }).problems).toContain('clock');
    expect(checkShape('games', { ...game(), events: [1] }).problems).toContain('events: not objects');
  });

  it('rejects unknown event types and statuses', () => {
    expect(problems(game({ status: 'paused' as never }))).toContain('status paused');
    const g = game();
    g.events.push({ id: 'e1', t: 0, wall: 0, type: 'teleport' } as never);
    expect(problems(g)).toContain('event e1: type teleport');
  });

  it('rejects negative or impossibly late times', () => {
    const g = game();
    g.events.push({ ...ev({ type: 'goal', playerId: 'p2', t: 0 }), id: 'neg', t: -1 });
    g.events.push({ ...ev({ type: 'goal', playerId: 'p2', t: 0 }), id: 'late', t: maxMatchTime(g) + 1 });
    expect(problems(g)).toEqual(expect.arrayContaining(['event neg: time', 'event late: time']));
  });

  it('rejects events for players not in the squad', () => {
    const g = game();
    g.events.push({ ...ev({ type: 'goal', playerId: 'nobody', t: 0 }), id: 'x' });
    g.events.push({ ...ev({ type: 'sub', playerId: 'p2', inId: 'ghost', t: 0 }), id: 'y' });
    expect(problems(g)).toEqual(['event x: player not in squad', 'event y: player coming on not in squad']);
  });

  it('rejects starters outside the squad and nonsense game settings', () => {
    expect(problems(game({ starters: ['zz'] }))).toContain('starters not in squad');
    expect(problems(game({ periods: 0 }))).toContain('periods');
    expect(problems(game({ periodMin: 999 }))).toContain('periodMin');
  });

  it('rejects huge text', () => {
    const big = 'x'.repeat(501);
    expect(checkIncoming('teams', makeTeam({ club: big })).problems).toEqual(['club']);
    expect(checkIncoming('players', makePlayer({ name: big })).problems).toEqual(['name']);
    expect(problems(game({ opponent: big }))).toContain('opponent');
  });

  it('rejects a game with an absurd number of events', () => {
    const g = game();
    g.events = Array.from({ length: 5001 }, (_, i) => ({ ...ev({ type: 'oppgoal', t: 0 }), id: `e${i}` }));
    expect(problems(g)).toContain('too many events');
  });
});
