// Age-group presets for a new game, and the formations offered for each team size.

export type Format = {
  id: string;
  /** Outfield players (the goalkeeper is extra). */
  field: number;
  periods: number;
  periodMin: number;
};

export const FORMATS: readonly Format[] = [
  { id: 'U7', field: 3, periods: 2, periodMin: 20 },
  { id: 'U8', field: 4, periods: 2, periodMin: 20 },
  { id: 'U9', field: 6, periods: 2, periodMin: 25 },
  { id: 'U10', field: 6, periods: 2, periodMin: 25 },
  { id: 'U11', field: 8, periods: 2, periodMin: 30 },
  { id: 'U12', field: 8, periods: 2, periodMin: 30 },
  { id: 'U13+', field: 10, periods: 2, periodMin: 35 },
  { id: 'Custom', field: 4, periods: 2, periodMin: 20 },
];

// Formations per number of outfield players (defence → attack). The first one is the default.
export const FORMATIONS: Readonly<Record<number, readonly string[]>> = {
  1: ['1'],
  2: ['1-1', '2'],
  3: ['2-1', '1-2', '1-1-1'],
  4: ['1-2-1', '2-2', '2-1-1', '3-1'],
  5: ['2-2-1', '2-1-2', '1-2-2', '3-2'],
  6: ['2-3-1', '3-2-1', '2-1-2-1', '3-1-2'],
  7: ['3-3-1', '2-3-2', '3-2-2', '2-4-1'],
  8: ['3-3-2', '3-4-1', '2-4-2', '3-2-3'],
  9: ['4-3-2', '3-4-2', '4-4-1', '3-3-3'],
  10: ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '4-1-4-1'],
};

/** Formations for `n` outfield players (the first is the default); one line for unusual sizes. */
export const formationsFor = (n: number): readonly string[] => FORMATIONS[n] ?? [String(n)];
