// A live game, at the real time: the domain's clock functions with `now` filled in, and adding
// an event (saved straight away). Screens and features use these; domain/ stays time-free.
import {
  applyFix as applyFixAt,
  endPeriod,
  fmtNowAt,
  matchTimeAt,
  startClock as startClockAt,
} from '@/domain/clock';
import { canRecord } from '@/domain/game-state';
import { formationOf as formationOfGame } from '@/domain/pitch';
import type { Game, GameEvent } from '@/domain/types';
import { buzz } from '@/shared/lib/device';
import { uid } from '@/shared/lib/id';
import { save } from './save';
import { db } from './store';

export const matchTime = (g: Game): number => matchTimeAt(g, Date.now());
export const startClock = (g: Game): void => startClockAt(g, Date.now());
export const fmtNow = (g: Game): string => fmtNowAt(g, Date.now());
export const endPeriodAt = (g: Game, endT: number): void => endPeriod(g, endT, Date.now());

/** "I forgot to press the button" (see applyFix in domain/clock.ts), saved. */
export function applyFix(g: Game, endMin: number, startedMinAgo: number | null): void {
  applyFixAt(g, endMin, startedMinAgo, Date.now());
  save();
}

/** The game's formation, or the last one picked on this phone for that team size. */
export const formationOf = (g: Game): string => formationOfGame(g, db.formations);

type NewEvent = GameEvent extends infer E
  ? E extends GameEvent
    ? Omit<E, 'id' | 't' | 'wall'>
    : never
  : never;

/**
 * Logs an event now (match time and wall time), saves, and buzzes. Returns its id (for Undo),
 * or null when the game is finished and nothing new can be recorded.
 */
export function addEvent(g: Game, e: NewEvent): string | null {
  if (!canRecord(g)) return null;
  const id = uid();
  g.events.push({ id, t: matchTime(g), wall: Date.now(), ...e } as GameEvent);
  save();
  buzz();
  return id;
}
