// The Teams list and a team's screen (club, age group, players, staff).
import { save } from '@/data/save';
import { syncNow } from '@/data/session';
import { pendingCount } from '@/data/sync';
import { accessError, deleteMember, myId, setPeopleMsg } from '@/features/team-people/team-people';
import { uploadTeams } from '@/features/upload-teams/upload-teams';
import { uid } from '@/shared/lib/id';
import { rerender } from '@/shared/lib/rerender';
import { route } from '@/shared/lib/route';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { teamBadge } from '@/features/sync-status/sync-status';
import { $ } from '@/shared/lib/dom';
import { loadPeople, peopleHtml, remote, showPeople, staffSummary } from '@/features/team-people/team-people';
import { readOnlyTeam } from '@/data/access';
import { readOnlyPill } from '@/features/team-access/read-only';
import { getTeam, teamPlayers } from '@/data/queries';
import { canSync, canUpload, cloud } from '@/data/session';
import { managedClubs } from '@/data/auth';
import { plural } from '@/shared/i18n/i18n';
import { bar } from '@/shared/ui/bar';
import { openSheet } from '@/shared/ui/sheet';
import { roleOf } from '@/data/sync';
import { db, isCloudTeam } from '@/data/store';
import { esc } from '@/shared/lib/html';
import { byNumber } from '@/domain/players';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { main } from '@/shared/ui/main';
import type { Team } from '@/domain/types';

// ---------- Views: teams and their players ----------

export function viewTeams(): void {
  main.innerHTML = `
    ${bar(t('teams'), '#/games')}
    <button class="btn primary block" data-action="new-team">${t('newTeam')}</button>
    ${
      db.teams.length
        ? `<ul class="list">${db.teams
            .map(
              (tm) => `
      <li><a class="card" href="#/team/${tm.id}">
        <div class="grow">
          <strong>${esc(teamLabel(tm))}</strong>
        </div>
        <div class="right">
          <span class="badge">${t('playersCount', { n: teamPlayers(tm.id).length })}</span>
          ${teamBadge(tm)}
        </div>
      </a></li>`,
            )
            .join('')}</ul>`
        : `<p class="empty">${t('noTeams')}</p>`
    }`;
}

export let newCloudTeam: string | null = null; // id of a team just created as a cloud team (shows a note once)

export function viewTeam(teamId: string | undefined): void {
  const tm = getTeam(teamId);
  if (!tm) return viewTeams();
  const id = tm.id;
  const ps = teamPlayers(id).sort(byNumber);
  const ro = readOnlyTeam(id);
  const cloudTeam = isCloudTeam(id);
  const field = (key: 'club' | 'name', label: string, ph: string): string =>
    ro
      ? `<div class="ro-field"><span class="muted small">${label}</span><div>${esc(tm[key]) || '–'}</div></div>`
      : `<label>${label}<input data-team="${key}" value="${esc(tm[key])}" placeholder="${ph}" autocomplete="off"></label>`;
  main.innerHTML = `
    ${bar(esc(teamLabel(tm)), '#/teams', teamMenu(id, ro), ro ? readOnlyPill() : '')}
    ${teamBadge(tm) ? `<div class="team-kind">${teamBadge(tm)}</div>` : ''}
    ${ro ? `<p class="hint">${t('readOnlyHint')}</p>` : ''}
    ${newCloudTeam === id && cloudTeam ? `<p class="hint ok">☁️ ${t('newTeamCloud')}</p>` : ''}
    <div class="form">
      ${field('club', t('club'), t('clubPh'))}
      ${field('name', t('ageGroup'), t('teamPh'))}
    </div>
    ${
      canUpload() && !cloudTeam
        ? `<div class="upload-team">
      <button class="btn block" data-action="upload-team">${t('uploadTeam')}</button>
      <p class="hint">${t('uploadTeamHint')}</p>
    </div>`
        : ''
    }
    <div class="accordion team-sections">
    ${teamSection(
      'players',
      t('players'),
      plural('playersCount', ps.length),
      ro ? '' : 'add-player',
      ps.length
        ? `<ul class="list">${ps
            .map(
              (p) => `
      <li class="item">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}${p.fullName ? `<div class="muted small">${esc(p.fullName)}</div>` : ''}</span>
        ${
          ro
            ? ''
            : `<button class="btn small ghost" data-action="edit-player" data-id="${p.id}">${t('edit')}</button>
        <button class="btn small ghost danger" data-action="delete-player" data-id="${p.id}" aria-label="✕">✕</button>`
        }
      </li>`,
            )
            .join('')}</ul>`
        : `<p class="empty">${t('noPlayers')}</p>`,
    )}
    ${
      cloudTeam
        ? teamSection(
            'staff',
            t('people'),
            staffSummary(id),
            roleOf(id) === 'club_manager' && canSync() ? 'add-coach' : '',
            `<div id="people" class="people-section">${peopleHtml(id)}</div>`,
          )
        : ''
    }
    </div>`;
  // Members are loaded online, once per visit of this screen (and after changes).
  if (cloudTeam && canSync()) {
    if (db.sync.uploads.includes(id)) {
      remote.people = { teamId: id, status: 'uploading', members: [], msg: null };
      showPeople();
    } else if (remote.people?.teamId !== id || remote.people.status === 'uploading') void loadPeople(id);
  }
}

// Players and Staff on the team screen are collapsible sections, both closed by default
// (each remembered while the app is open). `add` is the action of the section's ＋ button.
export const teamOpen: Record<string, boolean> = { players: false, staff: false };

export function teamSection(id: string, title: string, summary: string, add: string, body: string): string {
  const open = teamOpen[id];
  return `
    <section class="acc ${open ? 'open' : ''}">
      <div class="acc-top">
        <button class="acc-head" data-action="team-section" data-v="${id}" aria-expanded="${open}" aria-controls="acc-${id}">
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          <span class="grow"><span class="acc-title">${title}</span><span class="acc-sum" id="${id}-sum">${esc(summary)}</span></span>
        </button>
        ${add ? `<button class="btn small acc-add" data-action="${add}">＋ ${t('add')}</button>` : ''}
      </div>
      <div class="acc-body" id="acc-${id}" ${open ? '' : 'hidden'}>${body}</div>
    </section>`;
}

// The ⋯ menu of the team screen: for now only Delete team (for whoever may change the team).
export const teamMenu = (_id: string, ro: boolean): string =>
  ro
    ? ''
    : `<button class="menu-item danger" role="menuitem" data-action="delete-team">🗑 ${t('deleteTeam')}</button>`;

export function openAddCoach(): void {
  openSheet(`
    <h3>${t('addCoach')}</h3>
    <form class="form" data-form="add-coach">
      <label>${t('email')}<input name="email" type="email" required autocomplete="off" inputmode="email"></label>
      <p class="hint">${t('addCoachHint')}</p>
      <button class="btn primary block">${t('addCoach')}</button>
      <button type="button" class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>
    </form>`);
  $('#sheet [name="email"]')?.focus();
}

// `added` is the name of the player just added, shown while the sheet waits for the next one.
export function openAddPlayer(added = ''): void {
  openSheet(`
    <h3>${t('newPlayer')}</h3>
    ${added ? `<p class="hint ok" role="status">✓ ${t('playerAdded', { name: esc(added) })}</p>` : ''}
    <form class="form" data-form="add-player">
      <label>${t('shirtNumber')}<input name="number" inputmode="numeric" maxlength="3"></label>
      <label>${t('shirtName')}<input name="name" required autocomplete="off"></label>
      <label>${t('fullName')}<input name="fullName" autocomplete="off"></label>
      <button class="btn primary block">${t('add')}</button>
      <button type="button" class="btn ghost block" data-action="close-sheet">${t('done')}</button>
    </form>`);
  $('#sheet [name="number"]')?.focus();
}

export const teamActions = {
  'upload-team': () => {
    const id = route().id;
    if (id) uploadTeams([id]);
  },
  'people-reload': () => {
    const id = route().id;
    if (id) void loadPeople(id);
  },
  'remove-coach': async ({ id }: DOMStringMap) => {
    const teamId = route().id;
    if (!teamId || !id) return;
    const m = remote.people?.members.find((x) => x.user_id === id);
    const ok = await askConfirm({
      title: t('removeFromTeam'),
      message: t('removeMemberConfirm', { email: `<b>${esc(m?.email || '')}</b>` }),
      ok: t('removeFromTeam'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMember(teamId, id);
      setPeopleMsg(t('removed'), true);
    } catch (e) {
      return setPeopleMsg(accessError(e), false);
    }
    void loadPeople(teamId);
  },
  'leave-team': async () => {
    const teamId = route().id;
    const me = myId();
    if (!teamId || !me) return;
    const ok = await askConfirm({
      title: t('leaveTeam'),
      message: t('leaveTeamConfirm'),
      ok: t('leaveTeam'),
      danger: true,
    });
    if (!ok) return;
    try {
      if (pendingCount()) await syncNow(); // a director's changes go up first
      await deleteMember(teamId, me);
    } catch (e) {
      return notify(accessError(e));
    }
    toast(t('leftTeam'));
    await syncNow(); // the team leaves this phone
    if (route().view === 'team' && route().id === teamId) location.hash = '#/teams';
  },
  'new-team': () => {
    const club = canUpload() ? managedClubs(cloud.account)[0] : undefined;
    const tm: Team = { id: uid(), club: club?.name ?? (db.teams[0]?.club || ''), name: '' };
    db.teams.push(tm);
    save();
    if (club) {
      newCloudTeam = tm.id;
      uploadTeams([tm.id], club.id);
    }
    location.hash = `#/team/${tm.id}`;
  },
  'delete-team': async () => {
    const tm = getTeam(route().id);
    if (!tm) return;
    const id = tm.id;
    if (teamPlayers(id).length) {
      return askConfirm({ title: t('deleteTeam'), message: t('teamHasPlayers'), ok: t('ok'), cancel: false });
    }
    const ok = await askConfirm({
      title: t('confirmDeleteTeam'),
      message: esc(teamLabel(tm)),
      ok: t('deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    db.teams = db.teams.filter((x) => x.id !== id);
    save();
    location.hash = '#/teams';
  },
  'team-section': ({ v = '' }: DOMStringMap) => {
    teamOpen[v] = !teamOpen[v];
    rerender();
  },
  'add-player': () => openAddPlayer(),
  'add-coach': () => openAddCoach(),
  'edit-player': ({ id }: DOMStringMap) => {
    const p = db.players.find((x) => x.id === id);
    if (!p) return;
    openSheet(`
      <h3>${t('editPlayer')}</h3>
      <form class="form" data-form="edit-player" data-id="${p.id}">
        <label>${t('shirtNumber')}<input name="number" inputmode="numeric" maxlength="3" value="${esc(p.number)}"></label>
        <label>${t('shirtName')}<input name="name" required autocomplete="off" value="${esc(p.name)}"></label>
        <label>${t('fullName')}<input name="fullName" autocomplete="off" value="${esc(p.fullName)}"></label>
        <button class="btn primary block">${t('save')}</button>
        <button type="button" class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>
      </form>`);
  },
  'delete-player': async ({ id }: DOMStringMap) => {
    const p = db.players.find((x) => x.id === id);
    if (!p) return;
    const ok = await askConfirm({
      title: t('removePlayerTitle'),
      message: t('confirmRemovePlayer', { name: `<b>${esc(p.name)}</b>` }),
      ok: t('deleteBtn'),
      danger: true,
    });
    if (!ok) return;
    db.players = db.players.filter((x) => x.id !== id);
    save();
    rerender();
  },
};

/** The Teams list and team screen: screens and actions (app/ registers them at startup). */
export const teamPage = {
  views: { teams: viewTeams, players: viewTeams, team: viewTeam },
  actions: teamActions,
};
