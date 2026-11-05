// Everything about a game that isn't stored: who is on, the goalkeeper, the score, each
// player's minutes, goals and cards, and the lineup. All of it is derived from the events.
import { matchTimeAt } from './clock';
import { startLineup } from './pitch';
import type { Game, Lineup } from './types';

/** Match-time intervals a player was on the pitch, as [from, to] in ms. */
export type Interval = [number, number];

export type PlayerState = {
  intervals: Interval[];
  /** Start of the current stint while on the pitch, else null. */
  open: number | null;
  goals: number;
  yellow: number;
  red: number;
  redAt: number | null;
  /** Total time played, ms. */
  played: number;
};

export type GameState = {
  on: Set<string>;
  sentOff: Set<string>;
  gk: string | null;
  us: number;
  them: number;
  stats: Record<string, PlayerState>;
  slots: Lineup;
};

/** The game's state at `now` (stints still open end at the current match time). */
export function deriveState(g: Game, now: number): GameState {
  const on = new Set(g.starters);
  const sentOff = new Set<string>();
  let gk: string | null = g.gkId;
  const slots = startLineup(g);
  let us = 0;
  let them = 0;
  const stats: Record<string, PlayerState> = {};
  for (const id of g.squad)
    stats[id] = { intervals: [], open: null, goals: 0, yellow: 0, red: 0, redAt: null, played: 0 };
  for (const id of g.starters) if (stats[id]) stats[id].open = 0;

  const close = (s: PlayerState | undefined, time: number) => {
    if (!s) return;
    if (s.open != null) s.intervals.push([s.open, time]);
    s.open = null;
  };

  for (const e of g.events) {
    if (e.type === 'oppgoal') {
      them++;
      continue;
    }
    const s = stats[e.playerId];
    switch (e.type) {
      case 'sub': {
        on.delete(e.playerId);
        on.add(e.inId);
        close(s, e.t);
        const inn = stats[e.inId];
        if (inn) inn.open = e.t;
        if (gk === e.playerId) gk = e.inId;
        if (slots.includes(e.playerId)) slots[slots.indexOf(e.playerId)] = e.inId;
        else if (slots.includes(null)) slots[slots.indexOf(null)] = e.inId;
        break;
      }
      case 'goal':
        if (s) s.goals++;
        us++;
        break;
      case 'yellow':
        if (s) s.yellow++;
        break;
      case 'red':
        if (s) {
          s.red++;
          s.redAt = e.t;
        }
        sentOff.add(e.playerId);
        if (on.delete(e.playerId)) close(s, e.t);
        if (gk === e.playerId) gk = null;
        if (slots.includes(e.playerId)) slots[slots.indexOf(e.playerId)] = null;
        break;
      case 'gk': {
        gk = e.playerId;
        const i = slots.indexOf(e.playerId);
        if (i > 0) [slots[0], slots[i]] = [e.playerId, slots[0] ?? null];
        break;
      }
      case 'pos': {
        // move an outfield player to another outfield slot, swapping with whoever is there
        const i = slots.indexOf(e.playerId);
        if (i > 0 && e.slot > 0 && e.slot < slots.length)
          [slots[i], slots[e.slot]] = [slots[e.slot] ?? null, e.playerId];
        break;
      }
    }
  }

  const end = matchTimeAt(g, now);
  for (const id of g.squad) {
    const s = stats[id];
    if (!s) continue;
    if (s.open != null) s.intervals.push([s.open, end]);
    s.intervals = s.intervals.filter(([a, b]) => b > a || g.status === 'scheduled');
    s.played = s.intervals.reduce((sum, [a, b]) => sum + (b - a), 0);
  }
  return { on, sentOff, gk, us, them, stats, slots };
}

/** What moving pitch player `id` to `slot` means (see `movePlayer` in the game screen). */
export type MovePlan =
  | { kind: 'none' }
  /** Before kick-off: just a new starting lineup (and goalkeeper). */
  | { kind: 'lineup'; lineup: Lineup; gkId: string | null }
  /** A new goalkeeper (moving into or out of goal). */
  | { kind: 'gk'; playerId: string }
  /** An outfield position change (swapping with whoever is there). */
  | { kind: 'pos'; playerId: string; slot: number };

export function planMove(g: Game, d: Pick<GameState, 'slots'>, id: string, slot: number): MovePlan {
  const from = d.slots.indexOf(id);
  if (from < 0 || from === slot) return { kind: 'none' };
  const other = d.slots[slot] ?? null;
  const newGk = slot === 0 ? id : from === 0 ? other : null;
  if (from === 0 && !other) return { kind: 'none' }; // the GK can't leave the goal empty
  if (g.status === 'scheduled' && !g.events.length) {
    const s = [...d.slots];
    [s[from], s[slot]] = [s[slot] ?? null, s[from] ?? null];
    return { kind: 'lineup', lineup: s, gkId: s[0] ?? null };
  }
  return newGk ? { kind: 'gk', playerId: newGk } : { kind: 'pos', playerId: id, slot };
}
