// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// The report's stats sheet (shared by the PDF and its preview on the report screen). Moved from
// app/legacy.js.
import { derive, teamPlayers } from '@/data/queries';
import { db } from '@/data/store';
import { mmss } from '@/shared/lib/format';
import { fmtAt } from '@/domain/clock';
import { gameTeam, matchTitle, seasonOf } from '@/domain/titles';
import { locale, t } from '@/shared/i18n/i18n';

// Stints as game-clock labels: entered (start of the later period on a boundary) – left.
export const stintLabels = (g, s, sep) =>
  s.intervals.map(([a, b]) => `${fmtAt(g, a, true)}${sep}${fmtAt(g, b)}`);

export const SHEET_NAVY = '#1f3a5a';

// The stats sheet table, shared by the PDF and its preview on the report screen.
// Column widths are in PDF points; cells are arrays of lines.
// Full name for the report: the player's current one (so fixing a name also fixes
// past games), else the one saved with the game, else the shirt name.
export function fullName(g, id) {
  return db.players.find((p) => p.id === id)?.fullName || g.names[id].fullName || g.names[id].name;
}

export function statsSheet(g) {
  const d = derive(g);
  const cols = [
    { title: t('pdfNo'), w: 32, fill: SHEET_NAVY },
    { title: t('pdfPlayer'), w: 170, fill: SHEET_NAVY, left: true },
    { title: t('pdfShirt'), w: 42, fill: SHEET_NAVY },
    { title: t('pdfStarter'), w: 62, fill: SHEET_NAVY },
    { title: t('pdfSub'), w: 62, fill: SHEET_NAVY },
    { title: t('pdfStints'), w: 154, fill: '#3d8b40' },
    { title: t('pdfMinutes'), w: 60, fill: SHEET_NAVY },
    { title: t('pdfGoals'), w: 52, fill: SHEET_NAVY },
    { title: t('pdfYellow'), w: 62, fill: '#e3b008' },
    { title: t('pdfRed'), w: 66, fill: '#c0392b' },
  ];

  // Players who played, then unused subs, then team players not called up;
  // alphabetical within each group, like the club's sheet.
  const squad = g.squad.map((id) => ({
    p: g.names[id],
    full: fullName(g, id),
    s: d.stats[id],
    starter: g.starters.includes(id),
  }));
  const notCalled = (g.teamId ? teamPlayers(g.teamId) : [])
    .filter((p) => !g.squad.includes(p.id))
    .map((p) => ({ p, full: p.fullName || p.name, s: null }));
  const group = (r) => (!r.s ? 2 : r.s.intervals.length ? 0 : 1);
  const players = [...squad, ...notCalled].sort(
    (a, b) => group(a) - group(b) || a.full.localeCompare(b.full, locale()),
  );
  const dash = '—';
  const rows = players.map((r, i) => {
    const played = group(r) === 0;
    return [
      [String(i + 1)],
      [r.full],
      [r.p.number || ''],
      [r.s && r.starter ? 'X' : ''],
      [r.s && !r.starter ? 'X' : ''],
      played ? stintLabels(g, r.s, ' – ') : [r.s ? t('didNotPlay') : t('notCalled')],
      [played ? mmss(r.s.played) : dash],
      [played ? String(r.s.goals) : dash],
      [played ? String(r.s.yellow) : dash],
      [played ? String(r.s.red) : dash],
    ];
  });
  const sum = (k) => String(squad.reduce((n, r) => n + r.s[k], 0));
  const [yy, mo, dd] = String(g.date).split('-');

  return {
    title: [gameTeam(g), t('pdfTitle'), seasonOf(g.date) && `${t('pdfSeason')} ${seasonOf(g.date)}`]
      .filter(Boolean)
      .join(' — '),
    // [label, value, column it lines up with]
    meta: [
      [t('pdfGame'), matchTitle(g), 0],
      dd && [t('pdfDate'), `${dd}/${mo}/${yy}`, 6],
      g.round && [t('pdfRound'), g.round, 8],
    ].filter(Boolean),
    cols,
    rows,
    total: [
      [''],
      [t('pdfTotal')],
      [''],
      [''],
      [''],
      [''],
      [''],
      [sum('goals')],
      [sum('yellow')],
      [sum('red')],
    ],
  };
}

// The PDF page as HTML, scaled up a little for the phone screen.
