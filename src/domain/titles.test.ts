import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '@/shared/i18n/i18n';
import { byNumber, pname, sortIds } from './players';
import { gameTeam, matchTitle, periodName, seasonOf, teamFull, teamLabel } from './titles';

afterEach(() => setLang('en'));

describe('team and match titles', () => {
  it('shows a team as "Club - Age group", or whichever is set', () => {
    expect(teamFull('Test FC', 'U8')).toBe('Test FC - U8');
    expect(teamFull('  Test FC ', '')).toBe('Test FC');
    expect(teamFull(null, 'U8')).toBe('U8');
    expect(teamLabel({ club: '', name: '' })).toBe('My team');
    expect(gameTeam({ club: 'Test FC', team: 'U8' })).toBe('Test FC - U8');
  });

  it('puts the home side first', () => {
    const g = { club: 'Test FC', team: 'U8', opponent: 'Rival' };
    expect(matchTitle({ ...g, home: true })).toBe('Test FC - U8 x Rival');
    expect(matchTitle({ ...g, home: false })).toBe('Rival x Test FC - U8');
    expect(matchTitle({ club: '', team: '', opponent: 'Rival', home: true })).toBe('vs Rival');
  });

  it('names periods for halves, quarters and single-period games', () => {
    expect([periodName({ periods: 2 }, 1), periodName({ periods: 2 }, 2)]).toEqual(['1st half', '2nd half']);
    expect(periodName({ periods: 4 }, 3)).toBe('Q3');
    expect(periodName({ periods: 1 }, 1)).toBe('Game');
    setLang('pt');
    expect(periodName({ periods: 2 }, 2)).toBe('2ª parte');
  });
});

describe('seasons', () => {
  it('runs from August to July', () => {
    expect(seasonOf('2026-08-01')).toBe('2026/2027');
    expect(seasonOf('2027-07-31')).toBe('2026/2027');
    expect(seasonOf('2026-07-31')).toBe('2025/2026');
    expect(seasonOf('')).toBe('');
  });
});

describe('players in a game', () => {
  const g = {
    names: {
      a: { number: '10', name: 'Ana', fullName: '' },
      b: { number: '2', name: 'Bea', fullName: '' },
      c: { number: '', name: 'Cal', fullName: '' },
      d: { number: '2', name: 'Abe', fullName: '' },
    },
  };

  it('orders by shirt number (numbered first), then name', () => {
    expect(sortIds(g, ['a', 'b', 'c', 'd'])).toEqual(['d', 'b', 'a', 'c']);
    expect(byNumber({ number: '3', name: 'X' }, { number: '12', name: 'Y' })).toBeLessThan(0);
  });

  it('shows "#number name"', () => {
    expect(pname(g, 'a')).toBe('#10 Ana');
    expect(pname(g, 'c')).toBe('Cal');
    expect(pname(g, 'zz')).toBe('?');
  });
});
