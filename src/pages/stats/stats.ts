// The stats page (a team's season) and a player's sheet.
import { setStatsSeason, setStatsTeam } from '@/data/season';
import { exportPlayerPdf } from '@/features/share-pdf/share-pdf';
import { rerender } from '@/shared/lib/rerender';
import {
  ddmm,
  gameDetail,
  gameShort,
  playerFullName,
  statsSeason,
  statsSeasons,
  statsTeam,
  teamStats,
} from '@/data/season';
import { notFound } from '@/shared/ui/not-found';
import { getTeam } from '@/data/queries';
import { plural } from '@/shared/i18n/i18n';
import { bar } from '@/shared/ui/bar';
import { db } from '@/data/store';
import { pct } from '@/shared/lib/format';
import { esc } from '@/shared/lib/html';
import { gameLength, playerStats, resultOf } from '@/domain/stats';
import { teamFull, teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';
import { seasonPicker, teamPicker } from '@/features/team-filter/team-filter';
import { crest } from '@/features/club-logo/club-logo';
import { teamCrest } from '@/data/logos';
import type { PlayerSeason } from '@/domain/stats';

// ---------- Views: stats (per player, over a season) ----------
// Worked out from the finished games of a team, nothing extra is stored. A player counts as
// called up when they were in the squad, and as having played when they had time on the pitch.

// Team (and season) pickers shared by the stats page and a player's sheet.
export function statsFilters(teamId: string, season: string, withTeams: boolean): string {
  const seasons = statsSeasons(teamId);
  const pickers = [
    withTeams && db.teams.length > 1
      ? teamPicker({ action: 'stats-team', value: teamId, crestHtml: crest(teamCrest(teamId)) })
      : '',
    seasons.length > 1 ? seasonPicker('stats-season', seasons, season) : '',
  ].filter(Boolean);
  return pickers.length ? `<div class="pickers">${pickers.join('')}</div>` : '';
}

export function viewStats(): void {
  const teamId = statsTeam();
  if (!teamId) {
    main.innerHTML = `${bar(t('tabStats'))}<p class="empty">${t('statsNoTeams')}</p>
      <a class="btn primary block" href="#/teams">${t('teamsBtn', { n: 0 })}</a>`;
    return;
  }
  const season = statsSeason(teamId);
  const st = teamStats(teamId, season);
  const { record: r } = st;
  const head = `<div class="stat-row head" aria-hidden="true"><span></span><span>${t('pdfPlayer')}</span>
    <span>${t('statGames')}</span><span>${t('statMin')}</span><span>${t('statGoals')}</span><span>🟨/🟥</span></div>`;
  const team = getTeam(teamId);
  const rowHtml = (ps: PlayerSeason): string => `<li><a class="stat-row" href="#/player/${ps.p.id}">
    <span class="shirt sm">${esc(ps.p.number) || '–'}</span>
    <span class="name">${esc(ps.p.name)}</span>
    <span>${ps.played}<small>/${ps.teamGames}</small></span>
    <span>${ps.minutes}'</span>
    <span>${ps.goals}</span>
    <span>${ps.yellow}/${ps.red}</span>
  </a></li>`;
  main.innerHTML = `
    ${bar(t('tabStats'))}
    ${statsFilters(teamId, season, true)}
    ${
      st.games.length
        ? `
      <section class="card stats-summary">
        <div class="grow">
          <strong>${team ? esc(teamLabel(team)) : ''}</strong>
          <div class="muted small">${t('pdfSeason')} ${esc(season)} · ${plural('statGamesN', st.games.length)}</div>
        </div>
        <div class="right">
          <div class="record"><span class="w">${t('statW', { n: r.w })}</span> <span class="d">${t('statD', { n: r.d })}</span> <span class="l">${t('statL', { n: r.l })}</span></div>
          <div class="muted small">${t('statGoalsFor', { f: r.gf, a: r.ga })}</div>
        </div>
      </section>
      ${
        st.players.length
          ? `<ul class="list stat-table">${head}${st.players.map(rowHtml).join('')}</ul>
        <p class="hint">${t('statsHint')}</p>`
          : `<p class="empty">${t('noPlayers')}</p>`
      }`
        : `<p class="empty">${t('statsNoGames')}</p>`
    }`;
}

export function viewPlayer(id: string | undefined): void {
  const p = db.players.find((x) => x.id === id);
  if (!p) return notFound();
  const tm = getTeam(p.teamId);
  const season = statsSeason(p.teamId);
  const st = teamStats(p.teamId, season);
  const ps = st.players.find((x) => x.p.id === id) || playerStats(p, st.games);
  const tile = (label: string, value: string | number, sub = ''): string =>
    `<div class="tile"><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

  // Minutes in each game: one bar per game, as tall as the share of the game played.
  const top = Math.max(1, ...ps.rows.map((r) => Math.max(gameLength(r.g), r.s ? r.s.played / 60000 : 0)));
  const bars = ps.rows
    .map((r) => {
      const m = r.played && r.s ? Math.floor(r.s.played / 60000) : 0;
      const cls = !r.s ? 'out' : !r.played ? 'dnp' : '';
      const h = Math.min(100, (100 * m) / top);
      return `<div class="bar-col ${cls}" title="${esc(gameShort(r.g, r.d))}">
      <div class="bar-area"><div class="bar-fill" style="height:${h}%"></div><span class="v" style="bottom:calc(${h}% + 2px)">${r.s ? `${m}'` : '–'}</span></div>
      <span class="x">${ddmm(r.g)}</span>
    </div>`;
    })
    .join('');
  // Y axis like the PDF: 0', a quarter, half, three quarters and the top, with a gridline at each.
  const ticks = [0, 1, 2, 3, 4];
  const chart = `<div class="minutes-chart">
    <div class="y-axis" aria-hidden="true">${ticks.map((k) => `<span style="bottom:${k * 25}%">${Math.round((top * k) / 4)}'</span>`).join('')}</div>
    <div class="chart-scroll"><div class="chart-inner">
      <div class="grid" aria-hidden="true">${ticks.map((k) => `<i style="bottom:${k * 25}%"></i>`).join('')}</div>
      ${bars}
    </div></div>
  </div>`;

  const gamesHtml = ps.rows
    .slice()
    .reverse()
    .map(
      (r) => `<li><a class="card game ${resultOf(r.d)}" href="#/report/${r.g.id}">
    <div class="grow">
      <strong>${esc(gameShort(r.g, r.d))}</strong>
      <div class="muted small">${esc(ddmm(r.g))}${r.g.round ? ` · ${t('roundN', { n: esc(r.g.round) })}` : ''}</div>
    </div>
    <div class="right small ${r.played ? '' : 'muted'}">${esc(gameDetail(r))}</div>
  </a></li>`,
    )
    .join('');

  main.innerHTML = `
    ${bar(esc(p.name), '#/stats')}
    ${statsFilters(p.teamId, season, false)}
    <section class="player-head">
      <div class="muted small">${esc(tm ? teamFull(tm.club, tm.name) : '')}</div>
      <h2>${esc(playerFullName(p))}</h2>
      <div class="small">${[p.number ? t('statNumber', { n: esc(p.number) }) : '', season ? `${t('pdfSeason')} ${esc(season)}` : ''].filter(Boolean).join(' · ')}</div>
    </section>
    ${
      st.games.length
        ? `
      <div class="tiles">
        ${tile(t('statCalled'), `${pct(ps.called, ps.teamGames)}%`, `${ps.called} / ${ps.teamGames}`)}
        ${tile(t('statGames'), `${ps.played} / ${ps.teamGames}`)}
        ${tile(t('statStarts'), ps.starts)}
        ${tile(t('statMinutes'), `${ps.minutes}'`)}
        ${tile(t('statGoals'), ps.goals)}
        ${tile(t('statCards'), `<span class="yc">${ps.yellow}</span> <span class="rc">${ps.red}</span>`)}
      </div>
      <h2>${t('statMinPerGame')}</h2>
      ${chart}
      <button class="btn primary block" data-action="player-pdf" data-id="${p.id}">${t('pdf')}</button>
      <h2>${t('statGamesList')}</h2>
      <ul class="list">${gamesHtml}</ul>`
        : `<p class="empty">${t('statsNoGames')}</p>`
    }`;
}

export const statsActions = {
  'player-pdf': ({ id }: DOMStringMap) => {
    if (id) void exportPlayerPdf(id);
  },
  'stats-team': ({ id }: DOMStringMap) => {
    setStatsTeam(id ?? '');
    rerender();
  },
  'stats-season': ({ id }: DOMStringMap) => {
    setStatsSeason(id ?? '');
    rerender();
  },
};

/** The stats page and a player's sheet: screens and actions (app/ registers them at startup). */
export const statsPage = { views: { stats: viewStats, player: viewPlayer }, actions: statsActions };
