// The Admin page (the admin only, online only): clubs, the people in each club, their roles in
// the club's teams, and accounts. Everything but creating and removing accounts goes straight to
// the database (RLS lets the admin do it); those two go through the `admin` Edge Function.
import { rerender } from '@/shared/lib/rerender';
import { deleteMember } from '@/features/team-people/team-people';
import { OFFLINE, accessError, clubRoleLabel, myId, q, remote } from '@/features/team-people/team-people';
import { cloud, refreshAccount, sb, syncNow } from '@/data/session';
import { plural } from '@/shared/i18n/i18n';
import { route } from '@/shared/lib/route';
import { bar } from '@/shared/ui/bar';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { isOffline } from '@/data/sync';
import { esc } from '@/shared/lib/html';
import { t } from '@/shared/i18n/i18n';
import { rerenderSoon } from '@/shared/lib/rerender';
import { main } from '@/shared/ui/main';
import type { SupabaseClient } from '@supabase/supabase-js';

type ClubRole = 'manager' | 'staff';
type TeamRole = 'manager' | 'coach';
type AdminAccount = { user_id: string; email: string; is_admin: boolean };
type AdminClub = { id: string; name: string; short_name: string };
type AdminClubMember = { club_id: string; user_id: string; role: ClubRole };
type AdminTeam = { id: string; club_id: string; name: string };
type AdminMember = { team_id: string; user_id: string; role: TeamRole };
type AdminState = {
  status: 'loading' | 'ok' | 'offline' | 'error';
  accounts: AdminAccount[];
  clubs: AdminClub[];
  people: AdminClubMember[];
  teams: AdminTeam[];
  members: AdminMember[];
};
/** An error from the admin function or a query, with its code and HTTP status. */
type AdminFailure = Error & { code?: string | undefined; status?: number | undefined };

/** This page's state (kept in `remote`, which the route change resets). */
const adminState = (): AdminState | null => remote.admin as AdminState | null;

/** The Supabase client (this page only shows when there is one). */
const client = (): SupabaseClient => {
  if (!sb) throw OFFLINE;
  return sb;
};

// ---------- Admin page ----------

// Call the `admin` Edge Function. Errors come back as { error: code, message } with a status.
export async function adminCall(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client().functions.invoke('admin', { body });
  if (!error) return data;
  const fail = error as { message: string; name: string; context?: Response };
  const err: AdminFailure = new Error(fail.message);
  err.status = fail.name === 'FunctionsFetchError' ? 0 : fail.context?.status;
  try {
    const j = (await fail.context?.json()) as {
      error?: string;
      code?: string;
      message?: string;
      msg?: string;
    };
    Object.assign(err, { code: j.error || j.code, message: j.message || j.msg || error.message });
  } catch {}
  throw err;
}

export function adminError(err: unknown): string {
  if (isOffline(err)) return t('needsInternet');
  const e = err as AdminFailure;
  if (e.code === 'exists') return t('errExists');
  if (e.code === 'invalid_email') return t('errEmail');
  if (e.code === 'not_admin') return t('errNotAdmin');
  if (e.code === 'self') return t('errSelf');
  if (e.code === 'is_admin') return t('errIsAdmin');
  if (e.code === 'no_club') return t('errNoClub');
  if (e.code === '23505') return t('errClubExists');
  if (e.code === '23514' && /club/i.test(e.message)) return t('errNotInClub');
  if (e.status === 401) return t('errSession', { msg: esc(e.message) });
  return accessError(err);
}

export async function loadAdmin(): Promise<void> {
  const st: AdminState = { status: 'loading', accounts: [], clubs: [], people: [], teams: [], members: [] };
  remote.admin = st;
  try {
    if (!navigator.onLine) throw OFFLINE;
    const [accounts, clubs, people, teams, members] = await Promise.all([
      q<AdminAccount[]>(client().from('accounts').select('user_id, email, is_admin').order('email')),
      q<AdminClub[]>(client().from('clubs').select('id, name, short_name').order('name')),
      q<AdminClubMember[]>(client().from('club_members').select('club_id, user_id, role')),
      q<AdminTeam[]>(client().from('teams').select('id, club_id, name').is('deleted_at', null).order('name')),
      q<AdminMember[]>(client().from('team_members').select('team_id, user_id, role')),
    ]);
    Object.assign(st, { accounts, clubs, people, teams, members, status: 'ok' });
  } catch (e) {
    st.status = isOffline(e) ? 'offline' : 'error';
    console.warn('Admin: load failed', e);
  }
  if (remote.admin === st && route().view === 'admin') rerenderSoon();
}

// An admin change: run it, say how it went, reload the page's data. Changes may be about this
// user's own clubs and teams, so refresh the account and sync too.
export async function adminDo(fn: () => Promise<unknown>, okText?: string, sync = false): Promise<void> {
  try {
    await fn();
    if (okText) toast(okText);
  } catch (e) {
    notify(adminError(e));
  }
  await loadAdmin();
  if (sync) {
    await refreshAccount();
    void syncNow();
  }
}

/** RLS skips the rows of an update or delete it doesn't allow (no error): check one changed. */
function mustChange(rows: unknown[]): void {
  if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
}

export const setClubRole = (clubId: string, userId: string, role: string): Promise<void> =>
  adminDo(
    async () =>
      mustChange(
        await q<unknown[]>(
          client()
            .from('club_members')
            .update({ role })
            .eq('club_id', clubId)
            .eq('user_id', userId)
            .select('user_id'),
        ),
      ),
    t('roleChanged'),
    true,
  );

export const setTeamRole = (teamId: string, userId: string, role: string): Promise<void> =>
  adminDo(
    async () =>
      mustChange(
        await q<unknown[]>(
          client()
            .from('team_members')
            .update({ role })
            .eq('team_id', teamId)
            .eq('user_id', userId)
            .select('user_id'),
        ),
      ),
    t('roleChanged'),
    true,
  );

const options = (pairs: [string, string][], selected = ''): string =>
  pairs
    .map(
      ([v, label]) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(label)}</option>`,
    )
    .join('');
const clubRoles = (): [string, string][] => [
  ['staff', t('clubStaff')],
  ['manager', t('clubManager')],
];
const teamRoles = (): [string, string][] => [
  ['coach', t('roleCoach')],
  ['manager', t('roleDirector')],
];
const removeBtn = (action: string, label: string, data: Record<string, string>): string =>
  `<button class="btn small ghost danger" data-action="${action}" ${Object.entries(data)
    .map(([k, v]) => `data-${k}="${esc(v)}"`)
    .join(' ')} aria-label="${esc(label)}">✕</button>`;

function clubCard(st: AdminState, club: AdminClub, email: Map<string, string>): string {
  const people = st.people
    .filter((p) => p.club_id === club.id)
    .map((p) => ({ ...p, email: email.get(p.user_id) || '?' }))
    .sort(
      (a, b) => (a.role === b.role ? 0 : a.role === 'manager' ? -1 : 1) || a.email.localeCompare(b.email),
    );
  const others = st.accounts.filter((a) => !people.some((p) => p.user_id === a.user_id));
  const teams = st.teams.filter((tm) => tm.club_id === club.id);
  const peopleList = people.length
    ? `<ul class="members">${people
        .map(
          (p) => `<li class="row gap"><span class="grow email">${esc(p.email)}</span>
        <select class="mini" data-change="admin-club-role" data-cid="${esc(club.id)}" data-id="${esc(p.user_id)}" aria-label="${t('clubRole')}">${options(clubRoles(), p.role)}</select>
        ${removeBtn('admin-remove-person', t('removeFromClub'), { cid: club.id, id: p.user_id })}</li>`,
        )
        .join('')}</ul>`
    : `<p class="muted small">${t('noClubPeople')}</p>`;
  const addPerson = others.length
    ? `<form class="row gap add-member" data-form="admin-add-person" data-cid="${esc(club.id)}">
        <select class="grow" name="user" required aria-label="${t('pickAccount')}"><option value="">${t('pickAccount')}</option>
          ${options(others.map((a) => [a.user_id, a.email]))}</select>
        <select class="mini" name="role" aria-label="${t('clubRole')}">${options(clubRoles())}</select>
        <button class="btn small">${t('addMember')}</button>
      </form>`
    : '';
  const teamList = teams.length
    ? `<ul class="list admin-club-teams">${teams.map((tm) => teamCard(st, tm, people)).join('')}</ul>`
    : `<p class="muted small">${t('noClubTeams')}</p>`;
  return `<li class="card admin-club">
    <details>
      <summary class="row gap"><strong class="grow">${esc(club.name)}${club.short_name ? ` <span class="muted small">(${esc(club.short_name)})</span>` : ''}</strong>
        <span class="muted small">${plural('peopleN', people.length)} · ${plural('teamsN', teams.length)}</span></summary>
      <form class="form club-names" data-form="admin-club-names" data-cid="${esc(club.id)}">
        <div class="row gap">
          <label class="grow">${t('clubName')}<input name="name" required maxlength="200" value="${esc(club.name)}" autocomplete="off"></label>
          <label class="short">${t('clubShortName')}<input name="short" maxlength="20" value="${esc(club.short_name)}" autocomplete="off"></label>
        </div>
        <div class="row gap"><button class="btn small">${t('save')}</button>
          ${teams.length ? '' : `<button type="button" class="btn small ghost danger" data-action="admin-delete-club" data-cid="${esc(club.id)}">${t('deleteClub')}</button>`}</div>
      </form>
    </details>
    <h3>${t('clubPeople')}</h3>
    ${peopleList}${addPerson}
    <h3>${t('clubTeams')}</h3>
    ${teamList}
  </li>`;
}

function teamCard(st: AdminState, tm: AdminTeam, people: { user_id: string; email: string }[]): string {
  const email = new Map(people.map((p) => [p.user_id, p.email]));
  const ms = st.members
    .filter((m) => m.team_id === tm.id)
    .map((m) => ({ ...m, email: email.get(m.user_id) || '?' }))
    .sort(
      (a, b) => (a.role === b.role ? 0 : a.role === 'manager' ? -1 : 1) || a.email.localeCompare(b.email),
    );
  const others = people.filter((p) => !ms.some((m) => m.user_id === p.user_id));
  return `<li class="admin-team">
    <strong>${esc(tm.name)}</strong>
    ${
      ms.length
        ? `<ul class="members">${ms
            .map(
              (m) => `<li class="row gap"><span class="grow email">${esc(m.email)}</span>
          <select class="mini" data-change="admin-role" data-tid="${esc(m.team_id)}" data-id="${esc(m.user_id)}" aria-label="${t('teamRole')}">${options(teamRoles(), m.role)}</select>
          ${removeBtn('admin-remove-member', t('removeFromTeam'), { tid: m.team_id, id: m.user_id })}</li>`,
            )
            .join('')}</ul>`
        : `<p class="muted small">${t('noMembers')}</p>`
    }
    ${
      others.length
        ? `<form class="row gap add-member" data-form="admin-add-member" data-tid="${esc(tm.id)}">
        <select class="grow" name="user" required aria-label="${t('pickPerson')}"><option value="">${t('pickPerson')}</option>
          ${options(others.map((p) => [p.user_id, p.email]))}</select>
        <select class="mini" name="role" aria-label="${t('teamRole')}">${options(teamRoles())}</select>
        <button class="btn small">${t('addMember')}</button>
      </form>`
        : ''
    }
  </li>`;
}

export function viewAdmin(): void {
  const head = bar(t('admin'), '#/profile');
  const account = cloud.account;
  if (!sb || !account || 'none' in account || !account.isAdmin) {
    main.innerHTML = `${head}<p class="empty">${t('adminOnly')}</p>`;
    return;
  }
  const st = adminState();
  const me = myId();
  let body: string;
  if (!st || st.status === 'loading') body = `<p class="hint">${t('loading')}</p>`;
  else if (st.status !== 'ok')
    body = `<p class="hint warn">${t('needsInternet')}</p><button class="btn small ghost" data-action="admin-reload">${t('tryAgain')}</button>`;
  else {
    const email = new Map(st.accounts.map((a) => [a.user_id, a.email]));
    const clubName = new Map(st.clubs.map((c) => [c.id, c.name]));
    const give = st.clubs.length
      ? `<form class="form" data-form="admin-create">
          <label>${t('email')}<input name="email" type="email" required autocomplete="off" inputmode="email"></label>
          <div class="row gap">
            <label class="grow">${t('club')}<select name="club" required>${options(st.clubs.map((c) => [c.id, c.name]))}</select></label>
            <label>${t('clubRole')}<select name="role">${options(clubRoles())}</select></label>
          </div>
          <button class="btn primary">${t('giveAccess')}</button>
        </form>
        <p class="hint">${t('giveAccessHint')}</p>`
      : `<p class="hint">${t('createClubFirst')}</p>`;
    const clubs = `
      <h2>${t('clubs')} <span class="muted small">${st.clubs.length}</span></h2>
      ${st.clubs.length ? `<ul class="list admin-clubs">${st.clubs.map((c) => clubCard(st, c, email)).join('')}</ul>` : ''}
      <form class="row gap add-club" data-form="admin-create-club">
        <label class="grow">${t('newClub')}<input name="name" required maxlength="200" autocomplete="off" placeholder="${t('clubNamePh')}"></label>
        <label class="short">${t('clubShortName')}<input name="short" maxlength="20" autocomplete="off" placeholder="PFC"></label>
        <button class="btn">${t('createClub')}</button>
      </form>`;
    const clubsOf = (uid: string): string =>
      st.people
        .filter((p) => p.user_id === uid)
        .map((p) => `${esc(clubName.get(p.club_id) || '?')} · ${clubRoleLabel(p.role)}`)
        .join(', ') || t('noClub');
    const accounts = `
      <h2>${t('accounts')} <span class="muted small">${st.accounts.length}</span></h2>
      <ul class="list admin-accounts">${st.accounts
        .map(
          (a) => `
        <li class="item wrap">
          <span class="grow"><span class="email">${esc(a.email)}</span>${a.user_id === me ? ` <span class="muted small">(${t('you')})</span>` : ''}
            <div class="muted small">${a.is_admin ? `${t('acctAdmin')} · ` : ''}${clubsOf(a.user_id)}</div></span>
          ${a.user_id === me || a.is_admin ? '' : removeBtn('admin-remove-account', t('removeAccess'), { id: a.user_id })}
        </li>`,
        )
        .join('')}</ul>`;
    body = `<h2>${t('giveAccess')}</h2>${give}${clubs}${accounts}`;
  }
  main.innerHTML = `${head}${body}`;
  if (!st) void loadAdmin();
}

/** The Admin page: its screen, actions and forms (app/ registers them at startup). */
export const adminPage = {
  views: { admin: viewAdmin },
  actions: {
    'admin-reload': () => {
      remote.admin = null;
      rerender();
    },
    'admin-remove-account': async ({ id }: DOMStringMap) => {
      const a = adminState()?.accounts.find((x) => x.user_id === id);
      const ok = await askConfirm({
        title: t('removeAccess'),
        message: t('removeAccessConfirm', { email: `<b>${esc(a?.email || '')}</b>` }),
        ok: t('removeAccess'),
        danger: true,
      });
      if (ok) await adminDo(() => adminCall({ action: 'delete_account', user_id: id }), t('accessRemoved'));
    },
    'admin-remove-person': async ({ cid = '', id = '' }: DOMStringMap) => {
      const st = adminState();
      const a = st?.accounts.find((x) => x.user_id === id);
      const club = st?.clubs.find((c) => c.id === cid);
      const ok = await askConfirm({
        title: t('removeFromClub'),
        message: t('removeFromClubConfirm', {
          email: `<b>${esc(a?.email || '')}</b>`,
          club: `<b>${esc(club?.name || '')}</b>`,
        }),
        ok: t('removeFromClub'),
        danger: true,
      });
      if (ok)
        await adminDo(
          async () =>
            mustChange(
              await q<unknown[]>(
                client().from('club_members').delete().eq('club_id', cid).eq('user_id', id).select('user_id'),
              ),
            ),
          t('removed'),
          true,
        );
    },
    'admin-remove-member': async ({ tid = '', id = '' }: DOMStringMap) => {
      const a = adminState()?.accounts.find((x) => x.user_id === id);
      const ok = await askConfirm({
        title: t('removeFromTeam'),
        message: t('removeMemberConfirm', { email: `<b>${esc(a?.email || '')}</b>` }),
        ok: t('removeFromTeam'),
        danger: true,
      });
      if (ok) await adminDo(() => deleteMember(tid, id), t('removed'), true);
    },
    'admin-delete-club': async ({ cid = '' }: DOMStringMap) => {
      const club = adminState()?.clubs.find((c) => c.id === cid);
      const ok = await askConfirm({
        title: t('deleteClub'),
        message: t('deleteClubConfirm', { club: `<b>${esc(club?.name || '')}</b>` }),
        ok: t('deleteClub'),
        danger: true,
      });
      if (ok)
        await adminDo(
          async () =>
            mustChange(await q<unknown[]>(client().from('clubs').delete().eq('id', cid).select('id'))),
          t('removed'),
          true,
        );
    },
  },
  forms: {
    'admin-create': (data: FormData, formEl: HTMLFormElement) => {
      const email = String(data.get('email')).trim().toLowerCase();
      const btn = formEl.querySelector('button');
      if (btn) btn.disabled = true;
      return adminDo(
        async () => {
          const r = (await adminCall({
            action: 'create_account',
            email,
            club_id: String(data.get('club')),
            role: String(data.get('role')),
          })) as { existed?: boolean } | null;
          const e = `<b>${esc(email)}</b>`;
          if (r?.existed) toast(t('addedToClub'));
          else notify(t('accessGiven', { email: e }), t('accessGivenTitle'));
        },
        undefined,
        true,
      ).finally(() => {
        if (btn) btn.disabled = false;
      });
    },
    'admin-create-club': (data: FormData) =>
      adminDo(
        () =>
          q(
            client()
              .from('clubs')
              .insert({
                name: String(data.get('name')).trim(),
                short_name: String(data.get('short')).trim(),
              }),
          ),
        t('clubCreated'),
      ),
    'admin-club-names': (data: FormData, formEl: HTMLFormElement) =>
      adminDo(
        async () =>
          mustChange(
            await q<unknown[]>(
              client()
                .from('clubs')
                .update({
                  name: String(data.get('name')).trim(),
                  short_name: String(data.get('short')).trim(),
                })
                .eq('id', formEl.dataset.cid ?? '')
                .select('id'),
            ),
          ),
        t('clubSaved'),
        true,
      ),
    'admin-add-person': (data: FormData, formEl: HTMLFormElement) =>
      adminDo(
        () =>
          q(
            client()
              .from('club_members')
              .insert({
                club_id: formEl.dataset.cid,
                user_id: String(data.get('user')),
                role: String(data.get('role')),
              }),
          ),
        t('memberAdded'),
        true,
      ),
    'admin-add-member': (data: FormData, formEl: HTMLFormElement) =>
      adminDo(
        () =>
          q(
            client()
              .from('team_members')
              .insert({
                team_id: formEl.dataset.tid,
                user_id: String(data.get('user')),
                role: String(data.get('role')),
              }),
          ),
        t('memberAdded'),
        true,
      ),
  },
};
