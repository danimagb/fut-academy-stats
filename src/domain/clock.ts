// Match time (event `t`, marks, clock) counts only time actually played, so minutes played
// add up. The clock shown to the coach restarts every period at its regular start (2nd half
// at 20:00), and extra time shows as "20:00 (+02:00)".
//
// Nothing here reads the real time: callers pass `now` (ms since the epoch).
import { t } from '@/shared/i18n/i18n';
import { fmtClock } from '@/shared/lib/format';
import { periodName } from './titles';
import type { Game, GameEvent, Mark } from './types';

type ClockGame = Pick<Game, 'clock'>;

/** Match time at `now`, ms. */
export function matchTimeAt(g: ClockGame, now: number): number {
  const c = g.clock;
  return c.elapsedMs + (c.running && c.startedAt != null ? now - c.startedAt : 0);
}

export function startClock(g: ClockGame, now: number): void {
  if (g.clock.running) return;
  g.clock.running = true;
  g.clock.startedAt = now;
}

export function stopClock(g: ClockGame, now: number): void {
  if (!g.clock.running) return;
  g.clock.elapsedMs = matchTimeAt(g, now);
  g.clock.running = false;
  g.clock.startedAt = null;
}

/** Match time at which the current (latest started) period began. */
export function periodStart(g: Pick<Game, 'marks'>): number {
  const m = [...g.marks].reverse().find((x) => x.type === 'start');
  return m ? m.t : 0;
}

/** Game clock for `ms` into period `p`. */
export function fmtInPeriod(g: Pick<Game, 'periodMin'>, p: number, ms: number): string {
  const regular = g.periodMin * 60000;
  const offset = (p - 1) * regular;
  return Math.floor(ms / 1000) > g.periodMin * 60
    ? `${fmtClock(offset + regular)} (+${fmtClock(ms - regular)})`
    : fmtClock(offset + ms);
}

/**
 * Game clock for match time `time`. A time on the boundary between two periods counts as the
 * end of the earlier one, or the start of the later one with `atStart`.
 */
export function fmtAt(g: Pick<Game, 'marks' | 'periodMin'>, time: number, atStart = false): string {
  let m: Mark | null = null;
  for (const x of g.marks) if (x.type === 'start' && (!m || (atStart ? x.t <= time : x.t < time))) m = x;
  return m ? fmtInPeriod(g, m.period, time - m.t) : fmtClock(time);
}

/** The clock shown now: the running period's clock while live, else the time it stopped at. */
export function fmtNowAt(g: Game, now: number): string {
  if (g.status === 'live') return fmtInPeriod(g, g.clock.period, matchTimeAt(g, now) - periodStart(g));
  return fmtAt(g, matchTimeAt(g, now));
}

/** "2nd half", "2nd half (paused)", "Break after 1st half", "Full time"… */
export function periodLabel(g: Game): string {
  const c = g.clock;
  switch (g.status) {
    case 'scheduled':
      return t('notStarted', { n: g.periods, m: g.periodMin });
    case 'live':
      return `${periodName(g, c.period)}${c.running ? '' : ` (${t('paused')})`}`;
    case 'break':
      return t('breakAfter', { p: periodName(g, c.period) });
    default:
      return t('fullTime');
  }
}

/** How long a period may run past its regular end before it is stopped automatically. */
export const maxExtraMs = (g: Pick<Game, 'maxExtra'>): number => (g.maxExtra ?? 10) * 60000;

/**
 * Ends the current period at match time `endT` (may be earlier than now). Events logged after
 * `endT` happened during the break, so they move to `endT`.
 */
export function endPeriod(g: Game, endT: number, now: number): void {
  stopClock(g, now);
  g.clock.elapsedMs = endT;
  for (const e of g.events) if (e.t > endT) e.t = endT;
  g.marks.push({ type: 'end', period: g.clock.period, t: endT, wall: now });
  g.status = g.clock.period >= g.periods ? 'finished' : 'break';
}

/** What a live period needs at `now`: nothing, a reminder (every 2 minutes), or an auto-stop. */
export type TimeCheck =
  | { kind: 'none' }
  | { kind: 'auto-stop'; period: number; endT: number }
  | { kind: 'remind'; period: number; n: number; extraMin: number };

export function timeCheck(g: Game, now: number): TimeCheck {
  const p = g.clock.period;
  const pt = matchTimeAt(g, now) - periodStart(g);
  const regular = g.periodMin * 60000;
  if (pt >= regular + maxExtraMs(g)) {
    return { kind: 'auto-stop', period: p, endT: periodStart(g) + regular + maxExtraMs(g) };
  }
  if (pt >= regular) {
    const n = Math.floor((pt - regular) / 120000);
    if ((g.alerted[p] ?? -1) >= n) return { kind: 'none' };
    return { kind: 'remind', period: p, n, extraMin: Math.floor((pt - regular) / 60000) };
  }
  return { kind: 'none' };
}

/**
 * "I forgot to press the button": the current period really ended `endMin` minutes after it
 * started and, optionally, the next one started `startedMinAgo` minutes before `now`. Event
 * times are rebuilt from their real (wall-clock) timestamps.
 */
export function applyFix(g: Game, endMin: number, startedMinAgo: number | null, now: number): void {
  const p = g.clock.period;
  const last = p >= g.periods;
  const startIdx = g.marks.map((m) => m.type).lastIndexOf('start');
  const start = g.marks[startIdx]?.t ?? 0;
  const endT = start + Math.round(endMin * 60000);
  const resumeWall = startedMinAgo != null && !last ? now - Math.round(startedMinAgo * 60000) : null;

  for (const e of g.events) {
    if (e.t <= endT) continue;
    e.t = resumeWall != null && e.wall >= resumeWall ? endT + (e.wall - resumeWall) : endT;
  }
  g.marks = g.marks.slice(0, startIdx + 1);
  g.marks.push({ type: 'end', period: p, t: endT, wall: now });
  Object.assign(g.clock, { running: false, startedAt: null, elapsedMs: endT });
  g.autoStopped = null;

  if (resumeWall != null) {
    g.clock.period = p + 1;
    g.marks.push({ type: 'start', period: p + 1, t: endT, wall: resumeWall });
    Object.assign(g.clock, { running: true, startedAt: resumeWall });
    g.status = 'live';
    delete g.alerted[p + 1];
  } else {
    g.status = last ? 'finished' : 'break';
  }
}

/**
 * Timeline time: a period start shows its regular start, everything else the game clock.
 * Events logged during a break sit exactly on the end of the period before it, and show at
 * the start of the next one (a half-time sub is at 20:00, not 20:00 (+00:02)).
 */
export function timeOf(g: Game, e: GameEvent | Mark): string {
  if (e.type === 'start') return fmtInPeriod(g, e.period, 0);
  const brk =
    e.type !== 'end' && g.marks.find((m) => m.type === 'end' && m.t === e.t && m.period < g.periods);
  return brk ? fmtInPeriod(g, brk.period + 1, 0) : fmtAt(g, e.t);
}
