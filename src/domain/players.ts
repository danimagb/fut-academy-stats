// How players are ordered and named inside a game (from the names the game keeps).
import type { Game, SquadName } from './types';

type Numbered = Pick<SquadName, 'number' | 'name'>;

/** Shirt-number order (players without a number last), then by name. */
export const byNumber = (a: Numbered, b: Numbered): number =>
  (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999) || a.name.localeCompare(b.name);

/** The ids sorted by the shirt numbers this game knows them by. */
export function sortIds(g: Pick<Game, 'names'>, ids: readonly string[]): string[] {
  return [...ids].sort((a, b) =>
    byNumber(g.names[a] ?? { number: '', name: '' }, g.names[b] ?? { number: '', name: '' }),
  );
}

/** "#7 Name" (or just the name without a number); "?" for an unknown id. */
export function pname(g: Pick<Game, 'names'>, id: string): string {
  const p = g.names[id];
  if (!p) return '?';
  return p.number ? `#${p.number} ${p.name}` : p.name;
}

/** A squad member's names as the game keeps them; placeholders for an id the game doesn't know. */
export function squadName(g: Pick<Game, 'names'>, id: string): SquadName {
  return g.names[id] ?? { name: '?', number: '', fullName: '' };
}
