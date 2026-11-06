import { undoBtn, checkTime, doSub, movePlayer, describe } from '@/features/live-game/live-game';
import { addEvent, applyFix, endPeriodAt, fmtNow, formationOf, matchTime, startClock } from '@/data/live';
import { teamOpen, openAddPlayer, teamPage } from '@/pages/team/team';
import { profilePage } from '@/pages/profile/profile';
import { initTheme } from '@/features/theme-switch/theme';
import { initLanguage } from '@/features/language-switch/language';
import { watchAuth, sendCode, verifyCode, signInPassword, setPassword } from '@/features/sign-in/sign-in';
import { uploadTeams, offerUpload } from '@/features/upload-teams/upload-teams';
import { showSyncStatus } from '@/features/sync-status/sync-status';
import { adminDo } from '@/pages/admin/admin';
import { adminPage } from '@/pages/admin/admin';
import { $, $$ } from '@/shared/lib/dom';
import { remote, q, loadPeople, addCoach } from '@/features/team-people/team-people';
import { readOnlyGame, readOnlyTeam, writableTeams } from '@/data/access';
import { readOnlyPill, refuseReadOnly } from '@/features/team-access/read-only';
import { askPersistence, save } from '@/data/save';
import { derive, getGame, getTeam, teamPlayers } from '@/data/queries';
import { canSync, canUpload, cloud, sb, syncNow } from '@/data/session';
import { fmtDate } from '@/domain/titles';
import { plural } from '@/shared/i18n/i18n';
import { setRerender } from '@/shared/lib/rerender';
import { formHandler, installActionListener, registerActions, registerForms } from '@/app/actions';
import { addViews, onRender, render, route, setFallbackView } from '@/app/router';
import { gamesPage, viewGames } from '@/pages/games/games';
import { gamesTeam } from '@/data/prefs';
import { scoreHtml } from '@/features/score/score';
import { keepScreenOn } from '@/app/wake-lock';
import { buzz, download } from '@/shared/lib/device';
import { bar, closeMenus } from '@/shared/ui/bar';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { closeSheet, openSheet } from '@/shared/ui/sheet';
import { toast } from '@/shared/ui/toast';
import { configureSync, localTeams, roleOf } from '@/data/sync';
import { uid } from '@/shared/lib/id';
import {
  RECORD_KINDS,
  db,
  dropInvalid,
  initStore,
  isCloudTeam,
  loadRejected,
  normalize,
  setDb,
  syncGameTeams,
  teamIdOf,
} from '@/data/store';
import { checkIncoming } from '@/domain/validate';
import { fmtMins, isoDate, mmss, pad, pct } from '@/shared/lib/format';
import { esc } from '@/shared/lib/html';
import { FORMATS, formationsFor } from '@/domain/formats';
import { fmtAt, fmtInPeriod, periodLabel, periodStart, timeOf } from '@/domain/clock';
import { slotCoords, startLineup } from '@/domain/pitch';
import { byNumber, pname, sortIds } from '@/domain/players';
import {
  gameLength,
  playerStats,
  resultOf,
  statsSeasons as seasonsOfTeam,
  teamStats as teamSeason,
} from '@/domain/stats';
import { gameTeam, matchTitle, periodName, seasonOf, teamFull, teamLabel } from '@/domain/titles';
import { locale, t } from '@/shared/i18n/i18n';

// ---------- Config ----------

const STATS_TEAM_KEY = 'fut-academy-stats.statsTeam'; // team picked on the stats page
const STATS_SEASON_KEY = 'fut-academy-stats.statsSeason'; // season picked on the stats page (e.g. '2026/2027')

// ---------- Language ----------

initLanguage();

// ---------- Theme ----------

initTheme();

// ---------- Storage ----------

initStore();

// ---------- Helpers ----------

const main = $('#main');

const formatLine = (g) =>
  `${esc(fmtDate(g))} · ${esc(g.formatId === 'Custom' ? t('custom') : g.formatId)} · ${t('gkPlus', { n: g.field })}`;

// ---------- Clock ----------
// Match time (e.t, marks, clock) counts only time actually played, so minutes
// played add up. The clock shown to the coach restarts every period at its
// regular start (2nd half at 20:00), and extra time shows as "20:00 (+02:00)".

// ---------- Routing ----------

let draft = null;

addViews({
  new: viewEdit,
  edit: viewEdit,
  game: viewGame,
  report: viewReport,
  stats: viewStats,
  player: viewPlayer,
});
// Screens already moved to pages/ (see docs/typescript-plan.md, step 6).
addViews(gamesPage.views);
addViews(adminPage.views);
addViews(profilePage.views);
addViews(teamPage.views);
setFallbackView(viewGames);
onRender({
  before: () => {
    renderPending = false;
    closeSheet();
  },
  after: ({ view }) => {
    renderTabbar(view);
    updateWakeLock();
  },
});

// ---------- Bottom tab bar ----------

const TAB_ICONS = {
  team: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/>',
  matches:
    '<circle cx="12" cy="12" r="9"/><path class="f" d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5z"/><path d="M12 3v4.5M20.6 9.2l-4.3 1.4M17.3 19.4l-2.6-3.8M6.7 19.4l2.6-3.8M3.4 9.2l4.3 1.4"/>',
  stats: '<path d="M5 20V12M10 20V5M15 20V9M20 20V14"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  admin: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
};

function renderTabbar(view) {
  const active = ['teams', 'team', 'players'].includes(view)
    ? 'team'
    : ['stats', 'player'].includes(view)
      ? 'stats'
      : ['profile', 'admin'].includes(view)
        ? view
        : 'matches';
  const isAdmin = !!(cloud.session && cloud.account?.isAdmin && !cloud.needsPassword);
  const myTeam = db.teams.length === 1 ? `#/team/${db.teams[0].id}` : '#/teams';
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[k]}</svg>`;
  const tab = (k, label, attrs) =>
    `<${attrs.startsWith('href') ? 'a' : 'button'} class="tab ${active === k ? 'on' : ''}" ${attrs}>${icon(k)}<span>${label}</span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
  $('#tabbar').innerHTML =
    tab('team', t('tabTeam'), `href="${myTeam}"`) +
    tab('matches', t('tabMatches'), 'href="#/games"') +
    tab('stats', t('tabStats'), 'href="#/stats"') +
    tab('profile', t('tabProfile'), 'href="#/profile"') +
    (isAdmin ? tab('admin', t('tabAdmin'), 'href="#/admin" data-admin-link') : '');
  $('#tabbar').classList.toggle('five', isAdmin);
}

window.addEventListener('hashchange', () => {
  draft = null;
  Object.assign(remote, { people: null, admin: null }); // online screens load again when opened
  render();
  window.scrollTo(0, 0);
});

function notFound() {
  main.innerHTML = `${bar(t('notFound'), '#/games')}<p class="empty">${t('gameGone')}</p>`;
}

// ---------- Views: games list ----------

watchAuth();

// ---------- Cloud sync ----------
// Local-first: the app keeps reading and writing `db` + save(). In the background, syncNow()
// uploads the changes of cloud teams (push), then downloads what changed in the cloud (pull).
// Only cloud teams (in db.sync.teams) and their players and games are synced; teams on this
// phone never leave it. Failures only show in the quiet status line on Profile.
//  * push (teams where this user is director): upsert `dirty` records, then soft-delete the
//    records in `db.deleted` (deleted_at). `dirty` is cleared only if the record didn't change
//    while it was being sent.
//  * pull: memberships first (teams this user was removed from leave the phone), then rows
//    changed since the last pull (with some overlap). Local changes not uploaded yet win over
//    the cloud for directors; for coaches the cloud always wins.
//  * Last write wins per record (a live game logged on two phones at once overwrites itself).

configureSync({
  client: sb,
  canSync,
  userId: () => cloud.session?.user?.id ?? null,
  request: () => syncNow(),
  onStatus: () => showSyncStatus(),
  onChange: () => renderSoon(),
  onRejected: (n) => toast(plural('skippedN', n)),
  afterSync: ({ firstOk }) => {
    // The team screen was waiting for its upload to show People.
    const ppl = remote.people;
    if (ppl?.status === 'uploading' && !db.sync.uploads.includes(ppl.teamId) && isCloudTeam(ppl.teamId))
      loadPeople(ppl.teamId);
    // First sync on this phone (director accounts): offer to upload the teams on this phone.
    if (firstOk && canUpload() && localTeams().length) offerUpload();
  },
});

// Re-render after a sync changed the data, but not while the user is in the middle of
// something (typing, a sheet or dialog open, a ⋯ menu, dragging a player): then later.
let renderPending = false;
function canRenderNow() {
  const a = document.activeElement;
  return (
    $('#sheet').hidden &&
    !document.querySelector('.dialog') &&
    !document.querySelector('.menu-list:not([hidden])') &&
    !(a && a.matches('input, textarea, select')) &&
    !drag.active &&
    !drag.timer
  );
}
function renderSoon() {
  if (canRenderNow()) render();
  else renderPending = true;
}
setInterval(() => {
  if (renderPending && canRenderNow()) render();
}, 1500);
setRerender({ now: () => render(), soon: () => renderSoon(), tabbar: () => renderTabbar(route().view) });

// When to sync: coming back to the app, the network returning, and every minute while open.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) syncNow();
});
window.addEventListener('online', () => syncNow());
setInterval(() => {
  if (document.hidden || !canSync()) return;
  syncNow();
  showSyncStatus();
}, 60000);

// ---------- Team access: read-only coach view ----------
// In a cloud team where this user's role is 'coach' everything is read-only: the views hide the
// edit controls, and the click / submit / input handlers and dragging refuse anything that would
// change data (the database refuses those writes anyway). Teams on this phone are never
// read-only.

// Is the screen being shown (and its sheets) about a read-only team or game?
function viewReadOnly() {
  const { view, id } = route();
  if (view === 'team') return readOnlyTeam(id);
  if (view === 'game' || view === 'report' || view === 'edit') return readOnlyGame(getGame(id));
  if (view === 'new') return !!draft && readOnlyTeam(draft.teamId);
  return false;
}

// Actions allowed on a read-only screen. Everything else is refused there: delete-team,
// edit-player, delete-player, upload-team, remove-coach, sel, set-gk, set-home, save-game,
// kickoff, resume, end-period, next-period, do-sub, goal, yellow, red, make-gk, formation,
// set-formation, opp-goal, fix-open, fix-end, fix-started, fix-apply, edit-goal, set-scorer,
// delete-goal, undo-toast, undo, edit-info, delete-game (and any action added later, until it is
// listed here). The admin-* actions are only on the Admin page, which is never read-only.
const READ_ONLY_OK = new Set([
  'close-sheet',
  'menu-toggle',
  'games-team',
  'soon', // navigation
  'theme',
  'lang',
  'backup', // settings
  'signin-back',
  'signin-resend',
  'sign-out',
  'sync-now',
  'privacy', // account and sync
  'auth-mode',
  'change-password',
  'cancel-password',
  'profile-section',
  'pdf',
  'player-pdf', // share the report / a player's stats sheet
  'stats-team',
  'stats-season', // stats page filters
  'player', // opens a read-only info sheet for coaches (see actions.player)
  'team-section',
  'people-reload',
  'leave-team', // team screen sections (anyone may leave a team)
  'new-team', // creates a team of their own
]);
// Forms allowed on a read-only screen (others: add-player, edit-player, add-player-draft, game-info).
const READ_ONLY_FORMS = new Set([
  'signin-email',
  'signin-code',
  'signin-password',
  'set-password',
  'upload-teams',
]);

// Tap on a player in a read-only game: who it is and how they're doing, no actions.
function openPlayerInfo(g, id) {
  const d = derive(g);
  const s = d.stats[id];
  const bits = [s.goals && `⚽ ${s.goals}`, s.yellow && `🟨 ${s.yellow}`, s.red && `🟥 ${s.red}`]
    .filter(Boolean)
    .join(' · ');
  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? gkTag() : ''}</h3>
      <span class="muted small">${d.on.has(id) ? t('onPitch') : t('benchState')} · ${t('played', { t: fmtMins(s.played) })}</span>
    </div>
    ${bits ? `<p>${bits}</p>` : ''}
    <p class="hint">${readOnlyPill()} ${t('readOnlyHint')}</p>
    <button class="btn ghost block" data-action="close-sheet">${t('ok')}</button>`);
}

// ---------- Views: new / edit game ----------

// Teams where this user is a coach (read-only) are never offered for new games.
function defaultTeamId() {
  const ok = (id) => (getTeam(id) && !readOnlyTeam(id) ? id : null);
  return ok(gamesTeam()) ?? ok(db.lastTeamId) ?? writableTeams()[0]?.id ?? null;
}

function newDraft(id) {
  const g = id && getGame(id);
  if (g) {
    return {
      id: g.id,
      date: g.date,
      time: g.time,
      opponent: g.opponent,
      formatId: g.formatId,
      field: g.field,
      periods: g.periods,
      periodMin: g.periodMin,
      maxExtra: g.maxExtra ?? 10,
      gkId: g.gkId,
      teamId: getTeam(g.teamId) ? g.teamId : defaultTeamId(),
      home: g.home ?? true,
      round: g.round ?? '',
      sel: Object.fromEntries(g.squad.map((p) => [p, g.starters.includes(p) ? 'start' : 'bench'])),
    };
  }
  const f = FORMATS[0];
  const now = new Date();
  return {
    date: isoDate(now),
    time: `${pad(now.getHours())}:00`,
    opponent: '',
    formatId: f.id,
    field: f.field,
    periods: f.periods,
    periodMin: f.periodMin,
    maxExtra: 10,
    gkId: null,
    sel: {},
    teamId: defaultTeamId(),
    home: true,
    round: '',
  };
}

function squadCount() {
  const need = (parseInt(draft.field, 10) || 0) + 1;
  const vals = Object.values(draft.sel);
  const starters = vals.filter((v) => v === 'start').length;
  const bench = vals.filter((v) => v === 'bench').length;
  return `<span class="${starters === need ? 'ok' : 'warn'}">${t('startersCount', { s: starters, n: need })}</span> · ${t('benchCount', { n: bench })}`;
}

function viewEdit(id) {
  if (!draft) draft = newDraft(id);
  const back = draft.id ? `#/game/${draft.id}` : '#/games';
  const title = draft.id ? t('editGame') : t('newGameTitle');
  if (draft.id && readOnlyGame(getGame(draft.id))) {
    main.innerHTML = `${bar(title, back, '', readOnlyPill())}<p class="empty">${t('readOnlyHint')}</p>`;
    return;
  }
  if (!draft.teamId) {
    // Only teams where this user is a coach: explain why there's nothing to pick.
    const msg = db.teams.length ? t('newGameCoachOnly') : t('needTeam');
    main.innerHTML = `${bar(title, back)}<p class="empty">${msg}</p><a class="btn primary block" href="#/teams">${t('goTeams')}</a>`;
    return;
  }
  const ps = teamPlayers(draft.teamId).sort(byNumber);
  main.innerHTML = `
    ${bar(title, back)}
    <div class="form">
      <label>${t('team')}
        <select data-field="teamId">${writableTeams()
          .map(
            (tm) =>
              `<option value="${tm.id}" ${tm.id === draft.teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`,
          )
          .join('')}</select>
      </label>
      <label>${t('opponent')}<input data-field="opponent" value="${esc(draft.opponent)}" placeholder="${t('opponentPh')}" autocomplete="off"></label>
      <div class="row gap">
        <span class="seg big">
          <button class="${draft.home ? 'on' : ''}" data-action="set-home" data-v="1">${t('home')}</button>
          <button class="${draft.home ? '' : 'on'}" data-action="set-home" data-v="0">${t('away')}</button>
        </span>
        <label class="grow">${t('round')}<input type="number" inputmode="numeric" min="1" data-field="round" value="${esc(draft.round)}"></label>
      </div>
      <div class="row gap">
        <label class="grow">${t('date')}<input type="date" data-field="date" value="${esc(draft.date)}"></label>
        <label class="grow">${t('time')}<input type="time" data-field="time" value="${esc(draft.time)}"></label>
      </div>
      <label>${t('format')}
        <select data-field="formatId">${FORMATS.map((f) => `<option value="${f.id}" ${f.id === draft.formatId ? 'selected' : ''}>${f.id === 'Custom' ? t('custom') : `${f.id} · ${t('gkPlus', { n: f.field })}`}</option>`).join('')}</select>
      </label>
      <div class="row gap">
        <label class="grow">${t('fieldPlayers')}<input type="number" inputmode="numeric" min="1" max="10" data-field="field" value="${esc(draft.field)}"></label>
        <label class="grow">${t('periods')}<input type="number" inputmode="numeric" min="1" max="4" data-field="periods" value="${esc(draft.periods)}"></label>
        <label class="grow">${t('minPeriod')}<input type="number" inputmode="numeric" min="1" data-field="periodMin" value="${esc(draft.periodMin)}"></label>
      </div>
      <label>${t('autoStop')}
        <input type="number" inputmode="numeric" min="1" max="60" data-field="maxExtra" value="${esc(draft.maxExtra)}">
      </label>
    </div>

    <h2>${t('squad')} <span class="muted small" id="squad-count">${squadCount()}</span></h2>
    <p class="hint">${t('squadHint')}</p>
    <ul class="list squad-pick">${ps
      .map((p) => {
        const v = draft.sel[p.id] || '';
        return `<li class="item ${v}">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow pname">${esc(p.name)}</span>
        <button class="gkbtn ${draft.gkId === p.id ? 'on' : ''}" data-action="set-gk" data-id="${p.id}" ${v === 'start' ? '' : 'disabled'} aria-label="${t('gkAria')}">🧤</button>
        <span class="seg">
          <button class="${v === '' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="">${t('selOut')}</button>
          <button class="${v === 'bench' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="bench">${t('selBench')}</button>
          <button class="${v === 'start' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="start">${t('selStart')}</button>
        </span>
      </li>`;
      })
      .join('')}</ul>
    <form class="row gap" data-form="add-player-draft">
      <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
      <input class="grow" name="name" placeholder="${t('addNewPlayer')}" required autocomplete="off">
      <button class="btn">${t('add')}</button>
    </form>

    <button class="btn primary block" data-action="save-game">${draft.id ? t('saveChanges') : t('createGame')}</button>`;
}

function saveGame() {
  if (readOnlyTeam(draft.teamId) || (draft.id && readOnlyGame(getGame(draft.id)))) return refuseReadOnly();
  const field = parseInt(draft.field, 10);
  const periods = parseInt(draft.periods, 10);
  const periodMin = parseInt(draft.periodMin, 10);
  const maxExtra = parseInt(draft.maxExtra, 10) || 10;
  const round = parseInt(draft.round, 10);
  if (!(field >= 1)) return notify(t('errField'));
  if (!(periods >= 1) || !(periodMin >= 1)) return notify(t('errPeriods'));
  if (!draft.date) return notify(t('errDate'));

  const team = getTeam(draft.teamId);
  const order = teamPlayers(team.id)
    .sort(byNumber)
    .map((p) => p.id);
  const squad = order.filter((id) => draft.sel[id]);
  const starters = squad.filter((id) => draft.sel[id] === 'start');
  const need = field + 1;
  if (starters.length !== need) return notify(t('errStarters', { need, field, n: starters.length }));
  if (!starters.includes(draft.gkId)) return notify(t('errGk'));

  let g = draft.id && getGame(draft.id);
  if (!g) {
    g = {
      id: uid(),
      status: 'scheduled',
      clock: { running: false, startedAt: null, elapsedMs: 0, period: 1 },
      events: [],
      marks: [],
      alerted: {},
    };
    db.games.push(g);
  }
  const names = {};
  for (const id of squad) {
    const p = db.players.find((x) => x.id === id);
    names[id] = { name: p.name, number: p.number, fullName: p.fullName || '' };
  }
  Object.assign(g, {
    date: draft.date,
    time: draft.time,
    opponent: draft.opponent.trim(),
    formatId: draft.formatId,
    field,
    periods,
    periodMin,
    maxExtra,
    squad,
    starters,
    gkId: draft.gkId,
    names,
    teamId: team.id,
    club: team.club,
    team: team.name,
    home: draft.home,
    round: round >= 1 ? String(round) : '',
  });
  g.formation = formationOf(g);
  g.lineup = startLineup(g);
  db.lastTeamId = team.id;
  save();
  location.hash = `#/game/${g.id}`;
}

// ---------- Views: live game ----------

function clockButtons(g) {
  const c = g.clock;
  const b = (action, label, cls = '') =>
    `<button class="btn small ${cls}" data-action="${action}">${label}</button>`;
  switch (g.status) {
    case 'scheduled':
      return b('kickoff', t('kickoff'), 'primary');
    case 'live':
      return b(
        'end-period',
        c.period >= g.periods ? t('fullTimeBtn') : t('endPeriod', { p: periodName(g, c.period) }),
        'warn',
      );
    case 'break':
      return b('next-period', t('startPeriod', { p: periodName(g, c.period + 1) }), 'primary');
    default:
      return `<a class="btn primary" href="#/report/${g.id}">${t('viewReport')}</a>`;
  }
}

const gkTag = () => ` <span class="tag">${t('gk')}</span>`;

const PITCH_LINES = `<svg class="pitch-lines" viewBox="0 0 100 130" aria-hidden="true">
  <rect x="3" y="3" width="94" height="124" rx="1"/>
  <line x1="3" y1="65" x2="97" y2="65"/><circle cx="50" cy="65" r="11"/><circle class="dot" cx="50" cy="65" r=".8"/>
  <rect x="24" y="3" width="52" height="19"/><rect x="37" y="3" width="26" height="7"/>
  <rect x="24" y="108" width="52" height="19"/><rect x="37" y="120" width="26" height="7"/>
  <path d="M40 22a11 11 0 0 0 20 0M40 108a11 11 0 0 1 20 0"/>
</svg>`;

// Round player token: shirt circle with minutes played in a pill on its bottom edge, the name
// below, and small badges on the circle (cards top-right, goals bottom-right).
// They are chips too, so tap and drag work the same. where: 'on' (pitch), 'bench' or 'off' (sent off).
function token(g, d, id, where, attrs = '') {
  const s = d.stats[id];
  const cards = s.red
    ? '<span class="tb tb-card tb-red" aria-hidden="true"></span>'
    : s.yellow
      ? `<span class="tb tb-card tb-yellow" aria-hidden="true">${s.yellow > 1 ? s.yellow : ''}</span>`
      : '';
  const goals = s.goals
    ? `<span class="tb tb-goal" aria-hidden="true">⚽${s.goals > 1 ? `<b>${s.goals}</b>` : ''}</span>`
    : '';
  const label = [s.goals ? `⚽×${s.goals}` : '', s.yellow ? `🟨×${s.yellow}` : '', s.red ? '🟥' : '']
    .filter(Boolean)
    .join(' ');
  return `<button class="chip round ${where} ${where === 'on' ? 'tok' : ''} ${id === d.gk ? 'gk' : ''}" data-action="player" data-id="${id}" ${attrs} ${where === 'off' ? 'disabled' : ''}>
    <span class="face">
      <span class="shirt">${esc(g.names[id].number) || '–'}</span>
      ${cards}${goals}
      <span class="mins" data-pt="${id}">${fmtMins(s.played)}</span>
    </span>
    <span class="pname">${esc(g.names[id].name)}</span>${label ? `<span class="sr-only">${label}</span>` : ''}
  </button>`;
}

// On-pitch players in formation, with the formation picker and player count in the top corners.
function pitch(g, d, ro = false) {
  const pts = slotCoords(formationOf(g));
  return `<div class="pitch">${PITCH_LINES}
    ${
      ro
        ? `<span class="pitch-corner left ro" aria-label="${t('formation')}">${formationOf(g)}</span>`
        : formationsFor(g.field).length > 1
          ? `<button class="pitch-corner left" data-action="formation" aria-label="${t('formation')}">${formationOf(g)} ▾</button>`
          : ''
    }
    <span class="pitch-corner right" aria-label="${t('onPitch')}">${d.on.size}/${g.field + 1}</span>
    ${d.slots
      .map((id, i) => {
        const pos = `data-slot="${i}" style="left:${pts[i].x.toFixed(1)}%;top:${typeof pts[i].y === 'number' ? `${pts[i].y.toFixed(1)}%` : pts[i].y}"`;
        return id
          ? token(g, d, id, 'on', pos)
          : `<div class="chip round slot-empty" ${pos}><span class="shirt"></span></div>`;
      })
      .join('')}</div>`;
}

// LIVE / PAUSED / BREAK / … pill on top of the scoreboard.
function statusPill(g) {
  const paused = g.status === 'live' && !g.clock.running;
  return `<span class="pill ${paused ? 'paused' : g.status}">${paused ? t('paused') : t(`st_${g.status}`)}</span>`;
}

function viewGame(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);
  const benchIds = g.squad
    .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
    .sort((a, b) => d.stats[a].played - d.stats[b].played || byNumber(g.names[a], g.names[b]));
  const offIds = sortIds(
    g,
    [...d.sentOff].filter((p) => !d.on.has(p)),
  );

  const timeline = [...g.events.filter((e) => e.type !== 'pos'), ...g.marks]
    .sort((a, b) => a.t - b.t || (a.wall || 0) - (b.wall || 0))
    .reverse();
  const ro = readOnlyGame(g); // coach of this cloud team: no controls that change the game
  const last = ro ? null : g.events[g.events.length - 1];
  const canEdit = g.status === 'scheduled' && g.events.length === 0;
  const overtime = g.status === 'live' && matchTime(g) - periodStart(g) >= g.periodMin * 60000;
  const us = gameTeam(g) || t('unnamedTeam');
  const them = g.opponent || t('opponent');
  const [home, away] = g.home === false ? [them, us] : [us, them];

  main.innerHTML = `
    ${bar(
      esc(matchTitle(g)),
      '#/games',
      ro
        ? g.status !== 'scheduled'
          ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>`
          : ''
        : `
      ${
        canEdit
          ? `<a class="menu-item" role="menuitem" href="#/edit/${g.id}">✎ ${t('edit')}</a>`
          : `<button class="menu-item" role="menuitem" data-action="edit-info">${t('gameInfo')}</button>`
      }
      ${g.status !== 'scheduled' ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>` : ''}
      ${g.status !== 'scheduled' ? `<button class="menu-item" role="menuitem" data-action="fix-open">${t('fixTimesBtn')}</button>` : ''}
      <button class="menu-item danger" role="menuitem" data-action="delete-game">🗑 ${t('deleteGame')}</button>`,
      ro ? readOnlyPill() : '',
    )}
    <section class="scoreboard ${overtime ? 'overtime' : ''}">
      ${statusPill(g)}
      <div class="clock-line">
        <span class="clock" id="clock">${fmtNow(g)}</span>
        ${g.status === 'live' && !g.clock.running && !ro ? `<button class="icon-btn on" data-action="resume" aria-label="${t('resume')}">▶</button>` : ''}
      </div>
      <div class="muted small" id="period">${periodLabel(g)}</div>
      <div class="score-row">
        <span class="side">${esc(home)}</span>
        <span class="score big">${scoreHtml(g, d, ' – ', true)}</span>
        <span class="side">${esc(away)}</span>
      </div>
      ${
        g.status === 'break' && g.autoStopped === g.clock.period && !ro
          ? `<div class="alert">${t('autoStoppedAlert', { p: periodName(g, g.clock.period), m: g.maxExtra ?? 10, fix: t('fixTimes') })}
        <div class="row center"><button class="btn small" data-action="fix-open">${t('fixTimesBtn')}</button></div></div>`
          : ''
      }
      ${
        ro
          ? g.status === 'finished'
            ? `<div class="row gap center wrap score-actions">${clockButtons(g)}</div>`
            : ''
          : `<div class="row gap center wrap score-actions">
        ${g.status === 'live' ? `<button class="btn small ghost" data-action="opp-goal">${t('oppGoalBtn')}</button>` : ''}
        ${clockButtons(g)}
      </div>`
      }
      ${pitch(g, d, ro)}
    </section>

    <h2>${t('bench')}</h2>
    ${benchIds.length ? `<div class="round-row">${benchIds.map((p) => token(g, d, p, 'bench')).join('')}</div>` : `<p class="empty small">${t('noSubs')}</p>`}

    ${offIds.length ? `<h2>${t('sentOff')}</h2><div class="round-row">${offIds.map((p) => token(g, d, p, 'off')).join('')}</div>` : ''}

    <h2>${t('timeline')}</h2>
    ${last ? `<button class="btn small ghost" data-action="undo">${t('undoX', { x: describe(g, last) })}</button>` : ''}
    ${
      timeline.length
        ? `<ul class="timeline">${timeline
            .map((e) =>
              e.type === 'goal' && !ro
                ? `<li class="tap" data-action="edit-goal" data-id="${e.id}"><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span><span class="edit">✎</span></li>`
                : `<li><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span></li>`,
            )
            .join('')}</ul>`
        : `<p class="empty small">${t('nothingYet')}</p>`
    }
`;
}

function tick() {
  // Read-only games (coach): reminders and the auto-stop are the director's phone's job.
  for (const g of db.games) if (g.status === 'live' && g.clock.running && !readOnlyGame(g)) checkTime(g);
  const { view, id } = route();
  if (view !== 'game') return;
  const g = getGame(id);
  if (!g || g.status !== 'live' || !g.clock.running) return;
  const d = derive(g);
  $('#clock').textContent = fmtNow(g);
  $('#period').textContent = periodLabel(g);
  for (const p of g.squad) {
    const el = main.querySelector(`[data-pt="${p}"]`);
    if (el) el.textContent = fmtMins(d.stats[p].played);
  }
  $('.scoreboard')?.classList.toggle('overtime', matchTime(g) - periodStart(g) >= g.periodMin * 60000);
}

setInterval(tick, 1000);

// ---------- Sheets (player actions) ----------

function currentGame() {
  const { view, id } = route();
  return view === 'game' || view === 'report' ? getGame(id) : null;
}

// One tap on a player: quick actions on top, substitution list right below,
// so every action is at most two taps away.
function openPlayerSheet(g, id) {
  const d = derive(g);
  const on = d.on.has(id);
  const quick = (action, icon, label, show = true) =>
    show
      ? `<button class="quick" data-action="${action}" data-id="${id}"><span class="qi">${icon}</span>${label}</button>`
      : '';

  // Fewest minutes first when choosing who comes on, most minutes first for who comes off.
  const candidates = on
    ? g.squad
        .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
        .sort((a, b) => d.stats[a].played - d.stats[b].played)
    : [...d.on].sort((a, b) => d.stats[b].played - d.stats[a].played);
  const list = candidates
    .map((p) => {
      const [out, inn] = on ? [id, p] : [p, id];
      return `<button class="opt" data-action="do-sub" data-out="${out}" data-in="${inn}">
      <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}${p === d.gk ? gkTag() : ''}</span>
      <span class="muted">${fmtMins(d.stats[p].played)}</span>
    </button>`;
    })
    .join('');

  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? gkTag() : ''}</h3>
      <span class="muted small">${on ? t('onPitch') : t('benchState')} · ${t('played', { t: fmtMins(d.stats[id].played) })}</span>
    </div>
    <div class="quick-row">
      ${quick('goal', '⚽', t('goalBtn'), on && g.status === 'live')}
      ${quick('yellow', '🟨', t('yellowBtn'))}
      ${quick('red', '🟥', t('redBtn'))}
      ${quick('make-gk', '🧤', t('toGoal'), on && d.gk !== id)}
    </div>
    <p class="muted small sub-title">${on ? t('subOff') : t('subOn')}</p>
    ${list || `<p class="empty small">${t('noAvail')}</p>`}
    <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
}

// ---------- Fix times (forgot to end / start a half) ----------
// fix.end is minutes into the current period; the sheet shows game-clock minutes.

let fix = null;

const periodOffsetMin = (g) => (g.clock.period - 1) * g.periodMin;

// The latest moment the current period could have ended, in minutes of that period.
function fixLimits(g) {
  const start = periodStart(g);
  if (g.status === 'live') return { maxMin: (matchTime(g) - start) / 60000 };
  const end = [...g.marks].reverse().find((m) => m.type === 'end');
  return { maxMin: (end.t - start + (Date.now() - end.wall)) / 60000 };
}

function fixPreview(g) {
  const p = g.clock.period;
  let text = t('previewEnds', { p: periodName(g, p), t: fmtInPeriod(g, p, fix.end * 60000) });
  if (p < g.periods)
    text +=
      fix.started == null
        ? t('previewBreak')
        : t('previewStarted', { p: periodName(g, p + 1), n: fix.started });
  return text;
}

function openFixSheet(g) {
  const p = g.clock.period;
  const off = periodOffsetMin(g);
  const { maxMin } = fixLimits(g);
  if (!fix) fix = { end: Math.min(g.periodMin, maxMin), started: null };
  const pick = (action, v, label, on) =>
    `<button class="pick ${on ? 'on' : ''}" data-action="${action}" data-v="${v}">${label}</button>`;
  const ends = [0, 1, 2, 3, 5].map((x) => g.periodMin + x).filter((v) => v <= maxMin);
  const canResume = p < g.periods && g.status !== 'finished';
  const room = maxMin - fix.end;
  openSheet(`
    <h3>${t('fixTitle', { p: periodName(g, p) })}</h3>
    <p class="muted small">${t('whenEnd', { p: periodName(g, p) })}</p>
    <div class="pick-row">
      ${ends.map((v) => pick('fix-end', v, v === g.periodMin ? t('regular', { v: off + v }) : `+${v - g.periodMin}'`, fix.end === v)).join('')}
      ${g.status === 'live' ? pick('fix-end', maxMin, t('now'), fix.end === maxMin) : ''}
    </div>
    <label class="inline">${t('other')} <input type="number" inputmode="decimal" min="${off}" step="0.5" data-fix="end" placeholder="${off + g.periodMin}"> min</label>
    ${
      canResume
        ? `
      <p class="muted small">${t('nextStarted', { p: periodName(g, p + 1) })}</p>
      <div class="pick-row">
        ${pick('fix-started', '', t('notYet'), fix.started == null)}
        ${[1, 2, 3, 5, 10, 15]
          .filter((v) => v <= room)
          .map((v) => pick('fix-started', v, t('minAgo', { n: v }), fix.started === v))
          .join('')}
      </div>
      <label class="inline">${t('startedPre')} <input type="number" inputmode="decimal" min="0" step="0.5" data-fix="started"> ${t('startedPost')}</label>`
        : ''
    }
    <p class="alert small" id="fix-preview">${fixPreview(g)}</p>
    <button class="btn primary block" data-action="fix-apply">${t('apply')}</button>
    <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
}

// ---------- Report ----------

// Stints as game-clock labels: entered (start of the later period on a boundary) – left.
const stintLabels = (g, s, sep) => s.intervals.map(([a, b]) => `${fmtAt(g, a, true)}${sep}${fmtAt(g, b)}`);

const SHEET_NAVY = '#1f3a5a';

// The stats sheet table, shared by the PDF and its preview on the report screen.
// Column widths are in PDF points; cells are arrays of lines.
// Full name for the report: the player's current one (so fixing a name also fixes
// past games), else the one saved with the game, else the shirt name.
function fullName(g, id) {
  return db.players.find((p) => p.id === id)?.fullName || g.names[id].fullName || g.names[id].name;
}

function statsSheet(g) {
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
function sheetPreview(sh) {
  const S = 1.3;
  const x = (i) => Math.round(sh.cols.slice(0, i).reduce((n, c) => n + c.w, 0) * S);
  const cell = (lines, c) => `<td class="${c.left ? 'l' : ''}">${lines.map(esc).join('<br>')}</td>`;
  return `<div class="pdf-preview"><div class="pp-page" style="width:${x(sh.cols.length) + 40}px">
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

function viewReport(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);

  main.innerHTML = `
    ${bar(t('gameReport'), `#/game/${g.id}`, '', readOnlyGame(g) ? readOnlyPill() : '')}
    <section class="scoreboard">
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted small">${formatLine(g)}</div>
      <div class="score big">${scoreHtml(g, d, ' – ', true)}</div>
      <div class="muted">${t('gameTime', { t: fmtNow(g) })}${g.status === 'finished' ? '' : ` · <span class="warn">${t('inProgress')}</span>`}</div>
    </section>

    <button class="btn primary block" data-action="pdf">${t('pdf')}</button>
    ${readOnlyGame(g) ? '' : `<button class="btn ghost block" data-action="edit-info">${t('gameInfo')}</button>`}
    <p class="hint">${t('reportHint')}</p>
    ${sheetPreview(statsSheet(g))}`;
}

// ---------- Views: stats (per player, over a season) ----------
// Worked out from the finished games of a team, nothing extra is stored. A player counts as
// called up when they were in the squad, and as having played when they had time on the pitch.

function statsTeam() {
  const id = localStorage.getItem(STATS_TEAM_KEY);
  return getTeam(id) ? id : getTeam(db.lastTeamId) ? db.lastTeamId : db.teams[0]?.id || '';
}

const statsSeasons = (teamId) => seasonsOfTeam(db.games, teamId);

function statsSeason(teamId) {
  const seasons = statsSeasons(teamId);
  const s = localStorage.getItem(STATS_SEASON_KEY);
  return seasons.includes(s) ? s : seasons[0] || '';
}

const teamStats = (teamId, season) => teamSeason(db.games, teamPlayers(teamId), teamId, season, Date.now());

const ddmm = (g) => {
  const [, m, d] = String(g.date).split('-');
  return d ? `${d}/${m}` : '';
};
const playerFullName = (p) => p.fullName || p.name;

// What a player did in one game, as a short line ("60' · 2 goals · yellow").
function gameDetail(r) {
  if (!r.s) return t('notCalled');
  if (!r.played) return t('didNotPlay');
  return [
    fmtMins(r.s.played) + (r.started ? '' : ` (${t('statSubIn')})`),
    r.s.goals ? plural('statGoalN', r.s.goals) : '',
    r.s.yellow ? t('statYellowWord') + (r.s.yellow > 1 ? ` ×${r.s.yellow}` : '') : '',
    r.s.red ? t('statRedWord') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

// Our score first, then the opponent ("2–0 CD Ribeira").
const gameShort = (g, d) => `${d.us}–${d.them} ${g.opponent || t('opponent')}`;

// Team (and season) pickers shared by the stats page and a player's sheet.
function statsFilters(teamId, season, withTeams) {
  const row = (action, items, on) =>
    `<div class="pick-row filter" role="tablist">${items
      .map(
        ([id, label]) =>
          `<button class="pick ${id === on ? 'on' : ''}" role="tab" aria-selected="${id === on}" data-action="${action}" data-id="${esc(id)}">${label}</button>`,
      )
      .join('')}</div>`;
  const seasons = statsSeasons(teamId);
  return (
    (withTeams && db.teams.length > 1
      ? row(
          'stats-team',
          db.teams.map((tm) => [tm.id, esc(teamLabel(tm))]),
          teamId,
        )
      : '') +
    (seasons.length > 1
      ? row(
          'stats-season',
          seasons.map((s) => [s, `${t('pdfSeason')} ${esc(s)}`]),
          season,
        )
      : '')
  );
}

function viewStats() {
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
  const rowHtml = (ps) => `<li><a class="stat-row" href="#/player/${ps.p.id}">
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
          <strong>${esc(teamLabel(getTeam(teamId)))}</strong>
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

function viewPlayer(id) {
  const p = db.players.find((x) => x.id === id);
  if (!p) return notFound();
  const tm = getTeam(p.teamId);
  const season = statsSeason(p.teamId);
  const st = teamStats(p.teamId, season);
  const ps = st.players.find((x) => x.p.id === id) || playerStats(p, st.games);
  const tile = (label, value, sub = '') =>
    `<div class="tile"><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

  // Minutes in each game: one bar per game, as tall as the share of the game played.
  const top = Math.max(1, ...ps.rows.map((r) => Math.max(gameLength(r.g), r.s ? r.s.played / 60000 : 0)));
  const bars = ps.rows
    .map((r) => {
      const m = r.played ? Math.floor(r.s.played / 60000) : 0;
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

// ---------- PDF report ----------
// A tiny PDF writer: the PDF's built-in Helvetica fonts (WinAnsi encoding, so
// Portuguese accents work), filled/stroked rectangles, lines and text.

// Glyph widths (per 1000 em) for character codes 32..126.
const HELV_W = {
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
const WIN_ANSI = {
  0x2014: 0x97,
  0x2013: 0x96,
  0x2026: 0x85,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
};
const WIN_W = {
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
function winAnsi(s) {
  let out = '';
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    out += String.fromCharCode((c >= 32 && c < 127) || (c >= 160 && c <= 255) ? c : (WIN_ANSI[c] ?? 63));
  }
  return out;
}

function glyphW(code, bold) {
  const table = bold ? HELV_W.bold : HELV_W.regular;
  if (code >= 32 && code < 127) return table[code - 32];
  if (WIN_W[code]) return WIN_W[code];
  if (code >= 192) {
    const base = String.fromCharCode(code).normalize('NFD').charCodeAt(0);
    if (base === 105) return 278; // accented i is wider than a plain i
    if (base < 127) return table[base - 32];
  }
  return 556;
}

function textWidth(s, size, bold) {
  let w = 0;
  for (const c of winAnsi(s)) w += glyphW(c.charCodeAt(0), bold);
  return (w * size) / 1000;
}

function pdfDoc({ W = 842, H = 595 } = {}) {
  // A4 landscape by default, in points
  const pages = [];
  let ops = null;
  const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const n = (v) => +v.toFixed(2);

  return {
    W,
    H,
    page() {
      ops = [];
      pages.push(ops);
    },
    rect(x, y, w, h, fill, stroke, lw = 0.5) {
      if (fill) ops.push(`${rgb(fill)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
      if (stroke) ops.push(`${rgb(stroke)} RG ${lw} w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
    },
    line(x1, y1, x2, y2, color, lw) {
      ops.push(`${rgb(color)} RG ${lw} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
    },
    // Draws text at baseline y; returns its width. Too-long text gets an ellipsis.
    text(s, x, y, { size = 10, bold = false, color = '#000000', align = 'left', maxW = Infinity } = {}) {
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
    // The finished file as bytes.
    bytes() {
      const objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + 2 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      ];
      pages.forEach((p, i) => {
        const stream = p.join('\n');
        objs.push(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + 2 * i} 0 R >>`,
        );
        objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      });
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

function buildPdf(g) {
  const sh = statsSheet(g);
  const pdf = pdfDoc();
  const M = 40;
  const GRID = '#a9bcb6';
  const FS = 9.5;
  const LH = 12;
  const { cols } = sh;
  const tableW = cols.reduce((n, c) => n + c.w, 0);
  const colX = cols.map((_, i) => M + cols.slice(0, i).reduce((n, c) => n + c.w, 0));

  let y;
  const tableHeader = () => {
    cols.forEach((c, i) => {
      pdf.rect(colX[i], y - 20, c.w, 20, c.fill, GRID);
      pdf.text(c.title, colX[i] + c.w / 2, y - 13.5, {
        size: 9,
        bold: true,
        color: '#ffffff',
        align: 'center',
        maxW: c.w - 4,
      });
    });
    y -= 20;
  };
  const newPage = () => {
    pdf.page();
    y = pdf.H - M;
  };
  // One table row: cells is an array of line arrays, one per column.
  const row = (cells, { fill, bold = false } = {}) => {
    const h = Math.max(26, Math.max(...cells.map((c) => c.length)) * LH + 14);
    if (y - h < M) {
      newPage();
      tableHeader();
    }
    cells.forEach((lines, i) => {
      const c = cols[i];
      pdf.rect(colX[i], y - h, c.w, h, fill, GRID);
      const top = y - (h - lines.length * LH) / 2;
      lines.forEach((s, k) => {
        const base = top - k * LH - 9;
        if (c.left) pdf.text(s, colX[i] + 7, base, { size: FS, bold, maxW: c.w - 12 });
        else pdf.text(s, colX[i] + c.w / 2, base, { size: FS, bold, align: 'center', maxW: c.w - 6 });
      });
    });
    y -= h;
  };

  newPage();
  pdf.text(sh.title, M, y - 14, { size: 15, bold: true, color: SHEET_NAVY, maxW: tableW });
  y -= 36;
  for (const [k, v, col] of sh.meta) {
    const w = pdf.text(k, colX[col], y, { size: 10, bold: true, color: '#333333' });
    pdf.text(v, colX[col] + w + 4, y, { size: 10, color: '#333333', maxW: 360 });
  }
  y -= 14;
  tableHeader();
  sh.rows.forEach((cells, i) => row(cells, { fill: i % 2 ? '#dce8e4' : null }));
  const lineY = y;
  row(sh.total, { fill: '#eef2f4', bold: true });
  pdf.line(M, lineY, M + tableW, lineY, SHEET_NAVY, 1.2);
  return pdf.bytes();
}

function pdfFileName(g) {
  const clean = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[^A-Za-z0-9]/g, '');
  const parts = [
    clean(g.club),
    clean(g.team),
    g.round ? `${t('fileRound')}${g.round}` : g.date,
    t('fileStats'),
  ];
  return `${parts.filter(Boolean).join('_')}.pdf`;
}

const exportPdf = (g) => shareFile(new File([buildPdf(g)], pdfFileName(g), { type: 'application/pdf' }));

// Share a file (WhatsApp and the like) where the phone can, else download it.
async function shareFile(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  download(file.name, file, file.type);
}

// A player's stats sheet for the season (A4 portrait), to send to the family.
const PDF_GREEN = '#1d5c3f';

function buildPlayerPdf(playerId) {
  const p = db.players.find((x) => x.id === playerId);
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
  let y;

  pdf.page();
  // Header band
  const HB = 118;
  pdf.rect(0, pdf.H - HB, pdf.W, HB, PDF_GREEN);
  y = pdf.H - 36;
  pdf.text((tm ? teamFull(tm.club, tm.name) : '').toUpperCase(), M, y, {
    size: 10,
    color: '#cfe3d8',
    maxW: W,
  });
  y -= 32;
  pdf.text(playerFullName(p).toUpperCase(), M, y, { size: 24, bold: true, color: '#ffffff', maxW: W });
  y -= 22;
  const first = st.games[0]?.g;
  const last = st.games[st.games.length - 1]?.g;
  const range = first ? t('statRange', { a: ddmm(first), b: ddmm(last) }) : '';
  pdf.text([season && `${t('pdfSeason')} ${season}`, range].filter(Boolean).join(' · '), M, y, {
    size: 11,
    color: '#ffffff',
    maxW: W,
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
  const tiles = [
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
      [
        [ps.yellow, '#f5c518'],
        [ps.red, '#d63a3a'],
      ].forEach(([count, fill], k) => {
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
    const m = r.played ? Math.floor(r.s.played / 60000) : 0;
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
  const heading = () => {
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

function playerPdfName(playerId) {
  const p = db.players.find((x) => x.id === playerId);
  const tm = getTeam(p.teamId);
  const clean = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[^A-Za-z0-9]/g, '');
  const season = statsSeason(p.teamId).replace('/', '-');
  return `${[clean(tm?.club), clean(tm?.name), clean(playerFullName(p)), t('fileStats'), season].filter(Boolean).join('_')}.pdf`;
}

const exportPlayerPdf = (playerId) =>
  shareFile(new File([buildPlayerPdf(playerId)], playerPdfName(playerId), { type: 'application/pdf' }));

// ---------- Actions ----------

const actions = {
  'close-sheet': () => closeSheet(),
  soon: ({ v }) =>
    askConfirm({ title: t('soonTitle'), message: t('soonMsg', { x: t(v) }), ok: t('ok'), cancel: false }),

  // People of a cloud team (team screen)

  // teams and players
  // Signed in with a director (or admin) account: new teams are cloud teams straight away.
  // Otherwise (signed out, coach account) they stay on this phone, as before.

  // new / edit game
  sel: ({ id, v }) => {
    if (v) draft.sel[id] = v;
    else delete draft.sel[id];
    if (v !== 'start' && draft.gkId === id) draft.gkId = null;
    render();
  },
  'set-gk': ({ id }) => {
    draft.gkId = id;
    render();
  },
  'set-home': ({ v }) => {
    draft.home = v === '1';
    render();
  },
  'save-game': () => saveGame(),

  // clock
  kickoff: () => {
    const g = currentGame();
    g.status = 'live';
    g.clock.period = 1;
    g.marks.push({ type: 'start', period: 1, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    render();
  },
  resume: () => {
    const g = currentGame();
    startClock(g);
    save();
    render();
  },
  'end-period': async () => {
    const g = currentGame();
    const last = g.clock.period >= g.periods;
    if (g.status !== 'live') return;
    if (last && !(await askConfirm({ title: t('confirmFullTime'), ok: t('fullTimeBtn') }))) return;
    if (g.status !== 'live') return; // auto-stopped while the popup was open
    endPeriodAt(g, matchTime(g));
    $('#toast').hidden = true;
    buzz();
    save();
    if (last) location.hash = `#/report/${g.id}`;
    else render();
  },
  'next-period': () => {
    const g = currentGame();
    g.clock.period++;
    g.status = 'live';
    g.autoStopped = null;
    g.marks.push({ type: 'start', period: g.clock.period, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    render();
  },

  // player actions
  player: ({ id }) => (readOnlyGame(currentGame()) ? openPlayerInfo : openPlayerSheet)(currentGame(), id),
  'do-sub': ({ out, in: inn }) => doSub(currentGame(), out, inn),
  goal: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'goal', playerId: id });
    render();
    toast(t('evGoal', { p: g.names[id].name }), undoBtn(eid));
  },
  yellow: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'yellow', playerId: id });
    render();
    toast(t('evYellow', { p: g.names[id].name }), undoBtn(eid));
  },
  red: ({ id }) => {
    const g = currentGame();
    const wasGk = derive(g).gk === id;
    const eid = addEvent(g, { type: 'red', playerId: id });
    render();
    toast(wasGk ? t('gkSentOff') : t('evRed', { p: g.names[id].name }), undoBtn(eid));
  },
  'make-gk': ({ id }) => {
    closeSheet();
    movePlayer(currentGame(), id, 0);
  },
  formation: () => {
    const g = currentGame();
    const cur = formationOf(g);
    openSheet(`
      <h3>${t('formation')}</h3>
      ${formationsFor(g.field)
        .map(
          (f) => `<button class="opt ${f === cur ? 'current' : ''}" data-action="set-formation" data-v="${f}">
        <span>${f}</span>${f === cur ? '<span>✓</span>' : ''}
      </button>`,
        )
        .join('')}
      <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
  },
  'set-formation': ({ v }) => {
    const g = currentGame();
    g.formation = v;
    db.formations = { ...db.formations, [g.field]: v };
    save();
    closeSheet();
    render();
  },
  'opp-goal': () => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'oppgoal' });
    render();
    toast(t('evOppGoal'), undoBtn(eid));
  },
  'fix-open': () => {
    const g = currentGame();
    if (!g || g.status === 'scheduled') return;
    $('#toast').hidden = true;
    fix = null;
    openFixSheet(g);
  },
  'fix-end': ({ v }) => {
    fix.end = Number(v);
    openFixSheet(currentGame());
  },
  'fix-started': ({ v }) => {
    fix.started = v === '' ? null : Number(v);
    openFixSheet(currentGame());
  },
  'fix-apply': () => {
    const g = currentGame();
    const { maxMin } = fixLimits(g);
    const p = g.clock.period;
    if (!(fix.end >= 0) || fix.end > maxMin + 0.01) {
      return notify(t('errFixEnd', { a: fmtInPeriod(g, p, 0), b: fmtInPeriod(g, p, maxMin * 60000) }));
    }
    if (fix.started != null && !(fix.started >= 0 && fix.started <= maxMin - fix.end + 0.01)) {
      return notify(t('errFixStart', { p: periodName(g, p) }));
    }
    applyFix(g, Math.min(fix.end, maxMin), fix.started);
    fix = null;
    buzz();
    render();
    toast(t('timesFixed'));
  },
  // Fix a goal given to the wrong player: pick who was on the pitch at that moment, or remove it.
  'edit-goal': ({ id }) => {
    const g = currentGame();
    const e = g.events.find((x) => x.id === id);
    const d = derive(g);
    const onAt = g.squad.filter((p) => d.stats[p].intervals.some(([a, b]) => a <= e.t && e.t <= b));
    const ids = sortIds(g, onAt.length ? onAt : g.squad);
    openSheet(`
      <h3>${t('editGoal', { t: timeOf(g, e) })}</h3>
      <p class="muted small sub-title">${t('whoScored')}</p>
      ${ids
        .map(
          (
            p,
          ) => `<button class="opt ${p === e.playerId ? 'current' : ''}" data-action="set-scorer" data-id="${e.id}" data-p="${p}">
        <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}</span>${p === e.playerId ? '<span>⚽</span>' : ''}
      </button>`,
        )
        .join('')}
      <button class="btn ghost danger block" data-action="delete-goal" data-id="${e.id}">${t('removeGoal')}</button>
      <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
  },
  'set-scorer': ({ id, p }) => {
    const g = currentGame();
    g.events.find((x) => x.id === id).playerId = p;
    save();
    buzz();
    render();
    toast(t('evGoal', { p: g.names[p].name }));
  },
  'delete-goal': async ({ id }) => {
    const g = currentGame();
    if (!(await askConfirm({ title: t('confirmRemoveGoal'), ok: t('deleteBtn'), danger: true }))) return;
    g.events = g.events.filter((x) => x.id !== id);
    save();
    render();
  },
  'undo-toast': ({ id }) => {
    const g = currentGame();
    $('#toast').hidden = true;
    if (!g || g.events[g.events.length - 1]?.id !== id) return;
    g.events.pop();
    save();
    render();
  },
  undo: () => {
    const g = currentGame();
    if (!g.events.length) return;
    g.events.pop();
    buzz();
    save();
    render();
  },
  // Match details (not the lineup) can be changed at any time, e.g. after full time.
  'edit-info': () => {
    const g = currentGame();
    const teamId = getTeam(g.teamId) ? g.teamId : defaultTeamId();
    openSheet(`
      <h3>${t('gameInfo')}</h3>
      <form class="form" data-form="game-info">
        ${
          db.teams.length
            ? `<label>${t('team')}
          <select name="teamId">${db.teams
            .filter((tm) => tm.id === teamId || !readOnlyTeam(tm.id))
            .map(
              (tm) =>
                `<option value="${tm.id}" ${tm.id === teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`,
            )
            .join('')}</select>
        </label>`
            : ''
        }
        <label>${t('opponent')}<input name="opponent" autocomplete="off" value="${esc(g.opponent)}"></label>
        <label>${t('homeAway')}
          <select name="home"><option value="1">${t('home')}</option><option value="0" ${g.home === false ? 'selected' : ''}>${t('away')}</option></select>
        </label>
        <label>${t('round')}<input type="number" inputmode="numeric" min="1" name="round" value="${esc(g.round)}"></label>
        <div class="row gap">
          <label class="grow">${t('date')}<input type="date" name="date" value="${esc(g.date)}" required></label>
          <label class="grow">${t('time')}<input type="time" name="time" value="${esc(g.time)}"></label>
        </div>
        <button class="btn primary block">${t('save')}</button>
        <button type="button" class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>
      </form>`);
  },
  'menu-toggle': (_, el) => {
    const list = el.nextElementSibling;
    const open = list.hidden;
    closeMenus();
    list.hidden = !open;
    el.setAttribute('aria-expanded', String(open));
  },
  'delete-game': async () => {
    const g = currentGame();
    if (!g) return;
    const ok = await askConfirm({
      title: t('deleteGameTitle'),
      message: t('confirmDeleteGame'),
      ok: t('deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    db.games = db.games.filter((x) => x !== g);
    save();
    location.hash = '#/games';
  },

  // report
  pdf: () => exportPdf(currentGame()),
  'player-pdf': ({ id }) => exportPlayerPdf(id),

  // stats
  'stats-team': ({ id }) => {
    localStorage.setItem(STATS_TEAM_KEY, id);
    render();
  },
  'stats-season': ({ id }) => {
    localStorage.setItem(STATS_SEASON_KEY, id);
    render();
  },

  // backup
  backup: () =>
    download(
      `fut-academy-backup-${isoDate(new Date())}.json`,
      JSON.stringify(db, null, 2),
      'application/json',
    ),
};

registerActions(actions);
registerActions(gamesPage.actions);
registerActions(adminPage.actions);
registerForms(adminPage.forms);
registerActions(profilePage.actions);
registerActions(teamPage.actions);
installActionListener({
  ignore: () => drag.suppressClick, // the click that ends a drag
  allow: (name) => {
    if (READ_ONLY_OK.has(name) || !viewReadOnly()) return true;
    refuseReadOnly();
    return false;
  },
});

document.addEventListener('input', (e) => {
  const { fix: fk, team: tk, field: fd } = e.target.dataset;
  if ((fk || tk || fd) && viewReadOnly()) return refuseReadOnly();
  const fixKey = e.target.dataset.fix;
  if (fixKey && fix) {
    const g = currentGame();
    const v = e.target.value === '' ? null : Number(e.target.value);
    if (fixKey === 'end')
      fix.end = v == null ? Math.min(g.periodMin, fixLimits(g).maxMin) : v - periodOffsetMin(g);
    else fix.started = v;
    for (const b of $$(`#sheet .pick[data-action="fix-${fixKey}"]`)) b.classList.remove('on');
    $('#fix-preview').textContent = fixPreview(g);
    return;
  }
  const teamKey = e.target.dataset.team;
  if (teamKey) {
    const tm = getTeam(route().id);
    if (!tm) return;
    tm[teamKey] = e.target.value.trim();
    syncGameTeams(db, tm.id);
    save();
    $('.bar h1').textContent = teamLabel(tm);
    return;
  }
  const field = e.target.dataset.field;
  if (!field || !draft) return;
  draft[field] = e.target.value;
  if (field === 'formatId') {
    const f = FORMATS.find((x) => x.id === draft.formatId);
    if (f && f.id !== 'Custom')
      Object.assign(draft, { field: f.field, periods: f.periods, periodMin: f.periodMin });
    render();
  } else if (field === 'teamId') {
    draft.sel = {};
    draft.gkId = null;
    render();
  } else if (field === 'field') {
    $('#squad-count').innerHTML = squadCount();
  }
});

document.addEventListener('change', async (e) => {
  const { change, id, tid } = e.target.dataset; // (data-tid: data-team is the team screen's inputs)
  // Admin page: account type and team roles (RLS lets only the admin change them).
  if (change === 'admin-kind') {
    return adminDo(async () => {
      const rows = await q(
        sb.from('accounts').update({ kind: e.target.value }).eq('user_id', id).select('user_id'),
      );
      if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
    }, t('kindChanged'));
  }
  if (change === 'admin-role') {
    return adminDo(
      async () => {
        const rows = await q(
          sb
            .from('team_members')
            .update({ role: e.target.value })
            .eq('team_id', tid)
            .eq('user_id', id)
            .select('user_id'),
        );
        if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
      },
      t('roleChanged'),
      true,
    );
  }
  if (change !== 'restore') return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.players) || !Array.isArray(data.games)) throw new Error('bad file');
    const ok = await askConfirm({
      title: t('importBackup'),
      message: t('confirmRestore', { p: data.players.length, g: data.games.length }),
      ok: t('restoreBtn'),
    });
    if (!ok) return;
    // Cloud teams aren't replaced by a backup (that would delete them in the cloud): they and
    // the sync state stay as they are; the backup replaces the teams on this phone.
    delete data.sync; // another phone's (or person's) sync state
    // Damaged or implausible records in the file are left out (and counted).
    const skipped = dropInvalid(data, checkIncoming, Date.now());
    if (skipped.length) console.warn('Backup: records left out', skipped);
    const restored = normalize(data);
    const cloudIds = new Set(Object.keys(db.sync.teams));
    for (const kind of RECORD_KINDS) {
      restored[kind] = restored[kind]
        .filter((r) => !cloudIds.has(teamIdOf(kind, r)))
        .concat(db[kind].filter((r) => cloudIds.has(teamIdOf(kind, r))));
    }
    Object.assign(restored, { sync: db.sync, deleted: db.deleted });
    setDb(restored);
    save();
    render();
    toast(skipped.length ? `${t('restored')} · ${plural('skippedN', skipped.length)}` : t('restored'));
  } catch {
    notify(t('badBackup'));
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  if (!READ_ONLY_FORMS.has(form) && viewReadOnly()) return refuseReadOnly();
  const data = new FormData(e.target);
  const handler = formHandler(form);
  if (handler) return handler(data, e.target);
  if (form === 'add-coach') {
    // Directors only (the form isn't shown to coaches; the database checks it too).
    if (roleOf(route().id) !== 'director') return refuseReadOnly();
    teamOpen.staff = true; // the result shows in the Staff section
    render();
    return addCoach(route().id, String(data.get('email')).trim().toLowerCase());
  }
  if (form === 'signin-email') return sendCode(String(data.get('email')).trim().toLowerCase());
  if (form === 'signin-password')
    return signInPassword(String(data.get('email')).trim().toLowerCase(), String(data.get('password')));
  if (form === 'set-password')
    return setPassword(String(data.get('password')), String(data.get('password2')));
  if (form === 'signin-code') return verifyCode(String(data.get('code')).replace(/\D/g, ''));
  if (form === 'upload-teams') {
    closeSheet();
    const ids = data.getAll('team').map(String);
    if (ids.length) uploadTeams(ids);
    return;
  }
  if (form === 'game-info') {
    const g = currentGame();
    const tm = getTeam(data.get('teamId'));
    const round = parseInt(data.get('round'), 10);
    Object.assign(g, {
      opponent: String(data.get('opponent')).trim(),
      home: data.get('home') === '1',
      round: round >= 1 ? String(round) : '',
      date: data.get('date') || g.date,
      time: data.get('time'),
    });
    if (tm) Object.assign(g, { teamId: tm.id, club: tm.club, team: tm.name });
    save();
    render();
    return;
  }
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const number = String(data.get('number') || '').trim();
  const full = String(data.get('fullName') || '').trim();
  if (form === 'edit-player') {
    Object.assign(
      db.players.find((x) => x.id === e.target.dataset.id),
      { name, number, fullName: full },
    );
    save();
    render();
    return;
  }
  const teamId = form === 'add-player-draft' ? draft.teamId : route().id;
  const p = { id: uid(), name, number, fullName: full, teamId };
  db.players.push(p);
  save();
  if (form === 'add-player-draft') draft.sel[p.id] = 'bench';
  if (form === 'add-player') teamOpen.players = true;
  render();
  if (form === 'add-player') {
    // The sheet stays open, empty, for the next player.
    openAddPlayer(name);
    return;
  }
  main.querySelector('[data-form="add-player-draft"] input[name="name"]')?.focus();
});

// ---------- Drag a player onto another to substitute ----------
// Hold a player briefly, then drag onto a player in the other group (bench <-> pitch) to sub,
// or onto another pitch player / empty spot to swap positions.
// A quick swipe still scrolls the page; a plain tap still opens the player sheet.

const drag = {
  timer: null,
  active: false,
  moved: false,
  from: null,
  x0: 0,
  y0: 0,
  dx: 0,
  dy: 0,
  ghost: null,
  target: null,
  suppressClick: false,
};

function chipAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.chip');
  return el && !el.disabled ? el : null;
}

// 'sub' (bench <-> pitch), 'move' (pitch -> pitch spot) or null.
function dropKind(from, to) {
  const spot = (el) => el.classList.contains('tok') || el.classList.contains('slot-empty');
  if (spot(from) && spot(to)) {
    if (to.classList.contains('slot-empty') && from.classList.contains('gk')) return null;
    return 'move';
  }
  if (to.classList.contains('slot-empty')) return null;
  return from.classList.contains('on') !== to.classList.contains('on') ? 'sub' : null;
}

function dragStart(chip, x, y) {
  if (chip.disabled || !chip.dataset.id || route().view !== 'game' || readOnlyGame(currentGame())) return;
  Object.assign(drag, { from: chip, x0: x, y0: y, moved: false, target: null });
  drag.timer = setTimeout(() => {
    drag.active = true;
    buzz();
    // Keep the point where the player was grabbed under the finger (a pitch token's circle is
    // at its top, so centring the token on the finger would make the circle jump up).
    const r = chip.getBoundingClientRect();
    drag.dx = x - r.left;
    drag.dy = y - r.top;
    const ghost = chip.cloneNode(true);
    ghost.className += ' ghost';
    Object.assign(ghost.style, {
      width: `${chip.offsetWidth}px`,
      left: `${r.left}px`,
      top: `${r.top}px`,
      transformOrigin: `${drag.dx}px ${drag.dy}px`,
    });
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    chip.classList.add('dragging');
    document.body.classList.add('is-dragging', chip.classList.contains('on') ? 'from-on' : 'from-bench');
  }, 220);
}

function dragMove(x, y, e) {
  if (!drag.from) return;
  if (!drag.active) {
    if (Math.hypot(x - drag.x0, y - drag.y0) > 10) dragCancel();
    return;
  }
  e.preventDefault();
  drag.moved = true;
  drag.ghost.style.left = `${x - drag.dx}px`;
  drag.ghost.style.top = `${y - drag.dy}px`;
  const t = chipAt(x, y);
  const valid = t && t !== drag.from && dropKind(drag.from, t);
  drag.target?.classList.remove('drop');
  drag.target = valid ? t : null;
  drag.target?.classList.add('drop');
}

function dragEnd() {
  if (!drag.from) return;
  const { active, moved, from, target } = drag;
  dragCancel();
  if (!active) return;
  drag.suppressClick = true;
  setTimeout(() => (drag.suppressClick = false), 400);
  const g = currentGame();
  if (target && dropKind(from, target) === 'move') {
    movePlayer(g, from.dataset.id, Number(target.dataset.slot));
  } else if (target) {
    const fromOn = from.classList.contains('on');
    const [out, inn] = fromOn ? [from.dataset.id, target.dataset.id] : [target.dataset.id, from.dataset.id];
    doSub(g, out, inn);
  } else if (!moved) {
    openPlayerSheet(g, from.dataset.id);
  }
}

function dragCancel() {
  clearTimeout(drag.timer);
  drag.ghost?.remove();
  drag.from?.classList.remove('dragging');
  drag.target?.classList.remove('drop');
  document.body.classList.remove('is-dragging', 'from-on', 'from-bench');
  Object.assign(drag, { timer: null, active: false, from: null, ghost: null, target: null });
}

document.addEventListener(
  'touchstart',
  (e) => {
    const chip = e.target.closest('.chip');
    if (chip && e.touches.length === 1) dragStart(chip, e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: true },
);
document.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX, e.touches[0].clientY, e), {
  passive: false,
});
document.addEventListener('touchend', dragEnd);
document.addEventListener('touchcancel', dragCancel);

// Mouse version, handy when testing on a computer.
document.addEventListener('mousedown', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && e.button === 0) dragStart(chip, e.clientX, e.clientY);
});
document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY, e));
document.addEventListener('mouseup', dragEnd);

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.chip')) e.preventDefault();
});

// ---------- Keep the screen on during a live game ----------

function updateWakeLock() {
  const { view, id } = route();
  const g = view === 'game' && getGame(id);
  keepScreenOn(!!g && g.status === 'live');
}

document.addEventListener('visibilitychange', updateWakeLock);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenus();
});

// ---------- Start ----------

/** Draws the first screen (called once by app/main.ts). */
export function start() {
  render();
  askPersistence();
  if (loadRejected.length) toast(plural('skippedN', loadRejected.length));
  tick(); // apply any auto-stop that was due while the app was closed
}
