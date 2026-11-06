// The report and player sheets as PDF files, shared (or downloaded).
import { ddmm, gameDetail, gameShort, playerFullName, statsSeason, teamStats } from '@/data/season';
import { SHEET_NAVY, statsSheet } from '@/data/report-sheet';
import { getTeam } from '@/data/queries';
import { download } from '@/shared/lib/device';
import { db } from '@/data/store';
import { LOGO_PX, teamLogoJpeg } from '@/data/logos';
import { pct } from '@/shared/lib/format';
import { gameLength, playerStats } from '@/domain/stats';
import { teamFull } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import type { Game, Player } from '@/domain/types';
import type { SheetRow } from '@/data/report-sheet';

// ---------- PDF report ----------
// A tiny PDF writer: the PDF's built-in Helvetica fonts (WinAnsi encoding, so
// Portuguese accents work), filled/stroked rectangles, lines and text.

// Glyph widths (per 1000 em) for character codes 32..126.
export const HELV_W: { regular: readonly number[]; bold: readonly number[] } = {
  regular: [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
    556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278,
    500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469,
    556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
    278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
  ],
  bold: [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
    556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278,
    556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584,
    556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556,
    333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
  ],
};
// Unicode -> WinAnsi for the few characters outside Latin-1 that we use.
export const WIN_ANSI: Record<number, number> = {
  0x2014: 0x97,
  0x2013: 0x96,
  0x2026: 0x85,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
};
export const WIN_W: Record<number, number> = {
  0x97: 1000,
  0x96: 556,
  0x85: 1000,
  0x91: 222,
  0x92: 222,
  0x93: 333,
  0x94: 333,
  0x95: 350,
  0xaa: 370,
  0xba: 365,
  0xb7: 278,
  0xa0: 278,
  0xb0: 400,
};

// Text as a string of WinAnsi byte values; anything else becomes "?".
export function winAnsi(s: unknown): string {
  let out = '';
  for (const ch of String(s)) {
    const c = ch.codePointAt(0) ?? 63;
    out += String.fromCharCode((c >= 32 && c < 127) || (c >= 160 && c <= 255) ? c : (WIN_ANSI[c] ?? 63));
  }
  return out;
}

export function glyphW(code: number, bold: boolean): number {
  const table = bold ? HELV_W.bold : HELV_W.regular;
  if (code >= 32 && code < 127) return table[code - 32] ?? 556;
  const win = WIN_W[code];
  if (win) return win;
  if (code >= 192) {
    const base = String.fromCharCode(code).normalize('NFD').charCodeAt(0);
    if (base === 105) return 278; // accented i is wider than a plain i
    if (base < 127) return table[base - 32] ?? 556;
  }
  return 556;
}

export function textWidth(s: unknown, size: number, bold: boolean): number {
  let w = 0;
  for (const c of winAnsi(s)) w += glyphW(c.charCodeAt(0), bold);
  return (w * size) / 1000;
}

/** Colours are '#rrggbb'; an empty fill or stroke draws nothing. */
type Colour = string | null | undefined;
export type TextOptions = {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  maxW?: number;
};
export type PdfDoc = {
  W: number;
  H: number;
  /** Starts a new page; drawing goes there. */
  page(): void;
  rect(x: number, y: number, w: number, h: number, fill: Colour, stroke?: Colour, lw?: number): void;
  line(x1: number, y1: number, x2: number, y2: number, color: string, lw: number): void;
  /** Draws text at baseline y; returns its width. */
  text(s: unknown, x: number, y: number, opts?: TextOptions): number;
  /** Draws a JPEG (its bytes, `pw` × `ph` pixels) in the box x, y (bottom left), w × h. */
  image(jpeg: Uint8Array, pw: number, ph: number, x: number, y: number, w: number, h: number): void;
  bytes(): Uint8Array<ArrayBuffer>;
};

export function pdfDoc({ W = 842, H = 595 } = {}): PdfDoc {
  // A4 landscape by default, in points
  const pages: string[][] = [];
  const images: { jpeg: Uint8Array; pw: number; ph: number }[] = [];
  let ops: string[] = [];
  const rgb = (hex: string): string =>
    [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const n = (v: number): number => +v.toFixed(2);

  return {
    W,
    H,
    page(): void {
      ops = [];
      pages.push(ops);
    },
    rect(x, y, w, h, fill, stroke, lw = 0.5): void {
      if (fill) ops.push(`${rgb(fill)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
      if (stroke) ops.push(`${rgb(stroke)} RG ${lw} w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
    },
    line(x1, y1, x2, y2, color, lw): void {
      ops.push(`${rgb(color)} RG ${lw} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
    },
    // Draws text at baseline y; returns its width. Too-long text gets an ellipsis.
    text(
      s,
      x,
      y,
      { size = 10, bold = false, color = '#000000', align = 'left', maxW = Infinity } = {},
    ): number {
      let str = String(s);
      if (textWidth(str, size, bold) > maxW) {
        while (str && textWidth(`${str}…`, size, bold) > maxW) str = str.slice(0, -1);
        str = `${str.trimEnd()}…`;
      }
      const w = textWidth(str, size, bold);
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      const body = winAnsi(str).replace(/[\\()]/g, '\\$&');
      ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${n(x0)} ${n(y)} Td (${body}) Tj ET`);
      return w;
    },
    image(jpeg, pw, ph, x, y, w, h): void {
      images.push({ jpeg, pw, ph });
      ops.push(`q ${n(w)} 0 0 ${n(h)} ${n(x)} ${n(y)} cm /Im${images.length - 1} Do Q`);
    },
    // The finished file as bytes. Objects: catalog, pages, 2 fonts, each page and its content,
    // then the images (JPEG, kept as they are: /DCTDecode).
    bytes(): Uint8Array<ArrayBuffer> {
      const objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + 2 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      ];
      const firstImage = 5 + 2 * pages.length;
      const xobjects = images.length
        ? ` /XObject << ${images.map((_, k) => `/Im${k} ${firstImage + k} 0 R`).join(' ')} >>`
        : '';
      pages.forEach((p, i) => {
        const stream = p.join('\n');
        objs.push(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjects} >> /Contents ${6 + 2 * i} 0 R >>`,
        );
        objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      });
      for (const im of images) {
        let bin = '';
        for (let i = 0; i < im.jpeg.length; i += 8192)
          bin += String.fromCharCode(...im.jpeg.subarray(i, i + 8192));
        objs.push(
          `<< /Type /XObject /Subtype /Image /Width ${im.pw} /Height ${im.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bin.length} >>\nstream\n${bin}\nendstream`,
        );
      }
      let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
      const offsets = objs.map((body, i) => {
        const at = out.length;
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
        return at;
      });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
      out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return Uint8Array.from(out, (c) => c.charCodeAt(0));
    },
  };
}

export function buildPdf(g: Game): Uint8Array<ArrayBuffer> {
  const sh = statsSheet(g);
  const pdf = pdfDoc();
  const M = 40;
  const GRID = '#a9bcb6';
  const FS = 9.5;
  const LH = 12;
  const { cols } = sh;
  const tableW = cols.reduce((n, c) => n + c.w, 0);
  const colX = cols.map((_, i) => M + cols.slice(0, i).reduce((n, c) => n + c.w, 0));

  let y = 0;
  const tableHeader = (): void => {
    cols.forEach((c, i) => {
      const x = colX[i] ?? M;
      pdf.rect(x, y - 20, c.w, 20, c.fill, GRID);
      pdf.text(c.title, x + c.w / 2, y - 13.5, {
        size: 9,
        bold: true,
        color: '#ffffff',
        align: 'center',
        maxW: c.w - 4,
      });
    });
    y -= 20;
  };
  const newPage = (): void => {
    pdf.page();
    y = pdf.H - M;
  };
  // One table row: cells is an array of line arrays, one per column.
  const row = (cells: SheetRow, { fill, bold = false }: { fill?: Colour; bold?: boolean } = {}): void => {
    const h = Math.max(26, Math.max(...cells.map((c) => c.length)) * LH + 14);
    if (y - h < M) {
      newPage();
      tableHeader();
    }
    cells.forEach((lines, i) => {
      const c = cols[i];
      const x = colX[i];
      if (!c || x == null) return; // a row has one cell per column
      pdf.rect(x, y - h, c.w, h, fill, GRID);
      const top = y - (h - lines.length * LH) / 2;
      lines.forEach((s, k) => {
        const base = top - k * LH - 9;
        if (c.left) pdf.text(s, x + 7, base, { size: FS, bold, maxW: c.w - 12 });
        else pdf.text(s, x + c.w / 2, base, { size: FS, bold, align: 'center', maxW: c.w - 6 });
      });
    });
    y -= h;
  };

  newPage();
  // The club's logo, top right, when this phone has it.
  const logo = teamLogoJpeg(g.teamId);
  const LOGO = 44;
  if (logo) pdf.image(logo, LOGO_PX, LOGO_PX, M + tableW - LOGO, y - LOGO + 6, LOGO, LOGO);
  pdf.text(sh.title, M, y - 14, {
    size: 15,
    bold: true,
    color: SHEET_NAVY,
    maxW: tableW - (logo ? LOGO + 10 : 0),
  });
  y -= 36;
  for (const [k, v, col] of sh.meta) {
    const x = colX[col] ?? M;
    const w = pdf.text(k, x, y, { size: 10, bold: true, color: '#333333' });
    pdf.text(v, x + w + 4, y, { size: 10, color: '#333333', maxW: 360 });
  }
  y -= 14;
  tableHeader();
  sh.rows.forEach((cells, i) => row(cells, { fill: i % 2 ? '#dce8e4' : null }));
  const lineY = y;
  row(sh.total, { fill: '#eef2f4', bold: true });
  pdf.line(M, lineY, M + tableW, lineY, SHEET_NAVY, 1.2);
  return pdf.bytes();
}

/** Letters and digits only (accents dropped), for file names. */
const clean = (s: string | null | undefined): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[^A-Za-z0-9]/g, '');

export function pdfFileName(g: Game): string {
  const parts = [
    clean(g.club),
    clean(g.team),
    g.round ? `${t('fileRound')}${g.round}` : g.date,
    t('fileStats'),
  ];
  return `${parts.filter(Boolean).join('_')}.pdf`;
}

export const exportPdf = (g: Game): Promise<void> =>
  shareFile(new File([buildPdf(g)], pdfFileName(g), { type: 'application/pdf' }));

// Share a file (WhatsApp and the like) where the phone can, else download it.
export async function shareFile(file: File): Promise<void> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  download(file.name, file, file.type);
}

// A player's stats sheet for the season (A4 portrait), to send to the family.
export const PDF_GREEN = '#1d5c3f';

/** The player, or an error (the sheet is only offered for players that exist). */
function playerOf(playerId: string): Player {
  const p = db.players.find((x) => x.id === playerId);
  if (!p) throw new Error(`No player ${playerId}`);
  return p;
}

export function buildPlayerPdf(playerId: string): Uint8Array<ArrayBuffer> {
  const p = playerOf(playerId);
  const tm = getTeam(p.teamId);
  const season = statsSeason(p.teamId);
  const st = teamStats(p.teamId, season);
  const ps = st.players.find((x) => x.p.id === playerId) || playerStats(p, st.games);
  const pdf = pdfDoc({ W: 595, H: 842 });
  const M = 40;
  const W = pdf.W - 2 * M;
  const INK = '#1b1f23';
  const MUTED = '#5b636b';
  const TILE = '#e6ecea';
  let y: number;

  pdf.page();
  // Header band
  const HB = 118;
  pdf.rect(0, pdf.H - HB, pdf.W, HB, PDF_GREEN);
  const logo = teamLogoJpeg(p.teamId);
  if (logo) {
    // On a white tile, so a logo on a transparent background still reads on the green band.
    pdf.rect(pdf.W - M - 74, pdf.H - HB + 22, 74, 74, '#ffffff');
    pdf.image(logo, LOGO_PX, LOGO_PX, pdf.W - M - 70, pdf.H - HB + 26, 66, 66);
  }
  const headW = logo ? W - 84 : W; // the header's text stops before the logo
  y = pdf.H - 36;
  pdf.text((tm ? teamFull(tm.club, tm.name) : '').toUpperCase(), M, y, {
    size: 10,
    color: '#cfe3d8',
    maxW: headW,
  });
  y -= 32;
  pdf.text(playerFullName(p).toUpperCase(), M, y, { size: 24, bold: true, color: '#ffffff', maxW: headW });
  y -= 22;
  const first = st.games[0]?.g;
  const last = st.games[st.games.length - 1]?.g;
  const range = first && last ? t('statRange', { a: ddmm(first), b: ddmm(last) }) : '';
  pdf.text([season && `${t('pdfSeason')} ${season}`, range].filter(Boolean).join(' · '), M, y, {
    size: 11,
    color: '#ffffff',
    maxW: headW,
  });

  y = pdf.H - HB - 30;
  if (p.number) {
    pdf.text(t('statNumber', { n: p.number }), M, y, { size: 11, color: INK });
    y -= 14;
  }

  // Stat tiles, three per row
  const gap = 10;
  const tw = (W - 2 * gap) / 3;
  const th = 56;
  const tiles: [string, string | null, string?][] = [
    [t('statCalled'), `${pct(ps.called, ps.teamGames)}%`, `${ps.called} / ${ps.teamGames}`],
    [t('statGames'), `${ps.played} / ${ps.teamGames}`],
    [t('statStarts'), String(ps.starts)],
    [t('statMinutes'), `${ps.minutes}'`],
    [t('statGoals'), String(ps.goals)],
    [t('statCards'), null],
  ];
  tiles.forEach(([label, value, sub], i) => {
    const x = M + (i % 3) * (tw + gap);
    const top = y - Math.floor(i / 3) * (th + gap);
    pdf.rect(x, top - th, tw, th, TILE);
    pdf.text(label.toUpperCase(), x + 10, top - 16, { size: 8, bold: true, color: PDF_GREEN, maxW: tw - 20 });
    if (value == null) {
      // cards: a yellow and a red card, each with its count
      (
        [
          [ps.yellow, '#f5c518'],
          [ps.red, '#d63a3a'],
        ] as const
      ).forEach(([count, fill], k) => {
        const cx = x + 10 + k * 54;
        pdf.rect(cx, top - 46, 13, 18, fill);
        pdf.text(String(count), cx + 20, top - 42, { size: 22, bold: true, color: INK });
      });
      return;
    }
    const vw = pdf.text(value, x + 10, top - 42, { size: 22, bold: true, color: INK, maxW: tw - 20 });
    if (sub) pdf.text(sub, x + 16 + vw, top - 42, { size: 10, color: MUTED });
  });
  y -= 2 * th + gap + 30;

  // Minutes in each game
  pdf.text(t('statMinPerGame').toUpperCase(), M, y, { size: 9, bold: true, color: INK });
  y -= 18;
  const CH = 130;
  const axisW = 24;
  const top = Math.max(1, ...ps.rows.map((r) => Math.max(gameLength(r.g), r.s ? r.s.played / 60000 : 0)));
  const base = y - CH;
  for (let k = 0; k <= 4; k++) {
    const ly = base + (CH * k) / 4;
    pdf.line(M + axisW, ly, M + W, ly, '#d5dcd9', 0.5);
    pdf.text(`${Math.round((top * k) / 4)}'`, M + axisW - 4, ly - 2.5, {
      size: 7,
      color: MUTED,
      align: 'right',
    });
  }
  const n = ps.rows.length;
  const slot = (W - axisW) / Math.max(n, 1);
  const bw = Math.min(26, slot * 0.6);
  const every = Math.ceil(24 / slot); // label every k-th game when they would overlap
  ps.rows.forEach((r, i) => {
    const cx = M + axisW + slot * (i + 0.5);
    const m = r.played && r.s ? Math.floor(r.s.played / 60000) : 0;
    const h = Math.min(CH, (CH * m) / top);
    if (h > 0) pdf.rect(cx - bw / 2, base, bw, h, PDF_GREEN);
    if (i % every === 0) {
      if (slot >= 14)
        pdf.text(r.s ? `${m}'` : '–', cx, base + h + 4, { size: 7, bold: true, color: INK, align: 'center' });
      pdf.text(ddmm(r.g), cx, base - 11, { size: 7, color: MUTED, align: 'center' });
    }
  });
  y = base - 40;

  // Games list
  const heading = (): void => {
    pdf.text(t('statGamesList').toUpperCase(), M, y, { size: 12, bold: true, color: INK });
    pdf.line(M, y - 7, M + 40, y - 7, PDF_GREEN, 2);
    y -= 24;
  };
  heading();
  for (const r of ps.rows) {
    if (y < M + 10) {
      pdf.page();
      y = pdf.H - M - 10;
      heading();
    }
    const x0 = M;
    const w1 = pdf.text(ddmm(r.g), x0, y, { size: 10, bold: true, color: INK });
    const w2 = pdf.text(gameShort(r.g, r.d), x0 + w1 + 10, y, { size: 10, color: INK, maxW: 240 });
    pdf.text(`·  ${gameDetail(r)}`, x0 + w1 + 18 + w2, y, {
      size: 10,
      color: r.played ? INK : MUTED,
      maxW: W - w1 - w2 - 20,
    });
    y -= 18;
  }
  return pdf.bytes();
}

export function playerPdfName(playerId: string): string {
  const p = playerOf(playerId);
  const tm = getTeam(p.teamId);
  const season = statsSeason(p.teamId).replace('/', '-');
  return `${[clean(tm?.club), clean(tm?.name), clean(playerFullName(p)), t('fileStats'), season].filter(Boolean).join('_')}.pdf`;
}

export const exportPlayerPdf = (playerId: string): Promise<void> =>
  shareFile(new File([buildPlayerPdf(playerId)], playerPdfName(playerId), { type: 'application/pdf' }));
