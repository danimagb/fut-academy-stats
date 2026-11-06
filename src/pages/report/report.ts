// The report screen: a game's stats sheet, as it will look in the PDF.
import { currentGame } from '@/data/queries';
import { exportPdf } from '@/features/share-pdf/share-pdf';
import { statsSheet } from '@/data/report-sheet';
import { notFound } from '@/shared/ui/not-found';
import { fmtNow } from '@/data/live';
import { readOnlyGame } from '@/data/access';
import { readOnlyPill } from '@/features/team-access/read-only';
import { derive, getGame } from '@/data/queries';
import { fmtDate } from '@/domain/titles';
import { scoreHtml } from '@/features/score/score';
import { bar } from '@/shared/ui/bar';
import { esc } from '@/shared/lib/html';
import { teamLogoSrc } from '@/data/logos';
import { clubLogo } from '@/features/club-logo/club-logo';
import { matchTitle } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';
import type { Sheet, SheetCol } from '@/data/report-sheet';
import type { Game } from '@/domain/types';

/** Date, format and team size of a game (escaped). */
export const formatLine = (g: Game): string =>
  `${esc(fmtDate(g))} · ${esc(g.formatId === 'Custom' ? t('custom') : g.formatId)} · ${t('gkPlus', { n: g.field })}`;

/** The PDF's first page as HTML; `logo`: the club's logo (top right, as in the PDF). */
export function sheetPreview(sh: Sheet, logo: string | null = null): string {
  const S = 1.3;
  const x = (i: number): number => Math.round(sh.cols.slice(0, i).reduce((n, c) => n + c.w, 0) * S);
  const cell = (lines: string[], c: SheetCol | undefined): string =>
    `<td class="${c?.left ? 'l' : ''}">${lines.map(esc).join('<br>')}</td>`;
  return `<div class="pdf-preview"><div class="pp-page" style="width:${x(sh.cols.length) + 40}px">
    ${logo ? `<img class="pp-logo" src="${esc(logo)}" alt="">` : ''}
    <div class="pp-title">${esc(sh.title)}</div>
    <div class="pp-meta">${sh.meta.map(([k, v, col]) => `<span style="left:${x(col)}px"><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>
    <table class="pp-table" style="width:${x(sh.cols.length)}px">
      <colgroup>${sh.cols.map((c) => `<col style="width:${Math.round(c.w * S)}px">`).join('')}</colgroup>
      <thead><tr>${sh.cols.map((c) => `<th style="background:${c.fill}">${esc(c.title)}</th>`).join('')}</tr></thead>
      <tbody>${sh.rows.map((r) => `<tr>${r.map((lines, i) => cell(lines, sh.cols[i])).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr>${sh.total.map((lines, i) => cell(lines, sh.cols[i])).join('')}</tr></tfoot>
    </table>
  </div></div>`;
}

export function viewReport(id: string | undefined): void {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);

  main.innerHTML = `
    ${bar(t('gameReport'), `#/game/${g.id}`, '', readOnlyGame(g) ? readOnlyPill() : '')}
    <section class="scoreboard">
      ${clubLogo(teamLogoSrc(g.teamId), 'lg')}
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted small">${formatLine(g)}</div>
      <div class="score big">${scoreHtml(g, d, ' – ', true)}</div>
      <div class="muted">${t('gameTime', { t: fmtNow(g) })}${g.status === 'finished' ? '' : ` · <span class="warn">${t('inProgress')}</span>`}</div>
    </section>

    <button class="btn primary block" data-action="pdf">${t('pdf')}</button>
    ${readOnlyGame(g) ? '' : `<button class="btn ghost block" data-action="edit-info">${t('gameInfo')}</button>`}
    <p class="hint">${t('reportHint')}</p>
    ${sheetPreview(statsSheet(g), teamLogoSrc(g.teamId))}`;
}

export const reportActions = {
  pdf: () => {
    const g = currentGame();
    if (g) void exportPdf(g);
  },
};

/** The report screen: its screen and actions (app/ registers them at startup). */
export const reportPage = { views: { report: viewReport }, actions: reportActions };
