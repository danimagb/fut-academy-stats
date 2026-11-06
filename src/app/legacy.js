import { currentGame } from '@/data/queries';
import { statsPage } from '@/pages/stats/stats';
import { reportPage } from '@/pages/report/report';
import {
  tick,
  openPlayerSheet,
  fix,
  periodOffsetMin,
  fixLimits,
  fixPreview,
  gamePage,
} from '@/pages/game/game';
import { draft, resetDraft, squadCount, gameEditPage } from '@/pages/game-edit/game-edit';
import { doSub, movePlayer } from '@/features/live-game/live-game';
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
import { readOnlyGame, readOnlyTeam } from '@/data/access';
import { refuseReadOnly } from '@/features/team-access/read-only';
import { askPersistence, save } from '@/data/save';
import { getGame, getTeam } from '@/data/queries';
import { canSync, canUpload, cloud, sb, syncNow } from '@/data/session';
import { plural } from '@/shared/i18n/i18n';
import { setRerender } from '@/shared/lib/rerender';
import { formHandler, installActionListener, registerActions, registerForms } from '@/app/actions';
import { addViews, onRender, render, route, setFallbackView } from '@/app/router';
import { gamesPage, viewGames } from '@/pages/games/games';
import { keepScreenOn } from '@/app/wake-lock';
import { buzz, download } from '@/shared/lib/device';
import { closeMenus } from '@/shared/ui/bar';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { closeSheet } from '@/shared/ui/sheet';
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
import { isoDate } from '@/shared/lib/format';
import { FORMATS } from '@/domain/formats';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';

// ---------- Config ----------

// ---------- Language ----------

initLanguage();

// ---------- Theme ----------

initTheme();

// ---------- Storage ----------

initStore();

// ---------- Helpers ----------

const main = $('#main');

// ---------- Clock ----------
// Match time (e.t, marks, clock) counts only time actually played, so minutes
// played add up. The clock shown to the coach restarts every period at its
// regular start (2nd half at 20:00), and extra time shows as "20:00 (+02:00)".

// ---------- Routing ----------

addViews({});
// Screens already moved to pages/ (see docs/typescript-plan.md, step 6).
addViews(gamesPage.views);
addViews(adminPage.views);
addViews(profilePage.views);
addViews(teamPage.views);
addViews(gameEditPage.views);
addViews(gamePage.views);
addViews(reportPage.views);
addViews(statsPage.views);
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
  resetDraft();
  Object.assign(remote, { people: null, admin: null }); // online screens load again when opened
  render();
  window.scrollTo(0, 0);
});

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

// The clock on the game screen, reminders and auto-stop: once a second.
setInterval(tick, 1000);

// ---------- Report ----------

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

  // clock

  // player actions
  // Fix a goal given to the wrong player: pick who was on the pitch at that moment, or remove it.
  // Match details (not the lineup) can be changed at any time, e.g. after full time.
  'menu-toggle': (_, el) => {
    const list = el.nextElementSibling;
    const open = list.hidden;
    closeMenus();
    list.hidden = !open;
    el.setAttribute('aria-expanded', String(open));
  },

  // report

  // stats

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
registerActions(gameEditPage.actions);
registerActions(gamePage.actions);
registerActions(reportPage.actions);
registerActions(statsPage.actions);
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
