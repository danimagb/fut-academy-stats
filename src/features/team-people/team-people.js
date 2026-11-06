// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
// People of a cloud team (directors and coaches, invites by email) and the shared helpers for
// the online-only screens (people, admin). Moved from app/legacy.js.
import { canSync, cloud, sb } from '@/data/session';
import { plural } from '@/shared/i18n/i18n';
import { route } from '@/shared/lib/route';
import { SyncError, isOffline, roleOf } from '@/data/sync';
import { esc } from '@/shared/lib/html';
import { t } from '@/shared/i18n/i18n';

// ---------- Team access: people of a team, admin page (online only) ----------
// These screens read and change team_members / accounts directly (RLS decides what is allowed)
// and the `admin` Edge Function for creating and removing accounts. Nothing is cached on the
// phone: offline they show "Needs internet".

export const remote = { people: null, admin: null }; // reset when the route changes

// Run a supabase-js query; throw its error (with HTTP status) instead of returning it.
export async function q(query) {
  const { data, error, status } = await query;
  if (error) throw new SyncError(error, status);
  return data;
}

export function accessError(e) {
  if (isOffline(e)) return t('needsInternet');
  if (e.code === '23514' || /at least one director/i.test(e.message)) return t('lastDirector');
  if (e.code === '42501') return t('notAllowed');
  return t('actionFailed', { msg: esc(e.message) });
}

export const roleLabel = (role) => t(role === 'director' ? 'roleDirector' : 'roleCoach');
export const kindLabel = (kind) => t(kind === 'director' ? 'acctDirector' : 'acctCoach');
export const myId = () => cloud.session?.user?.id;

export const OFFLINE = Object.assign(new Error('offline'), { status: 0 });

// Members of a team with their emails (teammates' accounts are visible through RLS).
export async function fetchMembers(teamIds) {
  if (!navigator.onLine) throw OFFLINE; // don't wait for the request to time out
  const rows = await q(sb.from('team_members').select('team_id, user_id, role').in('team_id', teamIds));
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const accts = ids.length ? await q(sb.from('accounts').select('user_id, email').in('user_id', ids)) : [];
  const email = new Map(accts.map((a) => [a.user_id, a.email]));
  return rows
    .map((r) => ({ ...r, email: email.get(r.user_id) || '?' }))
    .sort(
      (a, b) => (a.role === b.role ? 0 : a.role === 'director' ? -1 : 1) || a.email.localeCompare(b.email),
    );
}

export async function loadPeople(teamId) {
  const prev = remote.people;
  const st = { teamId, status: 'loading', members: [], msg: prev?.teamId === teamId ? prev.msg : null };
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
export function peopleHtml(teamId) {
  const st = remote.people?.teamId === teamId ? remote.people : null;
  if (!canSync()) return `<p class="hint">${t('peopleSignIn')}</p>`;
  if (!st || st.status === 'loading') return `<p class="hint">${t('loading')}</p>`;
  if (st.status === 'uploading') return `<p class="hint">${t('uploading')}</p>`;
  if (st.status !== 'ok') {
    return `<p class="hint warn">${t('needsInternet')}</p>
      <button class="btn small ghost" data-action="people-reload">${t('tryAgain')}</button>`;
  }
  const me = myId();
  const director = roleOf(teamId) === 'director';
  const msg = st.msg ? `<p class="hint ${st.msg.ok ? 'ok' : 'warn'}" role="status">${st.msg.text}</p>` : '';
  return `
    <ul class="list people">${st.members
      .map(
        (m) => `
      <li class="item">
        <span class="grow"><span class="email">${esc(m.email)}</span>${m.user_id === me ? ` <span class="muted small">(${t('you')})</span>` : ''}</span>
        <span class="badge ${m.role === 'director' ? 'cloud' : ''}">${roleLabel(m.role)}</span>
        ${
          director && m.role === 'coach' && m.user_id !== me
            ? `<button class="btn small ghost danger" data-action="remove-coach" data-id="${esc(m.user_id)}" aria-label="${t('removeFromTeam')}">✕</button>`
            : ''
        }
      </li>`,
      )
      .join('')}</ul>
    ${msg}
    <button class="btn ghost danger small" data-action="leave-team">${t('leaveTeam')}</button>`;
}

export function showPeople() {
  const el = document.getElementById('people');
  if (!el || !remote.people || route().view !== 'team' || route().id !== remote.people.teamId) return;
  el.innerHTML = peopleHtml(remote.people.teamId);
  const sum = document.getElementById('staff-sum');
  if (sum) sum.textContent = staffSummary(remote.people.teamId);
}

// One-line summary in the Staff header: how many people, once they're loaded.
export function staffSummary(teamId) {
  const st = remote.people?.teamId === teamId ? remote.people : null;
  return st?.status === 'ok' ? plural('staffCount', st.members.length) : '';
}

export function setPeopleMsg(text, ok) {
  if (remote.people) remote.people.msg = { text, ok };
  showPeople();
}

export async function addCoach(teamId, email) {
  try {
    const r = await q(sb.rpc('add_team_coach', { _team_id: teamId, _email: email }));
    const e = `<b>${esc(email)}</b>`;
    if (r === 'added') setPeopleMsg(t('coachAdded', { email: e }), true);
    else if (r === 'already_member') setPeopleMsg(t('coachAlready', { email: e }), true);
    else setPeopleMsg(t('coachNoAccount'), false);
  } catch (e) {
    return setPeopleMsg(accessError(e), false);
  }
  loadPeople(teamId);
}

// Delete a membership; RLS skips rows it doesn't allow silently, so check something was deleted.
export async function deleteMember(teamId, userId) {
  const rows = await q(
    sb.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId).select('user_id'),
  );
  if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
}
