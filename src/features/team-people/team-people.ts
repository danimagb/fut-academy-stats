// Staff of a cloud team (team managers and team coaches, chosen by the club's managers) and the
// shared helpers for the online-only screens (people, admin).
import { canSync, cloud, sb } from '@/data/session';
import { plural } from '@/shared/i18n/i18n';
import { route } from '@/shared/lib/route';
import { SyncError, isOffline, roleOf } from '@/data/sync';
import { esc } from '@/shared/lib/html';
import { t } from '@/shared/i18n/i18n';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

/** A role in team_members: `manager` (UI: Diretor) or `coach` (UI: Treinador). */
export type TeamRole = 'manager' | 'coach';
/** A team member, with the email from their account. */
export type Member = { team_id: string; user_id: string; role: TeamRole; email: string };
type Msg = { text: string; ok: boolean };
export type PeopleState = {
  teamId: string;
  status: 'loading' | 'uploading' | 'ok' | 'offline' | 'error';
  members: Member[];
  msg: Msg | null;
};

// ---------- Team access: people of a team, admin page (online only) ----------
// These screens read and change team_members / accounts directly (RLS decides what is allowed)
// and the `admin` Edge Function for creating and removing accounts. Nothing is cached on the
// phone: offline they show "Needs internet".

// The admin page's state is the admin page's own business (pages/admin keeps its shape).
export const remote: { people: PeopleState | null; admin: unknown; club: unknown } = {
  people: null,
  admin: null,
  club: null,
}; // reset when the route changes

/** The signed-in client (these screens only run when canSync(), which needs one). */
const client = (): SupabaseClient => {
  if (!sb) throw OFFLINE;
  return sb;
};

/** What a supabase-js query resolves to. */
type QueryResult<T> = { data: T | null; error: PostgrestError | null; status: number };

// Run a supabase-js query; throw its error (with HTTP status) instead of returning it.
export async function q<T = unknown>(query: PromiseLike<QueryResult<T>>): Promise<T> {
  const { data, error, status } = await query;
  if (error) throw new SyncError(error, status);
  return data as T;
}

export function accessError(e: unknown): string {
  if (isOffline(e)) return t('needsInternet');
  const err = e as { code?: string; message?: string };
  if (err.code === '23514' && /club/i.test(err.message ?? '')) return t('errNotInClub');
  if (err.code === '42501') return t('notAllowed');
  return t('actionFailed', { msg: esc(err.message ?? String(e)) });
}

/** A club role's label: `manager` = Coordenador, `staff` = Staff. */
export const clubRoleLabel = (role: string): string => t(role === 'manager' ? 'clubManager' : 'clubStaff');
/** A team role's label: `manager` (and the old name `director`) = Diretor, `coach` = Treinador. */
export const roleLabel = (role: string): string =>
  t(role === 'manager' || role === 'director' ? 'roleDirector' : 'roleCoach');
export const myId = (): string | undefined => cloud.session?.user?.id;

export const OFFLINE = Object.assign(new Error('offline'), { status: 0 });

// Members of a team with their emails (teammates' accounts are visible through RLS).
export async function fetchMembers(teamIds: string[]): Promise<Member[]> {
  if (!navigator.onLine) throw OFFLINE; // don't wait for the request to time out
  const rows = await q<Omit<Member, 'email'>[]>(
    client().from('team_members').select('team_id, user_id, role').in('team_id', teamIds),
  );
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const accts = ids.length
    ? await q<{ user_id: string; email: string }[]>(
        client().from('accounts').select('user_id, email').in('user_id', ids),
      )
    : [];
  const email = new Map(accts.map((a) => [a.user_id, a.email]));
  return rows
    .map((r) => ({ ...r, email: email.get(r.user_id) || '?' }))
    .sort(
      (a, b) => (a.role === b.role ? 0 : a.role === 'manager' ? -1 : 1) || a.email.localeCompare(b.email),
    );
}

export async function loadPeople(teamId: string): Promise<void> {
  const prev = remote.people;
  const st: PeopleState = {
    teamId,
    status: 'loading',
    members: [],
    msg: prev?.teamId === teamId ? prev.msg : null,
  };
  remote.people = st;
  showPeople();
  try {
    st.members = await fetchMembers([teamId]);
    st.status = 'ok';
  } catch (e) {
    st.status = isOffline(e) ? 'offline' : 'error';
    console.warn('People: load failed', e);
  }
  if (remote.people === st) showPeople();
}

// People section of a cloud team's screen (filled in place, so it never disturbs typing).
export function peopleHtml(teamId: string): string {
  const st = remote.people?.teamId === teamId ? remote.people : null;
  if (!canSync()) return `<p class="hint">${t('peopleSignIn')}</p>`;
  if (!st || st.status === 'loading') return `<p class="hint">${t('loading')}</p>`;
  if (st.status === 'uploading') return `<p class="hint">${t('uploading')}</p>`;
  if (st.status !== 'ok') {
    return `<p class="hint warn">${t('needsInternet')}</p>
      <button class="btn small ghost" data-action="people-reload">${t('tryAgain')}</button>`;
  }
  const me = myId();
  const manages = roleOf(teamId) === 'club_manager';
  const msg = st.msg ? `<p class="hint ${st.msg.ok ? 'ok' : 'warn'}" role="status">${st.msg.text}</p>` : '';
  return `
    <ul class="list people">${st.members
      .map(
        (m) => `
      <li class="item">
        <span class="grow"><span class="email">${esc(m.email)}</span>${m.user_id === me ? ` <span class="muted small">(${t('you')})</span>` : ''}</span>
        ${
          manages
            ? `<select class="mini" data-change="staff-role" data-id="${esc(m.user_id)}" aria-label="${t('teamRole')}">${roleOptions(m.role)}</select>
          <button class="btn small ghost danger" data-action="remove-staff" data-id="${esc(m.user_id)}" aria-label="${t('removeFromTeam')}">✕</button>`
            : `<span class="badge ${m.role === 'manager' ? 'cloud' : ''}">${roleLabel(m.role)}</span>`
        }
      </li>`,
      )
      .join('')}</ul>
    ${msg}
    <button class="btn ghost danger small" data-action="leave-team">${t('leaveTeam')}</button>`;
}

export function showPeople(): void {
  const el = document.getElementById('people');
  if (!el || !remote.people || route().view !== 'team' || route().id !== remote.people.teamId) return;
  el.innerHTML = peopleHtml(remote.people.teamId);
  const sum = document.getElementById('staff-sum');
  if (sum) sum.textContent = staffSummary(remote.people.teamId);
}

// One-line summary in the Staff header: how many people, once they're loaded.
export function staffSummary(teamId: string): string {
  const st = remote.people?.teamId === teamId ? remote.people : null;
  return st?.status === 'ok' ? plural('staffCount', st.members.length) : '';
}

export function setPeopleMsg(text: string, ok: boolean): void {
  if (remote.people) remote.people.msg = { text, ok };
  showPeople();
}

const roleOptions = (selected: string): string =>
  (['coach', 'manager'] as const)
    .map((r) => `<option value="${r}" ${r === selected ? 'selected' : ''}>${roleLabel(r)}</option>`)
    .join('');

// ---------- Adding staff: pick someone of the team's club (club managers) ----------

type ClubPerson = { user_id: string; email: string };
/** The club's people shown in the "add to staff" sheet (null while loading, or on error). */
let pickList: { teamId: string; people: ClubPerson[] | null; error: string } | null = null;

const pickHtml = (teamId: string): string => {
  if (pickList?.teamId !== teamId || (!pickList.people && !pickList.error))
    return `<li class="hint">${t('loading')}</li>`;
  if (!pickList.people) return `<li class="hint warn">${pickList.error}</li>`;
  if (!pickList.people.length) return `<li class="hint">${t('staffNobody')}</li>`;
  const inTeam = new Set(remote.people?.teamId === teamId ? remote.people.members.map((m) => m.user_id) : []);
  return pickList.people
    .map((p) =>
      inTeam.has(p.user_id)
        ? `<li class="item staff-pick-row" data-email="${esc(p.email)}"><span class="grow email">${esc(p.email)}</span><span class="muted small">${t('staffAlready')}</span></li>`
        : `<li class="staff-pick-row" data-email="${esc(p.email)}"><button class="item staff-pick" data-action="add-staff" data-id="${esc(p.user_id)}">
          <span class="grow email">${esc(p.email)}</span><span aria-hidden="true">＋</span></button></li>`,
    )
    .join('');
};

const showPickList = (teamId: string): void => {
  const el = document.getElementById('staff-pick');
  if (el && pickList?.teamId === teamId) el.innerHTML = pickHtml(teamId);
  filterStaff(document.querySelector<HTMLInputElement>('#sheet [data-filter="staff"]')?.value ?? '');
};

/** Loads the people of a club (its managers see them all) for the "add to staff" sheet. */
export async function loadClubPeople(teamId: string, clubId: string): Promise<void> {
  pickList = { teamId, people: null, error: '' };
  try {
    if (!navigator.onLine) throw OFFLINE;
    const rows = await q<{ user_id: string }[]>(
      client().from('club_members').select('user_id').eq('club_id', clubId),
    );
    const ids = rows.map((r) => r.user_id);
    const accts = ids.length
      ? await q<ClubPerson[]>(client().from('accounts').select('user_id, email').in('user_id', ids))
      : [];
    if (pickList.teamId === teamId) pickList.people = accts.sort((a, b) => a.email.localeCompare(b.email));
  } catch (e) {
    if (pickList.teamId === teamId) pickList.error = accessError(e);
  }
  showPickList(teamId);
}

/** Shows only the people whose email contains the text typed in the sheet's search box. */
export function filterStaff(text: string): void {
  const needle = text.trim().toLowerCase();
  let shown = 0;
  for (const li of document.querySelectorAll<HTMLElement>('#staff-pick .staff-pick-row')) {
    const hit = !needle || (li.dataset.email ?? '').toLowerCase().includes(needle);
    li.hidden = !hit;
    if (hit) shown++;
  }
  const none = document.getElementById('staff-none');
  if (none) none.hidden = shown > 0 || !pickList?.people?.length;
}

/** The sheet's search box, role choice and the club's people (filled in when loaded). */
export function addStaffSheetHtml(teamId: string): string {
  return `
    <h3>${t('addStaff')}</h3>
    <input type="search" class="staff-search" data-filter="staff" placeholder="${t('staffSearch')}" aria-label="${t('staffSearch')}" autocomplete="off" inputmode="email">
    <div class="row gap staff-role" role="radiogroup" aria-label="${t('teamRole')}">
      <label><input type="radio" name="staff-role" value="coach" checked> ${t('roleCoach')}</label>
      <label><input type="radio" name="staff-role" value="manager"> ${t('roleDirector')}</label>
    </div>
    <p class="hint">${t('staffRoleHint')}</p>
    <ul class="list staff-picks" id="staff-pick">${pickHtml(teamId)}</ul>
    <p class="hint" id="staff-none" hidden>${t('staffNoMatch')}</p>
    <button type="button" class="btn ghost block" data-action="close-sheet">${t('done')}</button>`;
}

/** Gives someone of the club a role in the team (the role chosen in the sheet). */
export async function addStaff(teamId: string, userId: string): Promise<void> {
  const role =
    document.querySelector<HTMLInputElement>('#sheet [name="staff-role"]:checked')?.value === 'manager'
      ? 'manager'
      : 'coach';
  const email = pickList?.people?.find((p) => p.user_id === userId)?.email ?? '';
  try {
    await q(client().from('team_members').insert({ team_id: teamId, user_id: userId, role }));
    setPeopleMsg(t('staffAdded', { email: `<b>${esc(email)}</b>`, role: roleLabel(role) }), true);
  } catch (err) {
    setPeopleMsg(accessError(err), false);
  }
  await loadPeople(teamId);
  showPickList(teamId);
}

/** Changes someone's role in the team (club managers). */
export async function setStaffRole(teamId: string, userId: string, role: string): Promise<void> {
  try {
    const rows = await q<{ user_id: string }[]>(
      client()
        .from('team_members')
        .update({ role: role === 'manager' ? 'manager' : 'coach' })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select('user_id'),
    );
    if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
    setPeopleMsg(t('roleChanged'), true);
  } catch (err) {
    setPeopleMsg(accessError(err), false);
  }
  void loadPeople(teamId);
}

// Delete a membership; RLS skips rows it doesn't allow silently, so check something was deleted.
export async function deleteMember(teamId: string, userId: string): Promise<void> {
  const rows = await q<{ user_id: string }[]>(
    client().from('team_members').delete().eq('team_id', teamId).eq('user_id', userId).select('user_id'),
  );
  if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
}
