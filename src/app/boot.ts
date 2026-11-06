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
import { showSyncStatus } from '@/features/sync-status/sync-status';
import { setClubRole, setTeamRole } from '@/pages/admin/admin';
import { adminPage } from '@/pages/admin/admin';
import { clubPage } from '@/pages/club/club';
import { $, $$ } from '@/shared/lib/dom';
import { filterStaff, remote, loadPeople, setStaffRole } from '@/features/team-people/team-people';
import { ONLINE_ACTIONS, ONLINE_FORMS, needsInternet, refuseOffline } from '@/app/online-only';
import { offlineNow } from '@/data/online';

let wasOffline = false;
import { refuseReadOnly } from '@/features/team-access/read-only';
import { saveToCloud } from '@/features/cloud-save/cloud-save';
import { askPersistence } from '@/data/save';
import { getGame, getTeam } from '@/data/queries';
import { canSync, cloud, sb, signInGate, syncNow } from '@/data/session';
import { plural } from '@/shared/i18n/i18n';
import { setRerender } from '@/shared/lib/rerender';
import {
  actionHandler,
  formHandler,
  installActionListener,
  registerActions,
  registerForms,
} from '@/app/actions';
import { addViews, gated, onRender, render, route, setFallbackView, setGate } from '@/app/router';
import { viewWelcome } from '@/pages/welcome/welcome';
import { gamesPage, viewGames } from '@/pages/games/games';
import { keepScreenOn } from '@/app/wake-lock';
import { closeMenus } from '@/shared/ui/bar';
import { askConfirm } from '@/shared/ui/dialog';
import { closeSheet } from '@/shared/ui/sheet';
import { toast } from '@/shared/ui/toast';
import { configureSync } from '@/data/sync';
import { refreshLogos } from '@/data/logos';
import { uid } from '@/shared/lib/id';
import { db, initStore, isCloudTeam, loadRejected } from '@/data/store';
import { FORMATS } from '@/domain/formats';
import { t } from '@/shared/i18n/i18n';
import type { MessageKey } from '@/shared/i18n/i18n';
import type { Player } from '@/domain/types';
import type { Draft } from '@/pages/game-edit/game-edit';
import type { ActionHandler } from '@/app/actions';

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
/** The tab bar, except while the welcome screen (sign-in) is shown. */
function showTabbar(view: string): void {
  const signingIn = gated();
  document.body.classList.toggle('gated', signingIn);
  if (!signingIn) renderTabbar(view);
}

export function boot(): void {
  initLanguage();

  initTheme();

  initStore();

  // Screens already moved to pages/ (see docs/typescript-plan.md, step 6).
  addViews(gamesPage.views);
  addViews(adminPage.views);
  addViews(clubPage.views);
  addViews(profilePage.views);
  addViews(teamPage.views);
  addViews(gameEditPage.views);
  addViews(gamePage.views);
  addViews(reportPage.views);
  addViews(statsPage.views);
  setFallbackView(viewGames);
  // The app needs an account: until signed in with access, every route shows the welcome screen.
  setGate(() => (signInGate() ? viewWelcome : null));
  onRender({
    before: () => {
      markRendered();
      closeSheet();
    },
    after: ({ view }) => {
      showTabbar(view);
      updateWakeLock();
    },
  });

  window.addEventListener('hashchange', () => {
    resetDraft();
    Object.assign(remote, { people: null, admin: null, club: null }); // online screens load again when opened
    render();
    window.scrollTo(0, 0);
  });

  watchAuth();

  configureSync({
    client: sb,
    canSync,
    userId: () => cloud.session?.user?.id ?? null,
    request: () => syncNow(),
    onStatus: () => {
      showSyncStatus();
      // Reaching (or losing) the server changes what can be edited: redraw when that flips.
      const off = offlineNow();
      if (off !== wasOffline) {
        wasOffline = off;
        renderSoon();
      }
    },
    onChange: () => renderSoon(),
    onRejected: (n) => toast(plural('skippedN', n)),
    afterSync: () => {
      // Club logos whose version changed (downloaded once, then kept on the phone).
      void refreshLogos().then((changed) => {
        if (changed) renderSoon();
      });
      // The team screen was waiting for its upload to show People.
      const ppl = remote.people;
      if (ppl?.status === 'uploading' && !db.sync.uploads.includes(ppl.teamId) && isCloudTeam(ppl.teamId))
        void loadPeople(ppl.teamId);
    },
  });

  setInterval(() => {
    if (renderPending && canRenderNow()) render();
  }, 1500);
  setRerender({ now: () => render(), soon: () => renderSoon(), tabbar: () => showTabbar(route().view) });

  // When to sync: coming back to the app, the network returning, and every minute while open.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void syncNow();
  });
  // Going on- or offline changes what can be edited (online-only.ts): redraw, then sync.
  window.addEventListener('online', () => {
    renderSoon();
    void syncNow();
  });
  window.addEventListener('offline', () => renderSoon());
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
  registerActions(clubPage.actions);
  registerForms(clubPage.forms);
  registerActions(profilePage.actions);
  registerActions(teamPage.actions);
  registerForms(teamPage.forms);
  registerActions(gameEditPage.actions);
  registerActions(gamePage.actions);
  registerActions(reportPage.actions);
  registerActions(statsPage.actions);
  installActionListener({
    ignore: () => drag.suppressClick, // the click that ends a drag
    allow: (name) => {
      if (ONLINE_ACTIONS.has(name) && needsInternet(name)) {
        refuseOffline();
        return false;
      }
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
    if (el.dataset.filter === 'staff') return filterStaff(el.value);
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
    // Pickers (<select data-pick="action">): run the action with the chosen value.
    const pick = el.dataset.pick ? actionHandler(el.dataset.pick) : undefined;
    if (pick) return void pick({ ...el.dataset, id: el.value }, el);
    const { change, id = '', tid = '' } = el.dataset;
    if (!change) return;
    // Admin page: club and team roles (RLS lets only the admin change them).
    const { cid = '' } = el.dataset;
    if (change === 'admin-club-role') return setClubRole(cid, id, el.value);
    if (change === 'admin-role') return setTeamRole(tid, id, el.value);
    // Team screen: a club manager changes someone's role in the team.
    if (change === 'staff-role') {
      const teamId = route().id;
      return teamId ? setStaffRole(teamId, id, el.value) : undefined;
    }
  });

  document.addEventListener('submit', async (e) => {
    const formEl = e.target as HTMLFormElement;
    const form = formEl.dataset.form;
    if (!form) return;
    e.preventDefault();
    if (!READ_ONLY_FORMS.has(form) && viewReadOnly()) return refuseReadOnly();
    if (ONLINE_FORMS.has(form) && needsInternet(form)) return refuseOffline();
    const data = new FormData(formEl);
    const handler = formHandler(form);
    if (handler) return void handler(data, formEl);
    if (form === 'signin-email') return void sendCode(String(data.get('email')).trim().toLowerCase());
    if (form === 'signin-password')
      return void signInPassword(
        String(data.get('email')).trim().toLowerCase(),
        String(data.get('password')),
      );
    if (form === 'set-password')
      return void setPassword(String(data.get('password')), String(data.get('password2')));
    if (form === 'signin-code') return void verifyCode(String(data.get('code')).replace(/\D/g, ''));
    if (form === 'game-info') {
      const g = currentGame();
      if (!g) return;
      const tm = getTeam(String(data.get('teamId') ?? ''));
      const round = parseInt(String(data.get('round') ?? ''), 10);
      const round_ = round >= 1 ? String(round) : '';
      return void saveToCloud(() => {
        Object.assign(g, {
          opponent: String(data.get('opponent')).trim(),
          home: data.get('home') === '1',
          round: round_,
          date: String(data.get('date') ?? '') || g.date,
          time: String(data.get('time') ?? ''),
        });
        if (tm) Object.assign(g, { teamId: tm.id, club: tm.club, team: tm.name });
      }).then(() => render());
    }
    const name = String(data.get('name') || '').trim();
    if (!name) return;
    const number = String(data.get('number') || '').trim();
    const full = String(data.get('fullName') || '').trim();
    if (form === 'edit-player') {
      const p = db.players.find((x) => x.id === formEl.dataset.id);
      if (!p) return;
      return void saveToCloud(() => Object.assign(p, { name, number, fullName: full })).then((ok) => {
        if (ok) closeSheet();
        render();
      });
    }
    const teamId = form === 'add-player-draft' ? draft?.teamId : route().id;
    if (!teamId) return;
    const p: Player = { id: uid(), name, number, fullName: full, teamId };
    if (!(await saveToCloud(() => db.players.push(p)))) return;
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
