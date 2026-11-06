import { renderPending, canRenderNow, renderSoon, markRendered } from '@/app/redraw';
import { viewReadOnly, READ_ONLY_OK, READ_ONLY_FORMS } from '@/app/read-only';
import { renderTabbar } from '@/app/tabbar';
import { drag, installDrag } from '@/pages/game/drag';
import { currentGame } from '@/data/queries';
import { statsPage } from '@/pages/stats/stats';
import { reportPage } from '@/pages/report/report';
import { tick, fix, periodOffsetMin, fixLimits, fixPreview, gamePage } from '@/pages/game/game';
import { draft, resetDraft, squadCount, gameEditPage } from '@/pages/game-edit/game-edit';
import { teamOpen, openAddPlayer, teamPage } from '@/pages/team/team';
import { profilePage } from '@/pages/profile/profile';
import { initTheme } from '@/features/theme-switch/theme';
import { initLanguage } from '@/features/language-switch/language';
import { watchAuth, sendCode, verifyCode, signInPassword, setPassword } from '@/features/sign-in/sign-in';
import { uploadTeams, offerUpload } from '@/features/upload-teams/upload-teams';
import { showSyncStatus } from '@/features/sync-status/sync-status';
import { setClubRole, setTeamRole } from '@/pages/admin/admin';
import { adminPage } from '@/pages/admin/admin';
import { $, $$ } from '@/shared/lib/dom';
import { remote, loadPeople, addCoach } from '@/features/team-people/team-people';
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
import { download } from '@/shared/lib/device';
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
import type { MessageKey } from '@/shared/i18n/i18n';
import type { Db, Player, RecordKind } from '@/domain/types';
import type { Draft } from '@/pages/game-edit/game-edit';
import type { ActionHandler } from '@/app/actions';

type AnyRecord = { id: string; teamId?: string };
/** A store's records of one kind, as one list type (the backup restore treats them alike). */
const list = (from: Db, kind: RecordKind): AnyRecord[] => from[kind];

// Wiring of the whole app (step 6 moved the screens into pages/ and features/). boot() runs once
// at startup, from app/main.ts; importing this module does nothing else.

const main = $('#main') as HTMLElement; // in index.html

// Actions that belong to no single screen.
const actions: Record<string, ActionHandler> = {
  'close-sheet': () => closeSheet(),
  soon: ({ v }) =>
    askConfirm({
      title: t('soonTitle'),
      message: t('soonMsg', { x: t(v as MessageKey) }),
      ok: t('ok'),
      cancel: false,
    }),

  // Signed in as a club manager: new teams are cloud teams of that club straight away.

  // Fix a goal given to the wrong player: pick who was on the pitch at that moment, or remove it.
  'menu-toggle': (_, el) => {
    const list = el.nextElementSibling as HTMLElement | null;
    if (!list) return;
    const open = list.hidden;
    closeMenus();
    list.hidden = !open;
    el.setAttribute('aria-expanded', String(open));
  },

  // backup
  backup: () =>
    download(
      `fut-academy-backup-${isoDate(new Date())}.json`,
      JSON.stringify(db, null, 2),
      'application/json',
    ),
};

// ---------- Keep the screen on during a live game ----------

function updateWakeLock(): void {
  const { view, id } = route();
  const g = view === 'game' ? getGame(id) : undefined;
  keepScreenOn(!!g && g.status === 'live');
}

// ---------- Start ----------

/** Draws the first screen (called once by app/main.ts). */
export function start(): void {
  render();
  askPersistence();
  if (loadRejected.length) toast(plural('skippedN', loadRejected.length));
  tick(); // apply any auto-stop that was due while the app was closed
}

/** Connects everything: screens, actions, listeners, sync and timers (once, at startup). */
export function boot(): void {
  initLanguage();

  initTheme();

  initStore();

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
      markRendered();
      closeSheet();
    },
    after: ({ view }) => {
      renderTabbar(view);
      updateWakeLock();
    },
  });

  window.addEventListener('hashchange', () => {
    resetDraft();
    Object.assign(remote, { people: null, admin: null }); // online screens load again when opened
    render();
    window.scrollTo(0, 0);
  });

  watchAuth();

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
        void loadPeople(ppl.teamId);
      // First sync on this phone (director accounts): offer to upload the teams on this phone.
      if (firstOk && canUpload() && localTeams().length) offerUpload();
    },
  });

  setInterval(() => {
    if (renderPending && canRenderNow()) render();
  }, 1500);
  setRerender({ now: () => render(), soon: () => renderSoon(), tabbar: () => renderTabbar(route().view) });

  // When to sync: coming back to the app, the network returning, and every minute while open.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void syncNow();
  });
  window.addEventListener('online', () => void syncNow());
  setInterval(() => {
    if (document.hidden || !canSync()) return;
    void syncNow();
    showSyncStatus();
  }, 60000);

  // The clock on the game screen, reminders and auto-stop: once a second.
  setInterval(tick, 1000);

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
    const el = e.target as HTMLInputElement; // inputs and selects
    if (!el.dataset) return;
    const { fix: fk, team: tk, field: fd } = el.dataset;
    if ((fk || tk || fd) && viewReadOnly()) return refuseReadOnly();
    const fixKey = el.dataset.fix;
    const g = currentGame();
    if (fixKey && fix && g) {
      const v = el.value === '' ? null : Number(el.value);
      if (fixKey === 'end')
        fix.end = v == null ? Math.min(g.periodMin, fixLimits(g).maxMin) : v - periodOffsetMin(g);
      else fix.started = v;
      for (const b of $$(`#sheet .pick[data-action="fix-${fixKey}"]`)) b.classList.remove('on');
      const preview = $('#fix-preview');
      if (preview) preview.textContent = fixPreview(g);
      return;
    }
    const teamKey = el.dataset.team;
    if (teamKey === 'club' || teamKey === 'name') {
      const tm = getTeam(route().id);
      if (!tm) return;
      tm[teamKey] = el.value.trim();
      syncGameTeams(db, tm.id);
      save();
      const title = $('.bar h1');
      if (title) title.textContent = teamLabel(tm);
      return;
    }
    const field = el.dataset.field;
    const d = draft;
    if (!field || !d) return;
    // The form's text fields (see data-field in pages/game-edit); the number ones are read on save.
    (d as Record<string, unknown>)[field] = el.value;
    if (field === 'formatId') {
      const f = FORMATS.find((x) => x.id === d.formatId);
      if (f && f.id !== 'Custom')
        Object.assign(d, {
          field: f.field,
          periods: f.periods,
          periodMin: f.periodMin,
        } satisfies Partial<Draft>);
      render();
    } else if (field === 'teamId') {
      d.sel = {};
      d.gkId = null;
      render();
    } else if (field === 'field') {
      const count = $('#squad-count');
      if (count) count.innerHTML = squadCount();
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target as HTMLInputElement; // selects and the backup file input
    if (!el.dataset) return;
    const { change, id = '', tid = '' } = el.dataset; // (data-tid: data-team is the team screen's inputs)
    // Admin page: club and team roles (RLS lets only the admin change them).
    const { cid = '' } = el.dataset;
    if (change === 'admin-club-role') return setClubRole(cid, id, el.value);
    if (change === 'admin-role') return setTeamRole(tid, id, el.value);
    if (change !== 'restore') return;
    const file = el.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown> & {
        players?: unknown;
        games?: unknown;
        sync?: unknown;
      };
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
        (restored as Record<RecordKind, AnyRecord[]>)[kind] = list(restored, kind)
          .filter((r) => !cloudIds.has(teamIdOf(kind, r)))
          .concat(list(db, kind).filter((r) => cloudIds.has(teamIdOf(kind, r))));
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
    const formEl = e.target as HTMLFormElement;
    const form = formEl.dataset.form;
    if (!form) return;
    e.preventDefault();
    if (!READ_ONLY_FORMS.has(form) && viewReadOnly()) return refuseReadOnly();
    const data = new FormData(formEl);
    const handler = formHandler(form);
    if (handler) return void handler(data, formEl);
    if (form === 'add-coach') {
      // Club managers only (the form isn't shown to others; the database checks it too).
      const teamId = route().id;
      if (!teamId || roleOf(teamId) !== 'club_manager') return refuseReadOnly();
      teamOpen.staff = true; // the result shows in the Staff section
      render();
      return void addCoach(teamId, String(data.get('email')).trim().toLowerCase());
    }
    if (form === 'signin-email') return void sendCode(String(data.get('email')).trim().toLowerCase());
    if (form === 'signin-password')
      return void signInPassword(
        String(data.get('email')).trim().toLowerCase(),
        String(data.get('password')),
      );
    if (form === 'set-password')
      return void setPassword(String(data.get('password')), String(data.get('password2')));
    if (form === 'signin-code') return void verifyCode(String(data.get('code')).replace(/\D/g, ''));
    if (form === 'upload-teams') {
      closeSheet();
      const ids = data.getAll('team').map(String);
      if (ids.length) uploadTeams(ids, String(data.get('club') ?? ''));
      return;
    }
    if (form === 'game-info') {
      const g = currentGame();
      if (!g) return;
      const tm = getTeam(String(data.get('teamId') ?? ''));
      const round = parseInt(String(data.get('round') ?? ''), 10);
      Object.assign(g, {
        opponent: String(data.get('opponent')).trim(),
        home: data.get('home') === '1',
        round: round >= 1 ? String(round) : '',
        date: String(data.get('date') ?? '') || g.date,
        time: String(data.get('time') ?? ''),
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
      const p = db.players.find((x) => x.id === formEl.dataset.id);
      if (!p) return;
      Object.assign(p, { name, number, fullName: full });
      save();
      render();
      return;
    }
    const teamId = form === 'add-player-draft' ? draft?.teamId : route().id;
    if (!teamId) return;
    const p: Player = { id: uid(), name, number, fullName: full, teamId };
    db.players.push(p);
    save();
    if (form === 'add-player-draft' && draft) draft.sel[p.id] = 'bench';
    if (form === 'add-player') teamOpen.players = true;
    render();
    if (form === 'add-player') {
      // The sheet stays open, empty, for the next player.
      openAddPlayer(name);
      return;
    }
    main.querySelector<HTMLInputElement>('[data-form="add-player-draft"] input[name="name"]')?.focus();
  });

  installDrag();

  document.addEventListener('visibilitychange', updateWakeLock);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenus();
  });
}
