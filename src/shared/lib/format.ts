// Small number/time formatting helpers (no app state).

/** Two digits: 7 → "07". */
export const pad = (n: number): string => String(n).padStart(2, '0');

/** Milliseconds as a clock, "mm:ss" (negative values show as 00:00). */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Whole minutes played, as on the game screen: 125000 → "2'". */
export const fmtMins = (ms: number): string => `${Math.floor(ms / 60000)}'`;

/** Minutes and seconds without a leading zero on the minutes: 65000 → "1:05" (report/PDF). */
export function mmss(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** A local date as "YYYY-MM-DD" (the format of <input type="date">). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `a` as a whole percentage of `b` (0 when `b` is 0). */
export const pct = (a: number, b: number): number => (b ? Math.round((100 * a) / b) : 0);
