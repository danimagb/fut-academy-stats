import { describe, expect, it } from 'vitest';
import { FORMATIONS, FORMATS, formationsFor } from './formats';

const outfield = (formation: string) => formation.split('-').reduce((n, x) => n + Number(x), 0);

describe('formats and formations', () => {
  it('has unique format ids, with Custom last', () => {
    const ids = FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.at(-1)).toBe('Custom');
  });

  it('only offers formations that add up to the number of outfield players', () => {
    const wrong = Object.entries(FORMATIONS).flatMap(([n, list]) =>
      list.filter((f) => outfield(f) !== Number(n)).map((f) => `${n}: ${f}`),
    );
    expect(wrong).toEqual([]);
  });

  it('has formations for every preset team size', () => {
    const missing = FORMATS.filter((f) => !FORMATIONS[f.field]).map((f) => f.id);
    expect(missing).toEqual([]);
  });

  it('falls back to a single line for unusual team sizes', () => {
    expect(formationsFor(4)[0]).toBe('1-2-1');
    expect(formationsFor(12)).toEqual(['12']);
  });
});
