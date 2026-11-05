import { describe, expect, it } from 'vitest';
import { fmtClock, fmtMins, isoDate, mmss, pad, pct } from './format';

describe('format helpers', () => {
  it('pads to two digits', () => {
    expect(pad(7)).toBe('07');
    expect(pad(12)).toBe('12');
  });

  it('shows a clock as mm:ss, never negative', () => {
    expect(fmtClock(0)).toBe('00:00');
    expect(fmtClock(65_999)).toBe('01:05');
    expect(fmtClock(20 * 60_000)).toBe('20:00');
    expect(fmtClock(-5000)).toBe('00:00');
  });

  it('shows whole minutes played', () => {
    expect(fmtMins(59_999)).toBe("0'");
    expect(fmtMins(125_000)).toBe("2'");
  });

  it('shows report times without a leading zero on the minutes', () => {
    expect(mmss(65_000)).toBe('1:05');
    expect(mmss(22 * 60_000)).toBe('22:00');
  });

  it('formats a local date for date inputs', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('rounds percentages and handles a zero total', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(2, 3)).toBe(67);
    expect(pct(1, 0)).toBe(0);
  });
});
