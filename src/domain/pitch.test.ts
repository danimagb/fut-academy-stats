import { describe, expect, it } from 'vitest';
import { makeGame, makePlayer } from '@/test/factories';
import { fitLineup, formationOf, slotCoords, startLineup } from './pitch';

describe('formationOf', () => {
  const g = makeGame([], { field: 4, formation: '' });

  it("keeps the game's formation when it fits the team size", () => {
    expect(formationOf({ ...g, formation: '2-2' }, undefined)).toBe('2-2');
  });

  it('otherwise uses the last formation picked for that size, then the default', () => {
    expect(formationOf(g, { 4: '3-1' })).toBe('3-1');
    expect(formationOf(g, { 4: '2-1' })).toBe('1-2-1'); // saved one doesn't fit 4 players
    expect(formationOf(g, undefined)).toBe('1-2-1');
  });
});

describe('slotCoords', () => {
  it('has the goal plus one slot per outfield player, defence lowest', () => {
    const pts = slotCoords('2-1');
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: 50, y: 'calc(100% - 50px)' });
    expect(pts[1]!.y).toBeGreaterThan(pts[3]!.y as number);
    expect(pts[3]!.x).toBe(50);
  });
});

describe('fitLineup', () => {
  it('keeps players in their places, puts the GK in goal and fills gaps in order', () => {
    expect(fitLineup([null, 'b', null, 'd'], ['a', 'b', 'c', 'd'], 'a', 4)).toEqual(['a', 'b', 'c', 'd']);
    expect(fitLineup(['x', 'c', 'b'], ['a', 'b', 'c', 'd'], 'a', 4)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('leaves the goal empty when the goalkeeper is not a starter', () => {
    expect(fitLineup([], ['b', 'c'], 'a', 3)).toEqual([null, 'b', 'c']);
  });

  it('leaves empty places when there are fewer starters than slots', () => {
    expect(fitLineup([], ['a', 'b'], 'a', 4)).toEqual(['a', 'b', null, null]);
  });
});

describe('startLineup', () => {
  it('fills the outfield in shirt-number order', () => {
    const players = [9, 3, 1, 7].map((n) => makePlayer({ id: `p${n}`, number: String(n) }));
    const g = makeGame(players, { field: 3, gkId: 'p1', starters: ['p9', 'p3', 'p1', 'p7'] });
    expect(startLineup(g)).toEqual(['p1', 'p3', 'p7', 'p9']);
  });
});
