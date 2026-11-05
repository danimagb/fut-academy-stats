// A lineup is one id (or null) per slot: slot 0 is the goal, slots 1..field follow the
// formation from defence to attack, left to right. Changing formation keeps the slots.
import { formationsFor } from './formats';
import { sortIds } from './players';
import type { Game, Lineup } from './types';

/** The game's formation if it fits its team size, else the last one used for that size, else the default. */
export function formationOf(
  g: Pick<Game, 'field' | 'formation'>,
  savedFormations: Readonly<Record<string, string>> | undefined,
): string {
  const list = formationsFor(g.field);
  if (list.includes(g.formation)) return g.formation;
  const last = savedFormations?.[g.field];
  return last && list.includes(last) ? last : (list[0] ?? String(g.field));
}

/** A slot's position in % of the pitch; the GK's `y` is a CSS length from the bottom edge. */
export type SlotPoint = { x: number; y: number | string };

/**
 * Slot positions in % of the pitch (own goal at the bottom). The GK's `y` is a CSS length: a
 * fixed distance from the bottom edge, so its name and minutes always fit inside the pitch
 * however small the pitch gets (it shrinks with the screen height).
 */
export function slotCoords(formation: string): SlotPoint[] {
  const rows = formation.split('-').map(Number);
  const pts: SlotPoint[] = [{ x: 50, y: 'calc(100% - 50px)' }];
  rows.forEach((n, r) => {
    const y = rows.length === 1 ? 52 : 70 - r * (54 / (rows.length - 1));
    for (let i = 0; i < n; i++) pts.push({ x: 50 + ((i + 1) / (n + 1) - 0.5) * 115, y });
  });
  return pts;
}

/** Keep players where they were, put the GK in goal and fill the gaps in shirt order. */
export function fitLineup(
  prev: Lineup | null | undefined,
  starters: readonly string[],
  gkId: string | null,
  size: number,
): Lineup {
  const slots: Lineup = Array<string | null>(size).fill(null);
  slots[0] = gkId != null && starters.includes(gkId) ? gkId : null;
  const rest = starters.filter((id) => id !== slots[0]);
  (prev || []).forEach((id, i) => {
    if (i > 0 && i < size && id != null && rest.includes(id)) slots[i] = id;
  });
  const left = rest.filter((id) => !slots.includes(id));
  for (let i = 1; i < size; i++) if (!slots[i]) slots[i] = left.shift() ?? null;
  return slots;
}

/** The lineup at kick-off. */
export const startLineup = (g: Pick<Game, 'lineup' | 'names' | 'starters' | 'gkId' | 'field'>): Lineup =>
  fitLineup(g.lineup, sortIds(g, g.starters), g.gkId, g.field + 1);
