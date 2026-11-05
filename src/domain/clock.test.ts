import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '@/shared/i18n/i18n';
import { at, ev, makeGame, makePlayer } from '@/test/factories';
import {
  applyFix,
  endPeriod,
  fmtAt,
  fmtInPeriod,
  fmtNowAt,
  matchTimeAt,
  periodLabel,
  startClock,
  stopClock,
  timeCheck,
  timeOf,
} from './clock';
import type { Game } from './types';

const MIN = 60_000;
const players = [1, 2, 3, 4, 5].map((n) => makePlayer({ id: `p${n}`, number: String(n) }));

/** A 2 × 20 min game kicked off at wall time `t0`, live in the 1st half. */
function liveGame(t0 = 1_000_000, over: Partial<Game> = {}): Game {
  const g = makeGame(players, { status: 'live', ...over });
  g.marks.push({ type: 'start', period: 1, t: 0, wall: t0 });
  startClock(g, t0);
  return g;
}

/** Ends the 1st half at match time `endT` and starts the 2nd at wall time `wall`. */
function startSecondHalf(g: Game, endT: number, wall: number) {
  endPeriod(g, endT, wall);
  g.clock.period = 2;
  g.status = 'live';
  g.marks.push({ type: 'start', period: 2, t: endT, wall });
  startClock(g, wall);
}

afterEach(() => setLang('en'));

describe('match time', () => {
  it('counts only time while the clock runs', () => {
    const g = liveGame(0);
    expect(matchTimeAt(g, 5 * MIN)).toBe(5 * MIN);
    stopClock(g, 5 * MIN);
    expect(matchTimeAt(g, 9 * MIN)).toBe(5 * MIN); // paused
    startClock(g, 9 * MIN);
    expect(matchTimeAt(g, 10 * MIN)).toBe(6 * MIN);
  });
});

describe('game clock shown to the coach', () => {
  const g = makeGame(players, { periodMin: 20 });

  it('shows regular time, then extra time as "20:00 (+mm:ss)"', () => {
    expect(fmtInPeriod(g, 1, at('12:34'))).toBe('12:34');
    expect(fmtInPeriod(g, 1, at('20:00'))).toBe('20:00');
    expect(fmtInPeriod(g, 1, at('22:00'))).toBe('20:00 (+02:00)');
  });

  it('starts the 2nd half at 20:00 even if the 1st ran to 22:00', () => {
    const live = liveGame(0);
    startSecondHalf(live, at('22:00'), 30 * MIN);
    expect(fmtNowAt(live, 30 * MIN)).toBe('20:00');
    expect(fmtNowAt(live, 35 * MIN)).toBe('25:00');
    expect(fmtNowAt(live, 54 * MIN)).toBe('40:00 (+04:00)');
  });

  it('puts a time on the period boundary at the end of the earlier period, or the start of the later', () => {
    const live = liveGame(0);
    startSecondHalf(live, at('22:00'), 30 * MIN);
    expect(fmtAt(live, at('22:00'))).toBe('20:00 (+02:00)');
    expect(fmtAt(live, at('22:00'), true)).toBe('20:00');
    expect(fmtAt(live, at('23:00'))).toBe('21:00');
  });
});

describe('end of a period', () => {
  it('moves events logged after the end (during the break) to the end', () => {
    const g = liveGame(0);
    g.events.push(
      ev({ type: 'goal', playerId: 'p2', t: at('19:00') }),
      ev({ type: 'goal', playerId: 'p2', t: at('21:30') }),
    );
    endPeriod(g, at('20:30'), 21.5 * MIN);
    expect(g.events.map((e) => e.t)).toEqual([at('19:00'), at('20:30')]);
    expect(g.status).toBe('break');
    expect(g.clock).toMatchObject({ running: false, elapsedMs: at('20:30') });
    expect(g.marks.at(-1)).toMatchObject({ type: 'end', period: 1, t: at('20:30') });
  });

  it('finishes the game after the last period', () => {
    const g = liveGame(0, { periods: 1 });
    endPeriod(g, at('20:00'), 20 * MIN);
    expect(g.status).toBe('finished');
  });

  it('shows a half-time sub at the start of the next half', () => {
    const g = liveGame(0);
    const sub = ev({ type: 'sub', playerId: 'p2', inId: 'p5', t: at('21:00') });
    g.events.push(sub);
    endPeriod(g, at('21:00'), 21 * MIN);
    expect(timeOf(g, sub)).toBe('20:00');
    expect(timeOf(g, g.marks[1]!)).toBe('20:00 (+01:00)');
  });
});

describe('reminders and auto-stop', () => {
  it('does nothing before regular time is up', () => {
    expect(timeCheck(liveGame(0), 19 * MIN)).toEqual({ kind: 'none' });
  });

  it('reminds when time is up and then every 2 minutes, once each', () => {
    const g = liveGame(0);
    expect(timeCheck(g, 20 * MIN)).toEqual({ kind: 'remind', period: 1, n: 0, extraMin: 0 });
    g.alerted[1] = 0;
    expect(timeCheck(g, 21 * MIN)).toEqual({ kind: 'none' });
    expect(timeCheck(g, 22.5 * MIN)).toEqual({ kind: 'remind', period: 1, n: 1, extraMin: 2 });
  });

  it('stops the period automatically at regular time + the auto-stop limit', () => {
    const g = liveGame(0, { maxExtra: 5 });
    expect(timeCheck(g, 26 * MIN)).toEqual({ kind: 'auto-stop', period: 1, endT: 25 * MIN });
  });

  it('uses 10 minutes for games from before the auto-stop setting', () => {
    const g = liveGame(0);
    delete g.maxExtra;
    expect(timeCheck(g, 29 * MIN).kind).toBe('remind');
    expect(timeCheck(g, 30 * MIN)).toEqual({ kind: 'auto-stop', period: 1, endT: 30 * MIN });
  });
});

describe('"I forgot to press the button"', () => {
  it('ends the half when it really ended and re-times what was logged after it', () => {
    // Kick-off at wall 0; the coach forgot to end the 1st half and is still at 27:00.
    const g = liveGame(0);
    g.events.push(ev({ type: 'goal', playerId: 'p2', t: at('25:00') }));
    applyFix(g, 20, null, 27 * MIN);
    expect(g.status).toBe('break');
    expect(g.events[0]!.t).toBe(at('20:00'));
    expect(g.clock).toMatchObject({ running: false, elapsedMs: at('20:00') });
  });

  it('starts the 2nd half "5 minutes ago" and re-times events from their wall-clock time', () => {
    const g = liveGame(0);
    // Logged at wall 25:00 and 26:00, i.e. 3 and 4 minutes into a 2nd half that began at wall 22:00.
    g.events.push(
      { ...ev({ type: 'goal', playerId: 'p2', t: at('25:00') }), wall: 25 * MIN },
      { ...ev({ type: 'yellow', playerId: 'p3', t: at('26:00') }), wall: 26 * MIN },
    );
    g.alerted[2] = 3;
    applyFix(g, 20, 5, 27 * MIN);
    expect(g.status).toBe('live');
    expect(g.clock).toMatchObject({ period: 2, running: true, startedAt: 22 * MIN, elapsedMs: at('20:00') });
    expect(g.events.map((e) => fmtAt(g, e.t))).toEqual(['23:00', '24:00']);
    expect(fmtNowAt(g, 27 * MIN)).toBe('25:00');
    expect(g.alerted[2]).toBeUndefined();
  });

  it('cannot start a next period after the last one', () => {
    const g = liveGame(0, { periods: 1 });
    applyFix(g, 20, 5, 27 * MIN);
    expect(g.status).toBe('finished');
    expect(g.clock.running).toBe(false);
  });
});

describe('period label', () => {
  it('describes each state of the game', () => {
    const g = makeGame(players);
    expect(periodLabel(g)).toBe('Not started · 2 × 20 min');
    const live = liveGame(0);
    expect(periodLabel(live)).toBe('1st half');
    stopClock(live, MIN);
    expect(periodLabel(live)).toBe('1st half (paused)');
    endPeriod(live, MIN, MIN);
    expect(periodLabel(live)).toBe('Break after 1st half');
  });

  it('follows the language', () => {
    setLang('pt');
    expect(periodLabel(liveGame(0))).toBe('1ª parte');
  });
});
