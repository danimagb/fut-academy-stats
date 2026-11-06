import { describe, expect, it } from 'vitest';
import { makeGame, makePlayer } from '@/test/factories';
import { pname, sortIds, squadName } from './players';

const players = [
  makePlayer({ id: 'a', number: '10', name: 'Ana' }),
  makePlayer({ id: 'b', number: '', name: 'Bia' }),
  makePlayer({ id: 'c', number: '2', name: 'Cris' }),
];

describe('players', () => {
  const g = makeGame(players);

  it('sorts by shirt number, players without a number last', () => {
    expect(sortIds(g, ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
  });

  it('names a player with their number, and "?" for an unknown id', () => {
    expect(pname(g, 'a')).toBe('#10 Ana');
    expect(pname(g, 'b')).toBe('Bia');
    expect(pname(g, 'x')).toBe('?');
  });

  it('gives placeholders for an id the game does not know', () => {
    expect(squadName(g, 'c').name).toBe('Cris');
    expect(squadName(g, 'x')).toEqual({ name: '?', number: '', fullName: '' });
  });
});
